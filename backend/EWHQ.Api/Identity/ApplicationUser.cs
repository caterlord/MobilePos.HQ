namespace EWHQ.Api.Identity;

/// <summary>
/// User entity for external identity integration.
/// Authentication is handled by Clerk, while this entity stores the local HQ profile and access data.
/// </summary>
public class ApplicationUser
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    // Basic profile information
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }

    // External identity integration
    public string? ExternalUserId { get; set; } // External user identifier (for example, a Clerk user ID)
    public string? IdentityProvider { get; set; } // Identity provider (for example, "clerk", "oauth_google")

    // User type to distinguish between different user categories
    public string UserType { get; set; } = "Standard"; // SuperAdmin, Admin, Standard

    // Company information (if applicable)
    public string? CompanyName { get; set; }
    public string? CompanyRegistrationNumber { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}
