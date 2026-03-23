namespace EWHQ.Api.Models.AdminPortal;

/// <summary>
/// Represents a user's membership in a team
/// </summary>
public class TeamMember
{
    public string TeamId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty; // References Identity.Users.Id (not the external provider ID)
    public TeamRole Role { get; set; } = TeamRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public string? InvitedByUserId { get; set; } // UserId (Identity.Users.Id) of who invited this member
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual Team Team { get; set; } = null!;
}

/// <summary>
/// Roles within a team
/// </summary>
public enum TeamRole
{
    Member = 0,
    Leader = 1
}
