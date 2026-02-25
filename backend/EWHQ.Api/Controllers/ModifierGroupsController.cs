using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EWHQ.Api.Authorization;
using EWHQ.Api.Data;
using EWHQ.Api.DTOs;
using EWHQ.Api.Models.Entities;
using EWHQ.Api.Services;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/modifier-groups")]
[Authorize]
public class ModifierGroupsController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<ModifierGroupsController> _logger;

    public ModifierGroupsController(IPOSDbContextService posContextService, ILogger<ModifierGroupsController> logger)
    {
        _posContextService = posContextService;
        _logger = logger;
    }

    private string GetCurrentUserIdentifier()
    {
        const int maxLength = 50;
        var identifier = User?.FindFirst(ClaimTypes.Email)?.Value;

        if (string.IsNullOrWhiteSpace(identifier))
        {
            return "System";
        }

        identifier = identifier.Trim();
        return identifier.Length <= maxLength ? identifier : identifier[..maxLength];
    }

    [HttpGet("brand/{brandId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<ModifierGroupHeaderDto>>> GetModifierGroups(
        int brandId,
        [FromQuery] bool? isFollowSet = null)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var query = context.ModifierGroupHeaders
                .AsNoTracking()
                .Where(mg => mg.AccountId == accountId);

            if (isFollowSet.HasValue)
            {
                query = query.Where(mg => (mg.IsFollowSet ?? false) == isFollowSet.Value);
            }

            var groups = await query
                .OrderByDescending(mg => mg.Enabled)
                .ThenBy(mg => mg.GroupBatchName)
                .Select(mg => new ModifierGroupHeaderDto
                {
                    GroupHeaderId = mg.GroupHeaderId,
                    AccountId = mg.AccountId,
                    GroupBatchName = mg.GroupBatchName ?? string.Empty,
                    GroupBatchNameAlt = mg.GroupBatchNameAlt,
                    Enabled = mg.Enabled,
                    IsFollowSet = mg.IsFollowSet ?? false
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(groups);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching modifier groups for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching modifier groups" });
        }
    }

    [HttpPost("brand/{brandId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<ModifierGroupPropertiesDto>> CreateModifierGroup(int brandId, CreateModifierGroupDto createDto)
    {
        try
        {
            var groupName = createDto.GroupBatchName?.Trim();
            if (string.IsNullOrWhiteSpace(groupName))
            {
                return BadRequest(new { message = "Group name is required." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var normalizedName = groupName.ToUpperInvariant();
            var isFollowSet = createDto.IsFollowSet;
            var duplicateExists = await context.ModifierGroupHeaders
                .AsNoTracking()
                .AnyAsync(
                    h => h.AccountId == accountId
                         && h.Enabled
                         && (h.IsFollowSet ?? false) == isFollowSet
                         && (h.GroupBatchName ?? string.Empty).ToUpper() == normalizedName,
                    HttpContext.RequestAborted);

            if (duplicateExists)
            {
                return Conflict(new { message = "A modifier group with the same name already exists." });
            }

            var effectiveItems = (createDto.Items ?? Array.Empty<UpdateModifierGroupMemberDto>())
                .Where(item => item != null)
                .Select(item => new
                {
                    item.ItemId,
                    item.Enabled,
                    DisplayIndex = item.DisplayIndex > 0 ? item.DisplayIndex : int.MaxValue
                })
                .OrderBy(item => item.DisplayIndex)
                .ThenBy(item => item.ItemId)
                .Select((item, index) => new UpdateModifierGroupMemberDto
                {
                    ItemId = item.ItemId,
                    Enabled = item.Enabled,
                    DisplayIndex = index + 1
                })
                .ToList();

            if (effectiveItems.GroupBy(item => item.ItemId).Any(group => group.Count() > 1))
            {
                return BadRequest(new { message = "Duplicate items are not allowed in a modifier group." });
            }

            var requestedItemIds = effectiveItems.Select(item => item.ItemId).Distinct().ToList();
            if (requestedItemIds.Count > 0)
            {
                var validItemCount = await context.ItemMasters
                    .AsNoTracking()
                    .Where(i => i.AccountId == accountId && requestedItemIds.Contains(i.ItemId))
                    .CountAsync(HttpContext.RequestAborted);

                if (validItemCount != requestedItemIds.Count)
                {
                    return BadRequest(new { message = "One or more selected menu items are invalid for this brand." });
                }
            }

            var nextGroupHeaderId = (await context.ModifierGroupHeaders
                .Where(h => h.AccountId == accountId)
                .Select(h => (int?)h.GroupHeaderId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var header = new ModifierGroupHeader
            {
                GroupHeaderId = nextGroupHeaderId,
                AccountId = accountId,
                GroupBatchName = groupName,
                GroupBatchNameAlt = string.IsNullOrWhiteSpace(createDto.GroupBatchNameAlt) ? null : createDto.GroupBatchNameAlt.Trim(),
                MaxModifierSelectCount = 0,
                Enabled = createDto.Enabled,
                CreatedDate = now,
                CreatedBy = currentUser,
                ModifiedDate = now,
                ModifiedBy = currentUser,
                IsFollowSet = isFollowSet
            };

            context.ModifierGroupHeaders.Add(header);

            foreach (var item in effectiveItems)
            {
                context.ModifierGroupDetails.Add(new ModifierGroupDetail
                {
                    GroupHeaderId = nextGroupHeaderId,
                    AccountId = accountId,
                    ItemId = item.ItemId,
                    DisplayIndex = item.DisplayIndex,
                    Enabled = item.Enabled,
                    CreatedDate = now,
                    CreatedBy = currentUser,
                    ModifiedDate = now,
                    ModifiedBy = currentUser
                });
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var created = await BuildModifierGroupPropertiesAsync(context, accountId, nextGroupHeaderId, HttpContext.RequestAborted);
            if (created == null)
            {
                return StatusCode(500, new { message = "Modifier group was created but could not be loaded." });
            }

            return CreatedAtAction(nameof(GetModifierGroupProperties), new { brandId, groupHeaderId = nextGroupHeaderId }, created);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating modifier group for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the modifier group" });
        }
    }

    [HttpGet("brand/{brandId:int}/{groupHeaderId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<ModifierGroupPropertiesDto>> GetModifierGroupProperties(int brandId, int groupHeaderId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var properties = await BuildModifierGroupPropertiesAsync(context, accountId, groupHeaderId, HttpContext.RequestAborted);

            if (properties == null)
            {
                return NotFound(new { message = "Modifier group not found" });
            }

            return Ok(properties);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching modifier group properties for group {GroupHeaderId}", groupHeaderId);
            return StatusCode(500, new { message = "An error occurred while fetching the modifier group properties" });
        }
    }

    [HttpPut("brand/{brandId:int}/{groupHeaderId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<ModifierGroupPropertiesDto>> UpdateModifierGroupProperties(
        int brandId,
        int groupHeaderId,
        UpdateModifierGroupPropertiesDto updateDto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(updateDto.GroupBatchName))
            {
                return BadRequest(new { message = "Group name is required." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var header = await context.ModifierGroupHeaders
                .FirstOrDefaultAsync(
                    h => h.AccountId == accountId && h.GroupHeaderId == groupHeaderId,
                    HttpContext.RequestAborted);

            if (header == null)
            {
                return NotFound(new { message = "Modifier group not found" });
            }

            var effectiveItems = (updateDto.Items ?? Array.Empty<UpdateModifierGroupMemberDto>())
                .Where(item => item != null)
                .Select(item => new
                {
                    item.ItemId,
                    item.Enabled,
                    DisplayIndex = item.DisplayIndex > 0 ? item.DisplayIndex : int.MaxValue
                })
                .OrderBy(item => item.DisplayIndex)
                .ThenBy(item => item.ItemId)
                .Select((item, index) => new UpdateModifierGroupMemberDto
                {
                    ItemId = item.ItemId,
                    Enabled = item.Enabled,
                    DisplayIndex = index + 1
                })
                .ToList();

            if (effectiveItems.GroupBy(item => item.ItemId).Any(group => group.Count() > 1))
            {
                return BadRequest(new { message = "Duplicate items are not allowed in a modifier group." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            header.GroupBatchName = updateDto.GroupBatchName.Trim();
            header.GroupBatchNameAlt = string.IsNullOrWhiteSpace(updateDto.GroupBatchNameAlt)
                ? null
                : updateDto.GroupBatchNameAlt.Trim();
            header.Enabled = updateDto.Enabled;
            header.ModifiedDate = now;
            header.ModifiedBy = currentUser;

            var existingDetails = await context.ModifierGroupDetails
                .Where(d => d.AccountId == accountId && d.GroupHeaderId == groupHeaderId)
                .ToListAsync(HttpContext.RequestAborted);

            var existingMap = existingDetails.ToDictionary(detail => detail.ItemId);
            var requestedIds = effectiveItems.Select(item => item.ItemId).ToHashSet();

            foreach (var detail in existingDetails)
            {
                if (!requestedIds.Contains(detail.ItemId))
                {
                    context.ModifierGroupDetails.Remove(detail);
                }
            }

            foreach (var item in effectiveItems)
            {
                if (existingMap.TryGetValue(item.ItemId, out var detail))
                {
                    detail.DisplayIndex = item.DisplayIndex;
                    detail.Enabled = item.Enabled;
                    detail.ModifiedDate = now;
                    detail.ModifiedBy = currentUser;
                }
                else
                {
                    var newDetail = new ModifierGroupDetail
                    {
                        GroupHeaderId = groupHeaderId,
                        AccountId = accountId,
                        ItemId = item.ItemId,
                        DisplayIndex = item.DisplayIndex,
                        Enabled = item.Enabled,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    };

                    context.ModifierGroupDetails.Add(newDetail);
                }
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            // Re-load the group with the latest state to return to the caller
            var properties = await BuildModifierGroupPropertiesAsync(context, accountId, groupHeaderId, HttpContext.RequestAborted);
            if (properties == null)
            {
                return NotFound(new { message = "Modifier group not found after update." });
            }

            return Ok(properties);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating modifier group {GroupHeaderId}", groupHeaderId);
            return StatusCode(500, new { message = "An error occurred while updating the modifier group" });
        }
    }

    [HttpDelete("brand/{brandId:int}/{groupHeaderId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivateModifierGroup(int brandId, int groupHeaderId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var header = await context.ModifierGroupHeaders.FirstOrDefaultAsync(
                h => h.AccountId == accountId && h.GroupHeaderId == groupHeaderId,
                HttpContext.RequestAborted);

            if (header == null)
            {
                return NotFound(new { message = "Modifier group not found" });
            }

            if (header.Enabled)
            {
                header.Enabled = false;
                header.ModifiedDate = DateTime.UtcNow;
                header.ModifiedBy = GetCurrentUserIdentifier();
                await context.SaveChangesAsync(HttpContext.RequestAborted);
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating modifier group {GroupHeaderId}", groupHeaderId);
            return StatusCode(500, new { message = "An error occurred while deactivating the modifier group" });
        }
    }

    private async Task<ModifierGroupPropertiesDto?> BuildModifierGroupPropertiesAsync(
        EWHQDbContext context,
        int accountId,
        int groupHeaderId,
        CancellationToken cancellationToken)
    {
        var header = await context.ModifierGroupHeaders
            .AsNoTracking()
            .FirstOrDefaultAsync(
                h => h.AccountId == accountId && h.GroupHeaderId == groupHeaderId,
                cancellationToken);

        if (header == null)
        {
            return null;
        }

        var details = await context.ModifierGroupDetails
            .AsNoTracking()
            .Where(d => d.AccountId == accountId && d.GroupHeaderId == groupHeaderId)
            .OrderBy(d => d.DisplayIndex)
            .ThenBy(d => d.ItemId)
            .ToListAsync(cancellationToken);

        var itemCache = new Dictionary<int, MenuItemSummaryDto>();
        var items = new List<ModifierGroupMemberDto>();

        foreach (var detail in details)
        {
            var summary = await GetMenuItemSummaryAsync(context, accountId, detail.ItemId, itemCache, cancellationToken);
            if (summary == null)
            {
                continue;
            }

            items.Add(new ModifierGroupMemberDto
            {
                ItemId = detail.ItemId,
                DisplayIndex = detail.DisplayIndex,
                Enabled = detail.Enabled,
                Item = summary
            });
        }

        return new ModifierGroupPropertiesDto
        {
            GroupHeaderId = header.GroupHeaderId,
            AccountId = header.AccountId,
            GroupBatchName = header.GroupBatchName ?? string.Empty,
            GroupBatchNameAlt = header.GroupBatchNameAlt,
            Enabled = header.Enabled,
            IsFollowSet = header.IsFollowSet ?? false,
            ModifiedDate = header.ModifiedDate,
            ModifiedBy = header.ModifiedBy,
            Items = items
        };
    }

    private static async Task<MenuItemSummaryDto?> GetMenuItemSummaryAsync(
        EWHQDbContext context,
        int accountId,
        int itemId,
        Dictionary<int, MenuItemSummaryDto> cache,
        CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(itemId, out var cached))
        {
            return cached;
        }

        var summary = await context.ItemMasters
            .AsNoTracking()
            .Where(i => i.AccountId == accountId && i.ItemId == itemId)
            .Select(i => new MenuItemSummaryDto
            {
                ItemId = i.ItemId,
                AccountId = i.AccountId,
                CategoryId = i.CategoryId,
                DepartmentId = i.DepartmentId,
                ItemCode = i.ItemCode,
                ItemName = i.ItemName,
                ItemNameAlt = i.ItemNameAlt,
                Enabled = i.Enabled,
                IsItemShow = i.IsItemShow,
                IsPriceShow = i.IsPriceShow,
                HasModifier = i.HasModifier,
                IsModifier = i.IsModifier,
                IsPromoItem = i.IsPromoItem,
                IsManualPrice = i.IsManualPrice,
                IsManualName = i.IsManualName,
                DisplayIndex = i.DisplayIndex,
                ItemPublicDisplayName = i.ItemPublicDisplayName,
                ImageFileName = i.ImageFileName,
                ModifiedDate = i.ModifiedDate,
                ModifiedBy = i.ModifiedBy
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (summary != null)
        {
            cache[itemId] = summary;
        }

        return summary;
    }
}
