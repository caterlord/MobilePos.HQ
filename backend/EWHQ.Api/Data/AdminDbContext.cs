using Microsoft.EntityFrameworkCore;
using EWHQ.Api.Models.AdminPortal;

namespace EWHQ.Api.Data;

/// <summary>
/// Database context for admin-specific data including teams and settings
/// </summary>
public class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options)
    {
    }

    // Admin entities
    public DbSet<Team> Teams { get; set; }
    public DbSet<TeamMember> TeamMembers { get; set; }
    public DbSet<TeamInvitation> TeamInvitations { get; set; }
    public DbSet<AccessAuditLog> AccessAuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Team configuration
        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).HasMaxLength(450); // Match Identity userId length
            entity.Property(e => e.UpdatedBy).HasMaxLength(450);
            
            entity.HasIndex(e => e.Name);
        });

        // TeamMember configuration
        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.HasKey(e => new { e.TeamId, e.UserId });
            entity.Property(e => e.TeamId).HasMaxLength(50);
            entity.Property(e => e.UserId).HasMaxLength(450); // Match Identity userId length
            entity.Property(e => e.InvitedByUserId).HasMaxLength(450);
            
            entity.HasOne(e => e.Team)
                  .WithMany(t => t.TeamMembers)
                  .HasForeignKey(e => e.TeamId)
                  .OnDelete(DeleteBehavior.Cascade);
                  
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.IsActive });
        });

        // TeamInvitation configuration
        modelBuilder.Entity<TeamInvitation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.TeamId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(256).IsRequired();
            entity.Property(e => e.InvitationToken).HasMaxLength(256).IsRequired();
            entity.Property(e => e.InvitedByUserId).HasMaxLength(450).IsRequired();
            entity.Property(e => e.AcceptedByUserId).HasMaxLength(450);
            
            entity.HasOne(e => e.Team)
                  .WithMany()
                  .HasForeignKey(e => e.TeamId)
                  .OnDelete(DeleteBehavior.Cascade);
                  
            entity.HasIndex(e => e.InvitationToken).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => new { e.TeamId, e.Email });
        });

        // AccessAuditLog configuration
        modelBuilder.Entity<AccessAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.TeamId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ActionType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ActorUserId).HasMaxLength(450);
            entity.Property(e => e.TargetUserId).HasMaxLength(450);
            entity.Property(e => e.TargetEmail).HasMaxLength(256);
            entity.Property(e => e.Details).HasMaxLength(2000);

            entity.HasOne(e => e.Team)
                  .WithMany()
                  .HasForeignKey(e => e.TeamId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.TeamId, e.CreatedAt });
            entity.HasIndex(e => e.ActionType);
        });
    }
}
