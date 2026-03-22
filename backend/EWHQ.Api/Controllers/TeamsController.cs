using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using EWHQ.Api.Models.AdminPortal;
using EWHQ.Api.Models.DTOs;
using EWHQ.Api.Services;
using EWHQ.Api.Identity;
using System.Security.Claims;
using System.Text.Json;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeamsController : ControllerBase
{
    private readonly ITeamService _teamService;
    private readonly IAccessAuditService _accessAuditService;
    private readonly UserProfileDbContext _identityContext;
    private readonly ILogger<TeamsController> _logger;

    public TeamsController(
        ITeamService teamService,
        IAccessAuditService accessAuditService,
        UserProfileDbContext identityContext,
        ILogger<TeamsController> logger)
    {
        _teamService = teamService;
        _accessAuditService = accessAuditService;
        _identityContext = identityContext;
        _logger = logger;
    }

    private async Task<string> GetCurrentUserIdAsync()
    {
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (string.IsNullOrEmpty(auth0UserId))
            return string.Empty;

        var user = await _identityContext.Users.FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId);
        return user?.Id ?? string.Empty;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Team>>> GetTeams()
    {
        var userId = await GetCurrentUserIdAsync();

        // If SuperAdmin, return all teams
        if (User.IsInRole("SuperAdmin"))
        {
            var teams = await _teamService.GetAllTeamsAsync();
            return Ok(teams);
        }

        // Otherwise, return only user's teams
        var userTeams = await _teamService.GetUserTeamsAsync(userId);
        return Ok(userTeams);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Team>> GetTeam(string id)
    {
        var userId = await GetCurrentUserIdAsync();

        // Check if user has access to this team
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserInTeamAsync(id, userId))
        {
            return Forbid();
        }

        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null)
            return NotFound();

        return Ok(team);
    }

    [HttpPost]
    public async Task<ActionResult<Team>> CreateTeam(CreateTeamRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = await GetCurrentUserIdAsync();
        var team = new Team
        {
            Name = request.Name,
            Description = request.Description,
            IsActive = true
        };

        var createdTeam = await _teamService.CreateTeamAsync(team, userId);
        return CreatedAtAction(nameof(GetTeam), new { id = createdTeam.Id }, createdTeam);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTeam(string id, UpdateTeamRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = await GetCurrentUserIdAsync();

        // Check if user is team leader
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserTeamLeaderAsync(id, userId))
        {
            return Forbid();
        }

        var team = new Team
        {
            Name = request.Name,
            Description = request.Description,
            IsActive = request.IsActive
        };

        var updatedTeam = await _teamService.UpdateTeamAsync(id, team);
        if (updatedTeam == null)
            return NotFound();

        return Ok(updatedTeam);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTeam(string id)
    {
        var userId = await GetCurrentUserIdAsync();

        // Only SuperAdmin or Team Leader can delete team
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserTeamLeaderAsync(id, userId))
        {
            return Forbid();
        }

        var success = await _teamService.DeleteTeamAsync(id);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpGet("{id}/members")]
    public async Task<ActionResult<IEnumerable<TeamMemberDto>>> GetTeamMembers(string id)
    {
        var userId = await GetCurrentUserIdAsync();

        // Check if user has access to this team
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserInTeamAsync(id, userId))
        {
            return Forbid();
        }

        var members = await _teamService.GetTeamMembersAsync(id);
        return Ok(members);
    }

    [HttpGet("{id}/pending-invitations")]
    public async Task<ActionResult<IEnumerable<TeamInvitation>>> GetPendingInvitations(string id)
    {
        var userId = await GetCurrentUserIdAsync();

        // Check if user has access to this team
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserInTeamAsync(id, userId))
        {
            return Forbid();
        }

        var pendingInvitations = await _teamService.GetPendingInvitationsAsync(id);
        return Ok(pendingInvitations);
    }

    [HttpGet("{id}/access-audit")]
    public async Task<ActionResult<IEnumerable<AccessAuditLog>>> GetAccessAuditLogs(string id, [FromQuery] int limit = 50)
    {
        var userId = await GetCurrentUserIdAsync();

        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserInTeamAsync(id, userId))
        {
            return Forbid();
        }

        var logs = await _accessAuditService.GetTeamLogsAsync(id, limit);
        return Ok(logs);
    }

    [HttpPost("{id}/invite")]
    public async Task<IActionResult> InviteTeamMember(string id, InviteTeamMemberRequest request)
    {
        if (!ModelState.IsValid)
        {
            _logger.LogWarning($"Invalid model state for team invite: {string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage))}");
            return BadRequest(ModelState);
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required" });
        }

        var currentUserId = await GetCurrentUserIdAsync();
        if (string.IsNullOrWhiteSpace(currentUserId))
        {
            _logger.LogWarning("Current user ID is null or empty");
            return Unauthorized(new { message = "User authentication failed" });
        }
        
        // Check if user is team leader
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserTeamLeaderAsync(id, currentUserId))
        {
            return StatusCode(403, new { message = "Only team leaders or super admins can invite members" });
        }

        try
        {
            var invitation = await _teamService.InviteTeamMemberByEmailAsync(id, request.Email, request.Role, currentUserId);
            if (invitation == null)
                return BadRequest(new { message = "Failed to create invitation. User may already be a member of this team or a pending invitation exists." });

            await TryAuditAsync(id, "InvitationSent", currentUserId, null, invitation.Email, new
            {
                invitationId = invitation.Id,
                role = invitation.Role,
                invitation.ExpiresAt
            });

            return Ok(new 
            { 
                message = "Invitation sent successfully",
                invitationId = invitation.Id,
                email = invitation.Email,
                expiresAt = invitation.ExpiresAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error inviting member {request.Email} to team {id}");
            return StatusCode(500, new { message = "An error occurred while inviting the member", error = ex.Message });
        }
    }

    [HttpPost("{id}/pending-invitations/{invitationId}/resend")]
    public async Task<IActionResult> ResendInvitation(string id, string invitationId)
    {
        var currentUserId = await GetCurrentUserIdAsync();
        if (string.IsNullOrWhiteSpace(currentUserId))
        {
            return Unauthorized(new { message = "User authentication failed" });
        }
        
        // Check if user is team leader
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserTeamLeaderAsync(id, currentUserId))
        {
            return StatusCode(403, new { message = "Only team leaders or super admins can resend invitations" });
        }

        try
        {
            var success = await _teamService.ResendInvitationAsync(invitationId);
            if (!success)
                return NotFound(new { message = "Invitation not found or already accepted" });

            await TryAuditAsync(id, "InvitationResent", currentUserId, null, null, new
            {
                invitationId
            });

            return Ok(new { message = "Invitation resent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error resending invitation {invitationId} for team {id}");
            return StatusCode(500, new { message = "An error occurred while resending the invitation", error = ex.Message });
        }
    }

    [HttpDelete("{id}/pending-invitations/{invitationId}")]
    public async Task<IActionResult> CancelInvitation(string id, string invitationId)
    {
        var currentUserId = await GetCurrentUserIdAsync();
        if (string.IsNullOrWhiteSpace(currentUserId))
        {
            return Unauthorized(new { message = "User authentication failed" });
        }
        
        // Check if user is team leader
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserTeamLeaderAsync(id, currentUserId))
        {
            return StatusCode(403, new { message = "Only team leaders or super admins can cancel invitations" });
        }

        try
        {
            var success = await _teamService.CancelInvitationAsync(invitationId);
            if (!success)
                return NotFound(new { message = "Invitation not found or already accepted" });

            await TryAuditAsync(id, "InvitationCancelled", currentUserId, null, null, new
            {
                invitationId
            });

            return Ok(new { message = "Invitation cancelled successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error cancelling invitation {invitationId} for team {id}");
            return StatusCode(500, new { message = "An error occurred while cancelling the invitation", error = ex.Message });
        }
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddTeamMember(string id, AddTeamMemberRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = await GetCurrentUserIdAsync();

        // Check if user is team leader
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserTeamLeaderAsync(id, userId))
        {
            return Forbid();
        }

        var success = await _teamService.AddTeamMemberAsync(id, request.UserId, request.Role, userId);
        if (!success)
            return BadRequest(new { message = "User is already a member of this team" });

        return Ok();
    }

    [HttpPut("{id}/members/{userId}/role")]
    public async Task<IActionResult> UpdateMemberRole(string id, string userId, UpdateMemberRoleRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var currentUserId = await GetCurrentUserIdAsync();

        // Check if user is team leader
        if (!User.IsInRole("SuperAdmin") && !await _teamService.IsUserTeamLeaderAsync(id, currentUserId))
        {
            return Forbid();
        }

        var success = await _teamService.UpdateTeamMemberRoleAsync(id, userId, request.Role);
        if (!success)
            return NotFound();

        await TryAuditAsync(id, "MemberRoleUpdated", currentUserId, userId, null, new
        {
            role = request.Role
        });

        return Ok();
    }

    [HttpDelete("{id}/members/{userId}")]
    public async Task<IActionResult> RemoveTeamMember(string id, string userId)
    {
        var currentUserId = await GetCurrentUserIdAsync();

        // Check if user is team leader or removing themselves
        if (!User.IsInRole("SuperAdmin") &&
            !await _teamService.IsUserTeamLeaderAsync(id, currentUserId) &&
            currentUserId != userId)
        {
            return Forbid();
        }

        var success = await _teamService.RemoveTeamMemberAsync(id, userId);
        if (!success)
            return NotFound();

        await TryAuditAsync(id, "MemberRemoved", currentUserId, userId, null, null);

        return NoContent();
    }

    private async Task TryAuditAsync(
        string teamId,
        string actionType,
        string? actorUserId,
        string? targetUserId,
        string? targetEmail,
        object? details)
    {
        try
        {
            await _accessAuditService.LogAsync(new AccessAuditLog
            {
                TeamId = teamId,
                ActionType = actionType,
                ActorUserId = actorUserId,
                TargetUserId = targetUserId,
                TargetEmail = targetEmail,
                Details = details == null ? null : JsonSerializer.Serialize(details)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record access audit entry for action {ActionType} on team {TeamId}", actionType, teamId);
        }
    }
}

// Request DTOs
public class CreateTeamRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateTeamRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}

public class InviteTeamMemberRequest
{
    public string Email { get; set; } = string.Empty;
    public TeamRole Role { get; set; } = TeamRole.Member;
}

public class AddTeamMemberRequest
{
    public string UserId { get; set; } = string.Empty;
    public TeamRole Role { get; set; } = TeamRole.Member;
}

public class UpdateMemberRoleRequest
{
    public TeamRole Role { get; set; }
}
