using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EWHQ.Api.Authorization;
using EWHQ.Api.DTOs;
using EWHQ.Api.Models.Entities;
using EWHQ.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/pos-users")]
[Authorize]
public class PosUsersController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<PosUsersController> _logger;

    public PosUsersController(IPOSDbContextService posContextService, ILogger<PosUsersController> logger)
    {
        _posContextService = posContextService;
        _logger = logger;
    }

    private string GetCurrentUserIdentifier()
    {
        const int maxLength = 50;
        var identifier = User?.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(identifier)) return "System";
        identifier = identifier.Trim();
        return identifier.Length <= maxLength ? identifier : identifier[..maxLength];
    }

    private static string Clip(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    // ════════════════════════════════════════════════════════════════
    //  USER GROUPS
    // ════════════════════════════════════════════════════════════════

    [HttpGet("brand/{brandId:int}/groups")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<PosUserGroupSummaryDto>>> GetUserGroups(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var items = await context.UserGroupHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && x.GroupType == null)
                .OrderBy(x => x.GroupId)
                .Select(x => new PosUserGroupSummaryDto
                {
                    GroupId = x.GroupId,
                    AccountId = x.AccountId,
                    Name = x.Name ?? string.Empty,
                    AltName = x.AltName ?? string.Empty,
                    Enabled = x.Enabled,
                    GroupType = x.GroupType,
                    ModifiedDate = x.ModifiedDate,
                    ModifiedBy = x.ModifiedBy ?? string.Empty
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(items);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user groups for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching user groups." });
        }
    }

    [HttpPost("brand/{brandId:int}/groups")]
    [RequireBrandModify]
    public async Task<ActionResult<PosUserGroupSummaryDto>> CreateUserGroup(int brandId, UpsertPosUserGroupDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.Name))
                return BadRequest(new { message = "Group name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var nextId = (await context.UserGroupHeaders
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.GroupId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var entity = new UserGroupHeader
            {
                GroupId = nextId,
                AccountId = accountId,
                Name = Clip(payload.Name, 50),
                AltName = Clip(payload.AltName, 100),
                Enabled = true,
                CreatedDate = now,
                CreatedBy = user,
                ModifiedDate = now,
                ModifiedBy = user
            };

            context.UserGroupHeaders.Add(entity);
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new PosUserGroupSummaryDto
            {
                GroupId = entity.GroupId,
                AccountId = entity.AccountId,
                Name = entity.Name,
                AltName = entity.AltName,
                Enabled = entity.Enabled,
                GroupType = entity.GroupType,
                ModifiedDate = entity.ModifiedDate,
                ModifiedBy = entity.ModifiedBy
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user group for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the user group." });
        }
    }

    [HttpPut("brand/{brandId:int}/groups/{groupId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<PosUserGroupSummaryDto>> UpdateUserGroup(int brandId, int groupId, UpsertPosUserGroupDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.Name))
                return BadRequest(new { message = "Group name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var entity = await context.UserGroupHeaders
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.GroupId == groupId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "User group not found." });

            entity.Name = Clip(payload.Name, 50);
            entity.AltName = Clip(payload.AltName, 100);
            entity.ModifiedDate = now;
            entity.ModifiedBy = user;

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new PosUserGroupSummaryDto
            {
                GroupId = entity.GroupId,
                AccountId = entity.AccountId,
                Name = entity.Name,
                AltName = entity.AltName,
                Enabled = entity.Enabled,
                GroupType = entity.GroupType,
                ModifiedDate = entity.ModifiedDate,
                ModifiedBy = entity.ModifiedBy
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user group for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while updating the user group." });
        }
    }

    [HttpDelete("brand/{brandId:int}/groups/{groupId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivateUserGroup(int brandId, int groupId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var entity = await context.UserGroupHeaders
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.GroupId == groupId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "User group not found." });

            entity.Enabled = false;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new { message = "User group deactivated." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating user group for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the user group." });
        }
    }

    // ════════════════════════════════════════════════════════════════
    //  USERS
    // ════════════════════════════════════════════════════════════════

    [HttpGet("brand/{brandId:int}/users")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<PosUserSummaryDto>>> GetUsers(int brandId, [FromQuery] int? shopId = null)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var query = context.Users
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled);

            if (shopId.HasValue)
                query = query.Where(x => x.ShopId == shopId.Value);

            var items = await query
                .OrderBy(x => x.InactiveUserAccount)
                .ThenBy(x => x.StaffCode ?? string.Empty)
                .ThenBy(x => x.UserName)
                .Select(x => new PosUserSummaryDto
                {
                    UserId = x.UserId,
                    AccountId = x.AccountId,
                    ShopId = x.ShopId,
                    ShopName = string.Empty,
                    UserName = x.UserName ?? string.Empty,
                    UserAltName = x.UserAltName ?? string.Empty,
                    StaffCode = x.StaffCode ?? string.Empty,
                    CardNo = x.CardNo ?? string.Empty,
                    InactiveUserAccount = x.InactiveUserAccount,
                    Enabled = x.Enabled,
                    EnableUserIdLogin = x.EnableUserIdLogin,
                    EnableCardNoLogin = x.EnableCardNoLogin,
                    EnableStaffCodeLogin = x.EnableStaffCodeLogin,
                    ModifiedDate = x.ModifiedDate,
                    ModifiedBy = x.ModifiedBy ?? string.Empty
                })
                .ToListAsync(HttpContext.RequestAborted);

            // Populate shop names in memory
            var shopIds = items.Select(x => x.ShopId).Distinct().ToList();
            if (shopIds.Count > 0)
            {
                var shops = await context.Shops
                    .AsNoTracking()
                    .Where(x => x.AccountId == accountId && shopIds.Contains(x.ShopId))
                    .Select(x => new { x.ShopId, x.Name })
                    .ToDictionaryAsync(x => x.ShopId, x => x.Name ?? string.Empty, HttpContext.RequestAborted);

                foreach (var item in items)
                {
                    if (shops.TryGetValue(item.ShopId, out var shopName))
                        item.ShopName = shopName;
                }
            }

            return Ok(items);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching users for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching users." });
        }
    }

    [HttpPost("brand/{brandId:int}/users")]
    [RequireBrandModify]
    public async Task<ActionResult<PosUserSummaryDto>> CreateUser(int brandId, UpsertPosUserDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.UserName))
                return BadRequest(new { message = "User name is required." });
            if (payload.ShopId <= 0)
                return BadRequest(new { message = "Shop is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var nextId = (await context.Users
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.UserId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var entity = new User
            {
                UserId = nextId,
                AccountId = accountId,
                ShopId = payload.ShopId,
                UserName = Clip(payload.UserName, 50),
                UserAltName = payload.UserAltName?.Trim(),
                Password = Clip(payload.Password, 50),
                StaffCode = payload.StaffCode?.Trim(),
                CardNo = payload.CardNo?.Trim(),
                Enabled = true,
                InactiveUserAccount = payload.InactiveUserAccount,
                EnableUserIdLogin = payload.EnableUserIdLogin,
                EnableCardNoLogin = payload.EnableCardNoLogin,
                EnableStaffCodeLogin = payload.EnableStaffCodeLogin,
                CreatedDate = now,
                CreatedBy = user,
                ModifiedDate = now,
                ModifiedBy = user
            };

            context.Users.Add(entity);
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new PosUserSummaryDto
            {
                UserId = entity.UserId,
                AccountId = entity.AccountId,
                ShopId = entity.ShopId,
                UserName = entity.UserName,
                UserAltName = entity.UserAltName,
                StaffCode = entity.StaffCode,
                CardNo = entity.CardNo,
                InactiveUserAccount = entity.InactiveUserAccount,
                Enabled = entity.Enabled,
                EnableUserIdLogin = entity.EnableUserIdLogin,
                EnableCardNoLogin = entity.EnableCardNoLogin,
                EnableStaffCodeLogin = entity.EnableStaffCodeLogin,
                ModifiedDate = entity.ModifiedDate,
                ModifiedBy = entity.ModifiedBy
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the user." });
        }
    }

    [HttpPut("brand/{brandId:int}/users/{userId:int}/shop/{shopId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<PosUserSummaryDto>> UpdateUser(int brandId, int userId, int shopId, UpsertPosUserDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.UserName))
                return BadRequest(new { message = "User name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var entity = await context.Users
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.UserId == userId && x.ShopId == shopId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "User not found." });

            entity.UserName = Clip(payload.UserName, 50);
            entity.UserAltName = payload.UserAltName?.Trim();
            entity.StaffCode = payload.StaffCode?.Trim();
            entity.CardNo = payload.CardNo?.Trim();
            entity.InactiveUserAccount = payload.InactiveUserAccount;
            entity.EnableUserIdLogin = payload.EnableUserIdLogin;
            entity.EnableCardNoLogin = payload.EnableCardNoLogin;
            entity.EnableStaffCodeLogin = payload.EnableStaffCodeLogin;
            entity.ModifiedDate = now;
            entity.ModifiedBy = user;

            if (!string.IsNullOrWhiteSpace(payload.Password))
                entity.Password = Clip(payload.Password, 50);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new PosUserSummaryDto
            {
                UserId = entity.UserId,
                AccountId = entity.AccountId,
                ShopId = entity.ShopId,
                UserName = entity.UserName,
                UserAltName = entity.UserAltName,
                StaffCode = entity.StaffCode,
                CardNo = entity.CardNo,
                InactiveUserAccount = entity.InactiveUserAccount,
                Enabled = entity.Enabled,
                EnableUserIdLogin = entity.EnableUserIdLogin,
                EnableCardNoLogin = entity.EnableCardNoLogin,
                EnableStaffCodeLogin = entity.EnableStaffCodeLogin,
                ModifiedDate = entity.ModifiedDate,
                ModifiedBy = entity.ModifiedBy
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while updating the user." });
        }
    }

    [HttpDelete("brand/{brandId:int}/users/{userId:int}/shop/{shopId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivateUser(int brandId, int userId, int shopId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var entity = await context.Users
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.UserId == userId && x.ShopId == shopId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "User not found." });

            entity.Enabled = false;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new { message = "User deactivated." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating user for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the user." });
        }
    }
}
