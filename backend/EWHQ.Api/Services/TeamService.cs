using Microsoft.EntityFrameworkCore;
using EWHQ.Api.Data;
using EWHQ.Api.Models.AdminPortal;
using EWHQ.Api.Models.DTOs;
using EWHQ.Api.Identity;

namespace EWHQ.Api.Services;

public class TeamService : ITeamService
{
    private readonly AdminDbContext _context;
    private readonly UserProfileDbContext _identityContext;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TeamService> _logger;

    public TeamService(
        AdminDbContext context,
        UserProfileDbContext identityContext,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<TeamService> logger)
    {
        _context = context;
        _identityContext = identityContext;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    // Team operations
    public async Task<IEnumerable<Team>> GetAllTeamsAsync()
    {
        return await _context.Teams
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .ToListAsync();
    }

    public async Task<IEnumerable<Team>> GetUserTeamsAsync(string userId)
    {
        return await _context.TeamMembers
            .Where(tm => tm.UserId == userId && tm.IsActive)
            .Include(tm => tm.Team)
            .Select(tm => tm.Team)
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .ToListAsync();
    }

    public async Task<Team?> GetTeamByIdAsync(string id)
    {
        return await _context.Teams
            .Include(t => t.TeamMembers)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<Team> CreateTeamAsync(Team team, string createdByUserId)
    {
        team.Id = Guid.NewGuid().ToString();
        team.CreatedAt = DateTime.UtcNow;
        team.CreatedBy = createdByUserId;
        
        _context.Teams.Add(team);
        
        // Add creator as team leader
        var teamMember = new TeamMember
        {
            TeamId = team.Id,
            UserId = createdByUserId,
            Role = TeamRole.Leader,
            JoinedAt = DateTime.UtcNow,
            IsActive = true
        };
        _context.TeamMembers.Add(teamMember);
        
        await _context.SaveChangesAsync();
        return team;
    }

    public async Task<Team?> UpdateTeamAsync(string id, Team team)
    {
        var existingTeam = await _context.Teams.FindAsync(id);
        if (existingTeam == null)
            return null;

        existingTeam.Name = team.Name;
        existingTeam.Description = team.Description;
        existingTeam.IsActive = team.IsActive;
        existingTeam.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existingTeam;
    }

    public async Task<bool> DeleteTeamAsync(string id)
    {
        var team = await _context.Teams.FindAsync(id);
        if (team == null)
            return false;

        team.IsActive = false;
        team.UpdatedAt = DateTime.UtcNow;
        
        // Deactivate all team members
        var members = await _context.TeamMembers.Where(tm => tm.TeamId == id).ToListAsync();
        foreach (var member in members)
        {
            member.IsActive = false;
        }
        
        await _context.SaveChangesAsync();
        return true;
    }

    // Team member operations
    public async Task<IEnumerable<TeamMemberDto>> GetTeamMembersAsync(string teamId)
    {
        var members = await _context.TeamMembers
            .Where(tm => tm.TeamId == teamId && tm.IsActive)
            .OrderBy(tm => tm.Role)
            .ThenBy(tm => tm.JoinedAt)
            .ToListAsync();

        var memberDtos = new List<TeamMemberDto>();

        foreach (var member in members)
        {
            var user = await _identityContext.Users
                .FirstOrDefaultAsync(u => u.Id == member.UserId);

            memberDtos.Add(new TeamMemberDto
            {
                TeamId = member.TeamId,
                UserId = member.UserId,
                UserEmail = user?.Email ?? string.Empty,
                UserFirstName = user?.FirstName ?? string.Empty,
                UserLastName = user?.LastName ?? string.Empty,
                Role = member.Role,
                JoinedAt = member.JoinedAt,
                InvitedByUserId = member.InvitedByUserId,
                IsActive = member.IsActive
            });
        }

        return memberDtos;
    }

    public async Task<TeamMember?> GetTeamMemberAsync(string teamId, string userId)
    {
        return await _context.TeamMembers
            .FirstOrDefaultAsync(tm => tm.TeamId == teamId && tm.UserId == userId && tm.IsActive);
    }

    public async Task<bool> AddTeamMemberAsync(string teamId, string userIdOrExternalId, TeamRole role, string invitedByUserId)
    {
        string actualUserId = userIdOrExternalId;

        var localUserExists = await _identityContext.Users.AnyAsync(u => u.Id == userIdOrExternalId);
        if (!localUserExists)
        {
            var user = await _identityContext.Users.FirstOrDefaultAsync(u => u.ExternalUserId == userIdOrExternalId);
            if (user == null)
            {
                _logger.LogError("User with external identity ID {ExternalUserId} not found in database", userIdOrExternalId);
                return false;
            }

            actualUserId = user.Id;
        }

        // Check if user is already in team
        var existing = await GetTeamMemberAsync(teamId, actualUserId);
        if (existing != null)
            return false;

        var teamMember = new TeamMember
        {
            TeamId = teamId,
            UserId = actualUserId,
            Role = role,
            JoinedAt = DateTime.UtcNow,
            InvitedByUserId = invitedByUserId,
            IsActive = true
        };

        _context.TeamMembers.Add(teamMember);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<TeamInvitation?> InviteTeamMemberByEmailAsync(string teamId, string email, TeamRole role, string invitedByUserId)
    {
        // Check if any user with this email already exists and is in the team
        // With composite unique constraint on (Email, IdentityProvider), there could be multiple users with same email
        var existingUsers = await _identityContext.Users.Where(u => u.Email == email).ToListAsync();
        foreach (var existingUser in existingUsers)
        {
            var existingMember = await GetTeamMemberAsync(teamId, existingUser.Id);
            if (existingMember != null)
            {
                _logger.LogWarning("User {Email} (ExternalUserId: {ExternalUserId}) is already a member of team {TeamId}", email, existingUser.ExternalUserId, teamId);
                return null;
            }
        }

        // Check if there's already a pending invitation
        var existingInvitation = await _context.TeamInvitations
            .FirstOrDefaultAsync(i => i.TeamId == teamId && i.Email == email && !i.IsAccepted && i.ExpiresAt > DateTime.UtcNow);
        if (existingInvitation != null)
        {
            _logger.LogWarning($"Pending invitation already exists for {email} to team {teamId}");
            return existingInvitation;
        }

        // Get team details
        var team = await GetTeamByIdAsync(teamId);
        if (team == null)
        {
            _logger.LogWarning($"Team {teamId} not found");
            return null;
        }

        // Get the inviter's details - invitedByUserId contains the User.Id from Identity.Users table
        var inviter = await _identityContext.Users.FirstOrDefaultAsync(u => u.Id == invitedByUserId);
        if (inviter == null)
        {
            _logger.LogWarning($"Inviter with UserId {invitedByUserId} not found");
            return null;
        }
        var inviterEmail = inviter.Email ?? invitedByUserId;
        var inviterName = $"{inviter.FirstName} {inviter.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(inviterName))
        {
            inviterName = inviterEmail;
        }

        // Create invitation
        var invitation = new TeamInvitation
        {
            TeamId = teamId,
            Email = email,
            Role = role,
            InvitationToken = GenerateInvitationToken(),
            InvitedByUserId = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.TeamInvitations.Add(invitation);
        await _context.SaveChangesAsync();

        // Send invitation email
        try
        {
            var baseUrl = _configuration["APP_BASE_URL"] ?? "http://localhost:5173";
            var invitationLink = $"{baseUrl}/accept-invitation?token={invitation.InvitationToken}";
            
            await _emailService.SendTeamInvitationEmailAsync(
                email,
                team.Name,
                inviterName,
                invitationLink
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send invitation email to {email} for team {teamId}");
            // Don't fail the invitation if email fails - the invitation is already created
        }
        
        return invitation;
    }

    /// <summary>
    /// DEPRECATED: This method is no longer used. Use InvitationController.AcceptInvitation instead.
    /// Legacy method that accepts invitation using email lookup, which is incompatible with composite unique constraint on (Email, IdentityProvider).
    /// </summary>
    [Obsolete("Use InvitationController.AcceptInvitation instead. This method uses email-only lookup which doesn't work with composite unique constraints.")]
    public async Task<(bool success, string? userId)> AcceptInvitationAsync(string token, string email, string firstName, string lastName, string password)
    {
        // Find the invitation
        var invitation = await _context.TeamInvitations
            .Include(i => i.Team)
            .FirstOrDefaultAsync(i => i.InvitationToken == token && i.Email == email);

        if (invitation == null)
        {
            _logger.LogWarning($"Invitation not found for token and email {email}");
            return (false, null);
        }

        if (invitation.IsAccepted)
        {
            _logger.LogWarning($"Invitation already accepted for {email}");
            return (false, null);
        }

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            _logger.LogWarning($"Invitation expired for {email}");
            return (false, null);
        }

        // Check if user already exists
        var user = await _identityContext.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            _logger.LogError("User {Email} not found. User must sign up through Clerk before accepting the invitation.", email);
            return (false, null);
        }

        // Check if user is already a team member
        var existingMember = await _context.TeamMembers
            .FirstOrDefaultAsync(tm => tm.TeamId == invitation.TeamId && tm.UserId == user.Id && tm.IsActive);

        if (existingMember != null)
        {
            _logger.LogWarning($"User {email} is already a member of team {invitation.TeamId}");
            // Still mark invitation as accepted
            invitation.IsAccepted = true;
            invitation.AcceptedAt = DateTime.UtcNow;
            invitation.AcceptedByUserId = user.Id;
            await _context.SaveChangesAsync();
            return (true, user.Id);
        }

        // Add user to team
        var teamMember = new TeamMember
        {
            TeamId = invitation.TeamId,
            UserId = user.Id,
            Role = invitation.Role,
            JoinedAt = DateTime.UtcNow,
            InvitedByUserId = invitation.InvitedByUserId,
            IsActive = true
        };

        _context.TeamMembers.Add(teamMember);

        // Mark invitation as accepted
        invitation.IsAccepted = true;
        invitation.AcceptedAt = DateTime.UtcNow;
        invitation.AcceptedByUserId = user.Id;

        await _context.SaveChangesAsync();

        return (true, user.Id);
    }

    private string GenerateInvitationToken()
    {
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        var bytes = new byte[32];
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }

    public async Task<bool> UpdateTeamMemberRoleAsync(string teamId, string userId, TeamRole newRole)
    {
        var member = await GetTeamMemberAsync(teamId, userId);
        if (member == null)
            return false;

        member.Role = newRole;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveTeamMemberAsync(string teamId, string userId)
    {
        var member = await GetTeamMemberAsync(teamId, userId);
        if (member == null)
            return false;

        member.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    // Permission checks
    public async Task<bool> IsUserTeamLeaderAsync(string teamId, string userId)
    {
        var member = await GetTeamMemberAsync(teamId, userId);
        return member != null && member.Role == TeamRole.Leader;
    }

    public async Task<bool> IsUserInTeamAsync(string teamId, string userId)
    {
        return await _context.TeamMembers
            .AnyAsync(tm => tm.TeamId == teamId && tm.UserId == userId && tm.IsActive);
    }

    public async Task<TeamRole?> GetUserRoleInTeamAsync(string teamId, string userId)
    {
        var member = await GetTeamMemberAsync(teamId, userId);
        return member?.Role;
    }

    public async Task<bool> ResendInvitationAsync(string invitationId)
    {
        var invitation = await _context.TeamInvitations
            .FirstOrDefaultAsync(i => i.Id == invitationId && !i.IsAccepted && i.ExpiresAt > DateTime.UtcNow);

        if (invitation == null)
        {
            _logger.LogWarning($"Invitation {invitationId} not found or already accepted/expired");
            return false;
        }

        // Get team and inviter details
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.Id == invitation.TeamId);

        // Get inviter by UserId (Identity.Users.Id)
        var inviter = await _identityContext.Users.FirstOrDefaultAsync(u => u.Id == invitation.InvitedByUserId);

        if (team == null || inviter == null)
        {
            _logger.LogError($"Team or inviter not found for invitation {invitationId}. Team: {team?.Name ?? "null"}, InviterUserId: {invitation.InvitedByUserId}");
            return false;
        }

        // Generate new token and update expiry
        invitation.InvitationToken = GenerateInvitationToken();
        invitation.ExpiresAt = DateTime.UtcNow.AddDays(7);

        try
        {
            await _context.SaveChangesAsync();

            // Send email with new token
            var invitationLink = $"{_configuration["APP_BASE_URL"]}/accept-invitation?token={invitation.InvitationToken}";
            var emailSent = await _emailService.SendTeamInvitationEmailAsync(
                invitation.Email,
                team.Name,
                $"{inviter.FirstName} {inviter.LastName}",
                invitationLink
            );

            if (!emailSent)
            {
                _logger.LogError($"Failed to send invitation email for {invitationId}");
                // Still return true as the invitation was updated successfully
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error resending invitation {invitationId}");
            return false;
        }
    }

    public async Task<IEnumerable<TeamInvitation>> GetPendingInvitationsAsync(string teamId)
    {
        try
        {
            return await _context.TeamInvitations
                .Where(ti => ti.TeamId == teamId && !ti.IsAccepted && ti.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(ti => ti.CreatedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error getting pending invitations for team {teamId}");
            return new List<TeamInvitation>();
        }
    }

    public async Task<bool> CancelInvitationAsync(string invitationId)
    {
        try
        {
            var invitation = await _context.TeamInvitations
                .FirstOrDefaultAsync(ti => ti.Id == invitationId && !ti.IsAccepted);

            if (invitation == null)
                return false;

            _context.TeamInvitations.Remove(invitation);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Cancelled invitation {invitationId} for email {invitation.Email}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error cancelling invitation {invitationId}");
            return false;
        }
    }
}
