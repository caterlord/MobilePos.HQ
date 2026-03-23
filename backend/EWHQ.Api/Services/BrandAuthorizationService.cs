using Microsoft.EntityFrameworkCore;
using EWHQ.Api.Data;
using EWHQ.Api.Identity;
using EWHQ.Api.Models.AdminPortal;
using System.Security.Claims;

namespace EWHQ.Api.Services;

public interface IBrandAuthorizationService
{
    Task<bool> UserHasAccessToBrandAsync(string userId, int brandId, UserRole minimumRole = UserRole.Viewer);
    Task<UserRole?> GetUserRoleForBrandAsync(string userId, int brandId);
    Task<bool> UserCanModifyBrandDataAsync(string userId, int brandId);
}

public class BrandAuthorizationService : IBrandAuthorizationService
{
    private readonly AdminPortalDbContext _context;
    private readonly UserProfileDbContext _userContext;
    private readonly ILogger<BrandAuthorizationService> _logger;

    public BrandAuthorizationService(
        AdminPortalDbContext context,
        UserProfileDbContext userContext,
        ILogger<BrandAuthorizationService> logger)
    {
        _context = context;
        _userContext = userContext;
        _logger = logger;
    }

    public async Task<bool> UserHasAccessToBrandAsync(string userId, int brandId, UserRole minimumRole = UserRole.Viewer)
    {
        if (string.IsNullOrEmpty(userId))
            return false;

        // Check if brand exists and is active
        var brand = await _context.Brands
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == brandId && b.IsActive);

        if (brand == null)
        {
            _logger.LogWarning("Brand {BrandId} not found or inactive", brandId);
            return false;
        }

        // Check direct brand access
        var userBrand = await _context.UserBrands
            .AsNoTracking()
            .FirstOrDefaultAsync(ub =>
                ub.UserId == userId &&
                ub.BrandId == brandId &&
                ub.IsActive);

        if (userBrand != null)
        {
            // Check if user's role meets minimum requirement
            bool hasAccess = userBrand.Role <= minimumRole; // Lower enum value = higher privilege

            if (!hasAccess)
            {
                _logger.LogWarning("User {UserId} has insufficient role {UserRole} for brand {BrandId}. Required: {RequiredRole}",
                    userId, userBrand.Role, brandId, minimumRole);
            }

            return hasAccess;
        }

        // Check company-level access (inherits to all brands under the company)
        var userCompany = await _context.UserCompanies
            .AsNoTracking()
            .FirstOrDefaultAsync(uc =>
                uc.UserId == userId &&
                uc.CompanyId == brand.CompanyId &&
                uc.IsActive);

        if (userCompany != null)
        {
            // Company Owner and CompanyAdmin have full access to all brands
            if (userCompany.Role == UserRole.Owner || userCompany.Role == UserRole.CompanyAdmin)
            {
                return true;
            }

            // Other company-level roles need explicit brand permission
            bool hasAccess = userCompany.Role <= minimumRole;

            if (!hasAccess)
            {
                _logger.LogWarning("User {UserId} has insufficient company role {UserRole} for brand {BrandId}. Required: {RequiredRole}",
                    userId, userCompany.Role, brandId, minimumRole);
            }

            return hasAccess;
        }

        _logger.LogWarning("User {UserId} has no access to brand {BrandId}", userId, brandId);
        return false;
    }

    public async Task<UserRole?> GetUserRoleForBrandAsync(string userId, int brandId)
    {
        if (string.IsNullOrEmpty(userId))
            return null;

        var brand = await _context.Brands
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == brandId && b.IsActive);

        if (brand == null)
            return null;

        // Check direct brand access first
        var userBrand = await _context.UserBrands
            .AsNoTracking()
            .FirstOrDefaultAsync(ub =>
                ub.UserId == userId &&
                ub.BrandId == brandId &&
                ub.IsActive);

        if (userBrand != null)
            return userBrand.Role;

        // Check company-level access
        var userCompany = await _context.UserCompanies
            .AsNoTracking()
            .FirstOrDefaultAsync(uc =>
                uc.UserId == userId &&
                uc.CompanyId == brand.CompanyId &&
                uc.IsActive);

        return userCompany?.Role;
    }

    public async Task<bool> UserCanModifyBrandDataAsync(string userId, int brandId)
    {
        // Users who can modify: Owner, CompanyAdmin, BrandAdmin
        // Viewers and other read-only roles cannot modify
        var allowedRoles = new[] { UserRole.Owner, UserRole.CompanyAdmin, UserRole.BrandAdmin };

        var userRole = await GetUserRoleForBrandAsync(userId, brandId);

        if (userRole == null)
            return false;

        bool canModify = allowedRoles.Contains(userRole.Value);

        if (!canModify)
        {
            _logger.LogWarning("User {UserId} with role {UserRole} cannot modify brand {BrandId} data",
                userId, userRole, brandId);
        }

        return canModify;
    }
}

// Extension methods for ClaimsPrincipal
public static class ClaimsPrincipalExtensions
{
    public static async Task<string?> GetUserIdAsync(this ClaimsPrincipal user, UserProfileDbContext userContext)
    {
        var localUserId = user.GetLocalUserId();
        if (!string.IsNullOrWhiteSpace(localUserId))
        {
            return localUserId;
        }

        var externalUserId = user.GetExternalUserId();

        if (string.IsNullOrEmpty(externalUserId))
            return null;

        var appUser = await userContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.ExternalUserId == externalUserId);

        return appUser?.Id;
    }
}
