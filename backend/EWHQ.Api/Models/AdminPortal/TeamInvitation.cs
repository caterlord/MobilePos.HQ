namespace EWHQ.Api.Models.AdminPortal;

/// <summary>
/// Represents a pending invitation to join a team
/// </summary>
public class TeamInvitation
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TeamId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public TeamRole Role { get; set; } = TeamRole.Member;
    public string InvitationToken { get; set; } = string.Empty;
    public string InvitedByUserId { get; set; } = string.Empty; // UserId (Identity.Users.Id) of inviter
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7); // 7 days expiry
    public bool IsAccepted { get; set; } = false;
    public DateTime? AcceptedAt { get; set; }
    public string? AcceptedByUserId { get; set; }

    // Email verification fields for identity-provider sign-in flow
    public string? VerificationCode { get; set; } // 6-digit code for email verification
    public int VerificationAttempts { get; set; } = 0;
    public DateTime? VerificationCodeExpiresAt { get; set; }
    public bool RequiresEmailVerification { get; set; } = false; // True when the signed-in email doesn't match the invited email
    
    // Navigation properties
    public virtual Team Team { get; set; } = null!;
}
