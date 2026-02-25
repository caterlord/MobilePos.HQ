namespace EWHQ.Api.Models.AdminPortal;

/// <summary>
/// Represents an audit record for access-management operations.
/// </summary>
public class AccessAuditLog
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TeamId { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string? ActorUserId { get; set; }
    public string? TargetUserId { get; set; }
    public string? TargetEmail { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual Team Team { get; set; } = null!;
}
