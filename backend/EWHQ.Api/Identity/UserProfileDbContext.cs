using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Identity;

/// <summary>
/// Database context for user profile and legacy access management.
/// Clerk handles authentication while this context manages synchronized user profiles
/// and local access mappings. This will be consolidated into the Admin database.
/// </summary>
public class UserProfileDbContext : DbContext
{
    public UserProfileDbContext(DbContextOptions<UserProfileDbContext> options)
        : base(options)
    {
    }

    public DbSet<ApplicationUser> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Configure ApplicationUser
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.ToTable("Users"); // Now using default (public) schema

            entity.HasKey(u => u.Id);

            // Indexes for performance
            entity.HasIndex(u => new { u.Email, u.IdentityProvider })
                .IsUnique()
                .HasDatabaseName("IX_Users_Email_IdentityProvider_public");

            entity.HasIndex(u => u.ExternalUserId)
                .IsUnique()
                .HasDatabaseName("IX_Users_ExternalUserId_public");

            entity.HasIndex(u => u.UserType)
                .HasDatabaseName("IX_Users_UserType_public");
        });
    }
}
