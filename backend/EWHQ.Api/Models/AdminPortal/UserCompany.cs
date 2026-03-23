namespace EWHQ.Api.Models.AdminPortal;

/// <summary>
/// Represents the relationship between users and companies with their roles
/// </summary>
public class UserCompany
{
    public int Id { get; set; }

    // User reference (from external identity/local profile sync)
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty; // Denormalized for quick access
    public string UserName { get; set; } = string.Empty; // Denormalized for display

    // Company reference
    public int CompanyId { get; set; }

    // Permission level
    public UserRole Role { get; set; }

    // Additional permissions/restrictions (JSON string for flexibility)
    public string? CustomPermissions { get; set; }

    // Invitation tracking
    public string? InvitedBy { get; set; } // User ID who invited
    public DateTime? InvitedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public string? InvitationToken { get; set; }

    // Status
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public virtual Company Company { get; set; } = null!;
}

/// <summary>
/// User roles in the multi-tenant system
/// </summary>
public enum UserRole
{
    Owner = 1,           // Full control of company including user management
    CompanyAdmin = 2,    // Full control of company except ownership transfer
    BrandAdmin = 3,      // Full control of brand and its shops
    ShopManager = 4,     // Full control of shop operations
    Admin = 5,           // Legacy admin role
    Manager = 6,         // Read/Write operations
    User = 7,            // Read/Write for assigned areas
    Viewer = 8           // Read-only access
}
