using EWHQ.Api.Constants;
using EWHQ.Api.Data;
using EWHQ.Api.Identity;
using EWHQ.Api.Models.DTOs;
using EWHQ.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly UserProfileDbContext _context;
    private readonly AdminPortalDbContext _adminPortalContext;
    private readonly ILogger<AuthController> _logger;
    private readonly IClerkUserService _clerkUserService;

    public AuthController(
        UserProfileDbContext context,
        AdminPortalDbContext adminPortalContext,
        ILogger<AuthController> logger,
        IClerkUserService clerkUserService)
    {
        _context = context;
        _adminPortalContext = adminPortalContext;
        _logger = logger;
        _clerkUserService = clerkUserService;
    }

    [HttpPost("sync-user")]
    [Authorize]
    public async Task<IActionResult> SyncUser()
    {
        var externalUserId = GetExternalUserId();
        if (string.IsNullOrWhiteSpace(externalUserId))
        {
            return BadRequest(new { message = "User ID not found in token" });
        }

        var clerkUser = await _clerkUserService.GetUserAsync(externalUserId);
        if (clerkUser == null)
        {
            return BadRequest(new { message = "Failed to load user profile from Clerk" });
        }

        if (string.IsNullOrWhiteSpace(clerkUser.Email))
        {
            return BadRequest(new { message = "Email not found in user profile" });
        }

        var user = await _context.Users.FirstOrDefaultAsync(candidate => candidate.ExternalUserId == externalUserId);
        var resolvedUserType = ResolveUserType(user, clerkUser);

        if (user == null)
        {
            user = new ApplicationUser
            {
                Email = clerkUser.Email,
                FirstName = clerkUser.FirstName,
                LastName = clerkUser.LastName,
                UserType = resolvedUserType,
                ExternalUserId = externalUserId,
                IdentityProvider = clerkUser.IdentityProvider,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            _logger.LogInformation(
                "Created new local user {Email} with external identity {ExternalUserId}, provider {IdentityProvider}, and type {UserType}",
                clerkUser.Email,
                externalUserId,
                clerkUser.IdentityProvider,
                resolvedUserType);
        }
        else
        {
            user.Email = clerkUser.Email;
            user.FirstName = clerkUser.FirstName;
            user.LastName = clerkUser.LastName;
            user.IdentityProvider = clerkUser.IdentityProvider;
            user.UserType = resolvedUserType;
            user.UpdatedAt = DateTime.UtcNow;
            user.LastLoginAt = DateTime.UtcNow;

            _logger.LogInformation(
                "Updated local user {ExternalUserId} with email {Email}, provider {IdentityProvider}, and type {UserType}",
                externalUserId,
                clerkUser.Email,
                clerkUser.IdentityProvider,
                resolvedUserType);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = new[] { user.UserType ?? "Standard" },
            ExternalUserId = externalUserId,
            Message = "User synchronized successfully"
        });
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var user = await GetCurrentUserAsync();
        if (user == null)
        {
            return NotFound(new { message = "User profile not found. Please sync your account first." });
        }

        var userCompanies = await _adminPortalContext.UserCompanies
            .Where(association => association.UserId == user.Id && association.IsActive)
            .Include(association => association.Company)
            .ToListAsync();

        int? accountId = null;
        int? shopId = null;

        if (userCompanies.Count > 0)
        {
            var primaryCompany = userCompanies[0];
            accountId = primaryCompany.CompanyId;

            var firstShop = await _adminPortalContext.Shops
                .Where(shop => shop.Brand.CompanyId == primaryCompany.CompanyId && shop.IsActive)
                .FirstOrDefaultAsync();

            shopId = firstShop?.Id;
        }

        var canAccessAdminPortal = user.UserType is "SuperAdmin" or "Admin";
        var canAccessHqPortal = userCompanies.Count > 0;

        return Ok(new
        {
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            UserType = user.UserType,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            Roles = new[] { user.UserType ?? "Standard" },
            ExternalUserId = user.ExternalUserId,
            IdentityProvider = GetProviderDisplayName(user.IdentityProvider),
            PortalAccess = new
            {
                CanAccessAdminPortal = canAccessAdminPortal,
                CanAccessHQPortal = canAccessHqPortal,
                IsInternalStaff = canAccessAdminPortal,
                IsCustomer = canAccessHqPortal && !canAccessAdminPortal
            },
            AccountId = accountId,
            ShopId = shopId,
            Companies = userCompanies.Select(association => new
            {
                association.CompanyId,
                association.Company?.Name,
                Role = association.Role.ToString(),
                association.AcceptedAt,
                association.IsActive
            })
        });
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto model)
    {
        var user = await GetCurrentUserAsync();
        if (user == null)
        {
            return NotFound(new { message = "User profile not found" });
        }

        if (!string.IsNullOrWhiteSpace(model.FirstName))
        {
            user.FirstName = model.FirstName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(model.LastName))
        {
            user.LastName = model.LastName.Trim();
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(user.ExternalUserId))
        {
            var clerkUpdated = await _clerkUserService.UpdateUserProfileAsync(
                user.ExternalUserId,
                user.FirstName ?? string.Empty,
                user.LastName ?? string.Empty);

            if (!clerkUpdated)
            {
                _logger.LogWarning(
                    "Profile updated locally but failed to sync with Clerk for external user {ExternalUserId}",
                    user.ExternalUserId);

                return Ok(new
                {
                    Message = "Profile updated successfully in local database",
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Warning = "Clerk profile update failed. Your changes are saved locally."
                });
            }
        }

        return Ok(new
        {
            Message = "Profile updated successfully",
            FirstName = user.FirstName,
            LastName = user.LastName
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto _)
    {
        var user = await GetCurrentUserAsync();
        if (user == null || string.IsNullOrWhiteSpace(user.Email))
        {
            return NotFound(new { message = "User profile not found or missing email" });
        }

        return BadRequest(new
        {
            message = "Password management is handled in Clerk account settings"
        });
    }

    [HttpGet("admin-users")]
    [Authorize]
    public async Task<IActionResult> GetAllAdminUsers()
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || currentUser.UserType is not ("SuperAdmin" or "Admin"))
        {
            return Forbid();
        }

        var users = await _context.Users
            .Where(user => user.UserType == "SuperAdmin" || user.UserType == "Admin" || user.UserType == "Manager")
            .OrderByDescending(user => user.CreatedAt)
            .ToListAsync();

        return Ok(users.Select(user => new
        {
            Id = user.Id,
            Name = $"{user.FirstName} {user.LastName}".Trim(),
            Email = user.Email,
            Roles = new[] { user.UserType ?? "Standard" },
            Status = user.LastLoginAt.HasValue
                ? user.LastLoginAt > DateTime.UtcNow.AddDays(-30) ? "active" : "inactive"
                : "pending",
            LastActive = user.LastLoginAt.HasValue ? GetRelativeTime(user.LastLoginAt.Value) : "Never",
            CreatedAt = user.CreatedAt.ToString("yyyy-MM-dd"),
            IdentityProvider = GetProviderDisplayName(user.IdentityProvider),
            ExternalUserId = user.ExternalUserId
        }));
    }

    [HttpPut("admin-users/{userId}")]
    [Authorize]
    public async Task<IActionResult> UpdateAdminUser(string userId, [FromBody] UpdateAdminUserDto model)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null || currentUser.UserType is not ("SuperAdmin" or "Admin"))
        {
            return Forbid();
        }

        var targetUser = await _context.Users.FindAsync(userId);
        if (targetUser == null)
        {
            return NotFound(new { message = "User not found" });
        }

        if (model.FirstName != null)
        {
            targetUser.FirstName = model.FirstName.Trim();
        }

        if (model.LastName != null)
        {
            targetUser.LastName = model.LastName.Trim();
        }

        if (model.UserType != null && (currentUser.UserType == "SuperAdmin" || model.UserType != "SuperAdmin"))
        {
            targetUser.UserType = model.UserType;
        }

        targetUser.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(targetUser.ExternalUserId))
        {
            var profileUpdated = await _clerkUserService.UpdateUserProfileAsync(
                targetUser.ExternalUserId,
                targetUser.FirstName ?? string.Empty,
                targetUser.LastName ?? string.Empty);

            var roleUpdated = true;
            if (!string.IsNullOrWhiteSpace(model.UserType))
            {
                roleUpdated = await _clerkUserService.UpdateUserPublicMetadataAsync(
                    targetUser.ExternalUserId,
                    new Dictionary<string, object?>
                    {
                        ["userType"] = targetUser.UserType,
                        ["adminPortalAccess"] = targetUser.UserType is "SuperAdmin" or "Admin" or "Manager"
                    });
            }

            if (!profileUpdated || !roleUpdated)
            {
                _logger.LogWarning(
                    "Local admin user update completed but Clerk sync was partial for user {ExternalUserId}",
                    targetUser.ExternalUserId);
            }
        }

        return Ok(new
        {
            Message = "User updated successfully",
            User = new
            {
                Id = targetUser.Id,
                FirstName = targetUser.FirstName,
                LastName = targetUser.LastName,
                Name = $"{targetUser.FirstName} {targetUser.LastName}".Trim(),
                Email = targetUser.Email,
                UserType = targetUser.UserType,
                Roles = new[] { targetUser.UserType ?? "Standard" }
            }
        });
    }

    private string? GetExternalUserId()
    {
        return User.GetExternalUserId();
    }

    private async Task<ApplicationUser?> GetCurrentUserAsync()
    {
        var localUserId = User.FindFirst(HqClaimTypes.LocalUserId)?.Value;
        if (!string.IsNullOrWhiteSpace(localUserId))
        {
            return await _context.Users.FirstOrDefaultAsync(user => user.Id == localUserId);
        }

        var externalUserId = GetExternalUserId();
        if (string.IsNullOrWhiteSpace(externalUserId))
        {
            return null;
        }

        return await _context.Users.FirstOrDefaultAsync(user => user.ExternalUserId == externalUserId);
    }

    private static string GetRelativeTime(DateTime dateTime)
    {
        var diff = DateTime.UtcNow - dateTime;

        if (diff.TotalMinutes < 1)
        {
            return "Just now";
        }

        if (diff.TotalMinutes < 60)
        {
            return $"{(int)diff.TotalMinutes} minute{((int)diff.TotalMinutes != 1 ? "s" : string.Empty)} ago";
        }

        if (diff.TotalHours < 24)
        {
            return $"{(int)diff.TotalHours} hour{((int)diff.TotalHours != 1 ? "s" : string.Empty)} ago";
        }

        if (diff.TotalDays < 30)
        {
            return $"{(int)diff.TotalDays} day{((int)diff.TotalDays != 1 ? "s" : string.Empty)} ago";
        }

        if (diff.TotalDays < 365)
        {
            var months = (int)(diff.TotalDays / 30);
            return $"{months} month{(months != 1 ? "s" : string.Empty)} ago";
        }

        var years = (int)(diff.TotalDays / 365);
        return $"{years} year{(years != 1 ? "s" : string.Empty)} ago";
    }

    private static string GetProviderDisplayName(string? provider)
    {
        if (string.IsNullOrWhiteSpace(provider))
        {
            return "Clerk";
        }

        return provider.ToLowerInvariant() switch
        {
            "clerk" => "Clerk",
            "email" => "Email",
            "oauth_google" or "google" or "google-oauth2" => "Google",
            "oauth_facebook" or "facebook" => "Facebook",
            "oauth_apple" => "Apple",
            "oauth_twitter" or "twitter" => "Twitter",
            "linkedin" => "LinkedIn",
            "github" => "GitHub",
            _ => provider
        };
    }

    private static string ResolveUserType(ApplicationUser? existingUser, ClerkUserProfile clerkUser)
    {
        if (!string.IsNullOrWhiteSpace(clerkUser.UserType) && clerkUser.UserType != "Standard")
        {
            return clerkUser.UserType;
        }

        return existingUser?.UserType ?? clerkUser.UserType ?? "Standard";
    }
}

public class UpdateProfileDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

public class UpdateAdminUserDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? UserType { get; set; }
}

public class ChangePasswordRequestDto
{
    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
}
