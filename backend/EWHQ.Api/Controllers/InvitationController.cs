using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EWHQ.Api.Services;
using EWHQ.Api.Models.AdminPortal;
using Microsoft.EntityFrameworkCore;
using EWHQ.Api.Data;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/invitations")]
[Route("api/invitation")]
public class InvitationController : ControllerBase
{
    private readonly ITeamService _teamService;
    private readonly IAccessAuditService _accessAuditService;
    private readonly AdminDbContext _context;
    private readonly ILogger<InvitationController> _logger;
    private readonly IEmailService _emailService;

    public InvitationController(
        ITeamService teamService,
        IAccessAuditService accessAuditService,
        AdminDbContext context,
        ILogger<InvitationController> logger,
        IEmailService emailService)
    {
        _teamService = teamService;
        _accessAuditService = accessAuditService;
        _context = context;
        _logger = logger;
        _emailService = emailService;
    }

    /// <summary>
    /// Validates an invitation token (for displaying invitation details before auth)
    /// </summary>
    [HttpGet("validate/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateInvitation(string token)
    {
        var invitation = await _context.TeamInvitations
            .Include(i => i.Team)
            .FirstOrDefaultAsync(i => i.InvitationToken == token);

        if (invitation == null)
        {
            return NotFound(new { message = "Invitation not found" });
        }

        if (invitation.IsAccepted)
        {
            return BadRequest(new { message = "Invitation has already been accepted" });
        }

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invitation has expired" });
        }

        return Ok(new
        {
            email = invitation.Email,
            organizationName = invitation.Team.Name,
            teamName = invitation.Team.Name,
            teamId = invitation.TeamId,
            role = invitation.Role,
            invitedByUserId = invitation.InvitedByUserId,
            expiresAt = invitation.ExpiresAt
        });
    }

    /// <summary>
    /// Accept an invitation after Auth0 authentication
    /// This endpoint is called after the user has authenticated with Auth0
    /// </summary>
    [HttpPost("accept")]
    [Authorize]
    public async Task<IActionResult> AcceptInvitation([FromBody] AcceptInvitationRequest request)
    {
        // Get the authenticated user's information from Auth0 token
        // Try both ClaimTypes.NameIdentifier and "sub" as Auth0 uses "sub" for the user ID
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        // Try both ClaimTypes.Email and various email claim types that Auth0 might use
        var auth0Email = User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value
            ?? User.FindFirst("https://ewhq.com/email")?.Value;

        if (string.IsNullOrEmpty(auth0UserId) || string.IsNullOrEmpty(auth0Email))
        {
            // Log the actual claims for debugging
            _logger.LogWarning("Failed to extract user information from token. Claims present:");
            foreach (var claim in User.Claims)
            {
                _logger.LogWarning($"  {claim.Type}: {claim.Value}");
            }
            return Unauthorized(new { message = "Unable to retrieve user information from authentication token" });
        }

        var invitationToken = request.GetToken();
        if (string.IsNullOrWhiteSpace(invitationToken))
        {
            return BadRequest(new { message = "Invitation token is required" });
        }

        // Find the invitation
        var invitation = await _context.TeamInvitations
            .Include(i => i.Team)
            .FirstOrDefaultAsync(i => i.InvitationToken == invitationToken);

        if (invitation == null)
        {
            return NotFound(new { message = "Invitation not found" });
        }

        if (invitation.IsAccepted)
        {
            return BadRequest(new { message = "Invitation has already been accepted" });
        }

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invitation has expired" });
        }

        // Check if the Auth0 email matches the invited email
        var emailMatches = string.Equals(auth0Email, invitation.Email, StringComparison.OrdinalIgnoreCase);

        if (!emailMatches && !invitation.RequiresEmailVerification)
        {
            // Email mismatch - require verification
            invitation.RequiresEmailVerification = true;
            invitation.VerificationCode = GenerateVerificationCode();
            invitation.VerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(30);
            invitation.VerificationAttempts = 0;

            await _context.SaveChangesAsync();

            await TryAuditAsync(invitation.TeamId, "InvitationAcceptRequiresEmailVerification", auth0UserId, null, invitation.Email, new
            {
                invitationId = invitation.Id
            });

            // Send verification email to the invited email address
            await _emailService.SendEmailVerificationAsync(
                invitation.Email,
                invitation.VerificationCode,
                invitation.Team.Name);

            return Ok(new
            {
                requiresEmailVerification = true,
                message = $"A verification code has been sent to {invitation.Email}. Please enter it to complete the invitation acceptance.",
                invitationId = invitation.Id
            });
        }

        // If email matches or verification was already completed, accept the invitation
        if (emailMatches || invitation.RequiresEmailVerification == false)
        {
            // Add user to the team
            var success = await _teamService.AddTeamMemberAsync(
                invitation.TeamId,
                auth0UserId,
                invitation.Role,
                invitation.InvitedByUserId);

            if (!success)
            {
                return StatusCode(500, new { message = "Failed to add user to team" });
            }

            // Mark invitation as accepted
            invitation.IsAccepted = true;
            invitation.AcceptedAt = DateTime.UtcNow;
            invitation.AcceptedByUserId = auth0UserId;

            await _context.SaveChangesAsync();

            await TryAuditAsync(invitation.TeamId, "InvitationAccepted", auth0UserId, auth0UserId, auth0Email, new
            {
                invitationId = invitation.Id
            });

            return Ok(new
            {
                success = true,
                message = "Invitation accepted successfully",
                teamId = invitation.TeamId,
                teamName = invitation.Team.Name
            });
        }

        return BadRequest(new { message = "Unable to process invitation" });
    }

    /// <summary>
    /// Verify email ownership when Auth0 email doesn't match invited email
    /// </summary>
    [HttpPost("verify-email")]
    [Authorize]
    public async Task<IActionResult> VerifyEmailOwnership([FromBody] VerifyEmailRequest request)
    {
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(auth0UserId))
        {
            return Unauthorized();
        }

        var invitation = await _context.TeamInvitations
            .Include(i => i.Team)
            .FirstOrDefaultAsync(i => i.Id == request.InvitationId);

        if (invitation == null)
        {
            return NotFound(new { message = "Invitation not found" });
        }

        if (invitation.IsAccepted)
        {
            return BadRequest(new { message = "Invitation has already been accepted" });
        }

        if (!invitation.RequiresEmailVerification)
        {
            return BadRequest(new { message = "Email verification is not required for this invitation" });
        }

        if (invitation.VerificationCodeExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Verification code has expired. Please request a new one." });
        }

        if (invitation.VerificationAttempts >= 5)
        {
            return BadRequest(new { message = "Too many verification attempts. Please contact support." });
        }

        invitation.VerificationAttempts++;

        if (invitation.VerificationCode != request.VerificationCode)
        {
            await _context.SaveChangesAsync();
            return BadRequest(new { message = "Invalid verification code", attemptsRemaining = 5 - invitation.VerificationAttempts });
        }

        // Verification successful - add user to team
        var success = await _teamService.AddTeamMemberAsync(
            invitation.TeamId,
            auth0UserId,
            invitation.Role,
            invitation.InvitedByUserId);

        if (!success)
        {
            return StatusCode(500, new { message = "Failed to add user to team" });
        }

        // Mark invitation as accepted
        invitation.IsAccepted = true;
        invitation.AcceptedAt = DateTime.UtcNow;
        invitation.AcceptedByUserId = auth0UserId;
        invitation.RequiresEmailVerification = false;

        // Store verified email for future reference (optional)
        await StoreVerifiedEmail(auth0UserId, invitation.Email);

        await _context.SaveChangesAsync();

        await TryAuditAsync(invitation.TeamId, "InvitationAcceptedAfterVerification", auth0UserId, auth0UserId, invitation.Email, new
        {
            invitationId = invitation.Id
        });

        return Ok(new
        {
            success = true,
            message = "Email verified and invitation accepted successfully",
            teamId = invitation.TeamId,
            teamName = invitation.Team.Name
        });
    }

    /// <summary>
    /// Resend verification code if expired
    /// </summary>
    [HttpPost("resend-verification")]
    [Authorize]
    public async Task<IActionResult> ResendVerificationCode([FromBody] ResendVerificationRequest request)
    {
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        var invitation = await _context.TeamInvitations
            .Include(i => i.Team)
            .FirstOrDefaultAsync(i => i.Id == request.InvitationId);

        if (invitation == null)
        {
            return NotFound(new { message = "Invitation not found" });
        }

        if (!invitation.RequiresEmailVerification)
        {
            return BadRequest(new { message = "Email verification is not required for this invitation" });
        }

        if (invitation.IsAccepted)
        {
            return BadRequest(new { message = "Invitation has already been accepted" });
        }

        // Generate new verification code
        invitation.VerificationCode = GenerateVerificationCode();
        invitation.VerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(30);
        invitation.VerificationAttempts = 0;

        await _context.SaveChangesAsync();

        await TryAuditAsync(invitation.TeamId, "InvitationVerificationResent", auth0UserId, null, invitation.Email, new
        {
            invitationId = invitation.Id
        });

        // Send new verification email
        await _emailService.SendEmailVerificationAsync(
            invitation.Email,
            invitation.VerificationCode,
            invitation.Team.Name);

        return Ok(new
        {
            message = $"New verification code sent to {invitation.Email}",
            expiresAt = invitation.VerificationCodeExpiresAt
        });
    }

    private string GenerateVerificationCode()
    {
        // Generate a 6-digit verification code
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[4];
        rng.GetBytes(bytes);
        var code = Math.Abs(BitConverter.ToInt32(bytes, 0)) % 1000000;
        return code.ToString("D6");
    }

    private async Task StoreVerifiedEmail(string userId, string email)
    {
        // Optional: Store verified emails in a separate table for audit/reference
        // This could be useful for allowing users to claim future invitations to this email
        // automatically without re-verification
        _logger.LogInformation($"User {userId} verified ownership of email {email}");
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
            _logger.LogError(ex, "Failed to record access audit entry for invitation action {ActionType} on team {TeamId}", actionType, teamId);
        }
    }
}

public class AcceptInvitationRequest
{
    public string Token { get; set; } = string.Empty;
    public string InviteCode { get; set; } = string.Empty;

    public string GetToken()
    {
        if (!string.IsNullOrWhiteSpace(Token))
        {
            return Token.Trim();
        }

        if (!string.IsNullOrWhiteSpace(InviteCode))
        {
            return InviteCode.Trim();
        }

        return string.Empty;
    }
}

public class VerifyEmailRequest
{
    public string InvitationId { get; set; } = string.Empty;
    public string VerificationCode { get; set; } = string.Empty;
}

public class ResendVerificationRequest
{
    public string InvitationId { get; set; } = string.Empty;
}
