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

    private static bool ResolveDisplayFlag(bool? value) => value ?? true;

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

            var hasCopySource = createDto.CopyByGroupHeaderId.HasValue && createDto.CopyByGroupHeaderId.Value > 0;
            if (hasCopySource && effectiveItems.Count > 0)
            {
                return BadRequest(new { message = "Cannot provide both items and copyByGroupHeaderId in the same request." });
            }

            var maxModifierSelectCount = Math.Max(createDto.MaxModifierSelectCount ?? 0, 0);
            var minModifierSelectCount = Math.Max(createDto.MinModifierSelectCount ?? 0, 0);
            if (maxModifierSelectCount > 0 && minModifierSelectCount > maxModifierSelectCount)
            {
                return BadRequest(new { message = "Min modifier select count cannot be greater than max modifier select count." });
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
                MaxModifierSelectCount = maxModifierSelectCount,
                MinModifierSelectCount = minModifierSelectCount,
                Enabled = createDto.Enabled,
                CreatedDate = now,
                CreatedBy = currentUser,
                ModifiedDate = now,
                ModifiedBy = currentUser,
                IsFollowSet = isFollowSet,
                IsOdoDisplay = ResolveDisplayFlag(createDto.IsOdoDisplay),
                IsKioskDisplay = ResolveDisplayFlag(createDto.IsKioskDisplay),
                IsTableOrderingDisplay = ResolveDisplayFlag(createDto.IsTableOrderingDisplay),
                IsPosDisplay = ResolveDisplayFlag(createDto.IsPosDisplay),
                IsSelfOrderingDisplay = ResolveDisplayFlag(createDto.IsSelfOrderingDisplay)
            };

            context.ModifierGroupHeaders.Add(header);

            if (hasCopySource)
            {
                var sourceGroupHeaderId = createDto.CopyByGroupHeaderId!.Value;
                var sourceExists = await context.ModifierGroupHeaders
                    .AsNoTracking()
                    .AnyAsync(
                        h => h.AccountId == accountId
                             && h.GroupHeaderId == sourceGroupHeaderId
                             && (h.IsFollowSet ?? false) == isFollowSet,
                        HttpContext.RequestAborted);

                if (!sourceExists)
                {
                    return BadRequest(new { message = "Copy source group not found or not compatible with this group type." });
                }

                var sourceDetails = await context.ModifierGroupDetails
                    .AsNoTracking()
                    .Where(d => d.AccountId == accountId && d.GroupHeaderId == sourceGroupHeaderId)
                    .ToListAsync(HttpContext.RequestAborted);

                foreach (var sourceDetail in sourceDetails)
                {
                    context.ModifierGroupDetails.Add(new ModifierGroupDetail
                    {
                        GroupHeaderId = nextGroupHeaderId,
                        AccountId = accountId,
                        ItemId = sourceDetail.ItemId,
                        DisplayIndex = sourceDetail.DisplayIndex,
                        Enabled = sourceDetail.Enabled,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    });
                }

                var sourceShopDetails = await context.ModifierGroupShopDetails
                    .AsNoTracking()
                    .Where(sd => sd.AccountId == accountId && sd.GroupHeaderId == sourceGroupHeaderId)
                    .ToListAsync(HttpContext.RequestAborted);

                foreach (var sourceShopDetail in sourceShopDetails)
                {
                    context.ModifierGroupShopDetails.Add(new ModifierGroupShopDetail
                    {
                        GroupHeaderId = nextGroupHeaderId,
                        AccountId = accountId,
                        ShopId = sourceShopDetail.ShopId,
                        ItemId = sourceShopDetail.ItemId,
                        Price = sourceShopDetail.Price,
                        Enabled = sourceShopDetail.Enabled,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    });
                }
            }
            else
            {
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

            var maxModifierSelectCount = updateDto.MaxModifierSelectCount.HasValue
                ? Math.Max(updateDto.MaxModifierSelectCount.Value, 0)
                : header.MaxModifierSelectCount;
            var minModifierSelectCount = updateDto.MinModifierSelectCount.HasValue
                ? Math.Max(updateDto.MinModifierSelectCount.Value, 0)
                : (header.MinModifierSelectCount ?? 0);

            if (maxModifierSelectCount > 0 && minModifierSelectCount > maxModifierSelectCount)
            {
                return BadRequest(new { message = "Min modifier select count cannot be greater than max modifier select count." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            header.GroupBatchName = updateDto.GroupBatchName.Trim();
            header.GroupBatchNameAlt = string.IsNullOrWhiteSpace(updateDto.GroupBatchNameAlt)
                ? null
                : updateDto.GroupBatchNameAlt.Trim();
            header.Enabled = updateDto.Enabled;
            header.MaxModifierSelectCount = maxModifierSelectCount;
            header.MinModifierSelectCount = minModifierSelectCount;
            header.IsOdoDisplay = updateDto.IsOdoDisplay ?? header.IsOdoDisplay ?? true;
            header.IsKioskDisplay = updateDto.IsKioskDisplay ?? header.IsKioskDisplay ?? true;
            header.IsTableOrderingDisplay = updateDto.IsTableOrderingDisplay ?? header.IsTableOrderingDisplay ?? true;
            header.IsPosDisplay = updateDto.IsPosDisplay ?? header.IsPosDisplay ?? true;
            header.IsSelfOrderingDisplay = updateDto.IsSelfOrderingDisplay ?? header.IsSelfOrderingDisplay ?? true;
            header.ModifiedDate = now;
            header.ModifiedBy = currentUser;

            var existingDetails = await context.ModifierGroupDetails
                .Where(d => d.AccountId == accountId && d.GroupHeaderId == groupHeaderId)
                .ToListAsync(HttpContext.RequestAborted);

            var existingMap = existingDetails.ToDictionary(detail => detail.ItemId);
            var requestedIds = effectiveItems.Select(item => item.ItemId).ToHashSet();
            var removedItemIds = existingDetails
                .Where(detail => !requestedIds.Contains(detail.ItemId))
                .Select(detail => detail.ItemId)
                .ToHashSet();

            foreach (var detail in existingDetails)
            {
                if (removedItemIds.Contains(detail.ItemId))
                {
                    context.ModifierGroupDetails.Remove(detail);
                }
            }

            if (removedItemIds.Count > 0)
            {
                var staleShopOverrides = await context.ModifierGroupShopDetails
                    .Where(
                        row => row.AccountId == accountId
                               && row.GroupHeaderId == groupHeaderId
                               && removedItemIds.Contains(row.ItemId))
                    .ToListAsync(HttpContext.RequestAborted);

                if (staleShopOverrides.Count > 0)
                {
                    context.ModifierGroupShopDetails.RemoveRange(staleShopOverrides);
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

                if (header.IsFollowSet ?? false)
                {
                    var now = DateTime.UtcNow;
                    var currentUser = GetCurrentUserIdentifier();
                    var linkedItemSets = await context.ItemSets
                        .Where(
                            set => set.AccountId == accountId
                                   && set.GroupHeaderId == groupHeaderId
                                   && set.Enabled)
                        .ToListAsync(HttpContext.RequestAborted);

                    foreach (var itemSet in linkedItemSets)
                    {
                        itemSet.Enabled = false;
                        itemSet.ModifiedDate = now;
                        itemSet.ModifiedBy = currentUser;
                    }
                }

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

    [HttpGet("brand/{brandId:int}/{groupHeaderId:int}/item/{itemId:int}/shop-pricing")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<ModifierGroupShopPricingDto>>> GetModifierGroupShopPricing(
        int brandId,
        int groupHeaderId,
        int itemId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var exists = await context.ModifierGroupHeaders
                .AsNoTracking()
                .AnyAsync(
                    h => h.AccountId == accountId && h.GroupHeaderId == groupHeaderId,
                    HttpContext.RequestAborted);

            if (!exists)
            {
                return NotFound(new { message = "Modifier group not found" });
            }

            var response = await BuildShopPricingDtosAsync(context, accountId, groupHeaderId, itemId, HttpContext.RequestAborted);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching shop pricing for modifier group {GroupHeaderId} and item {ItemId}", groupHeaderId, itemId);
            return StatusCode(500, new { message = "An error occurred while fetching modifier group shop pricing." });
        }
    }

    [HttpPut("brand/{brandId:int}/{groupHeaderId:int}/item/{itemId:int}/shop-pricing")]
    [RequireBrandModify]
    public async Task<ActionResult<IReadOnlyList<ModifierGroupShopPricingDto>>> UpdateModifierGroupShopPricing(
        int brandId,
        int groupHeaderId,
        int itemId,
        UpdateModifierGroupShopPricingDto updateDto)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var exists = await context.ModifierGroupHeaders
                .AsNoTracking()
                .AnyAsync(
                    h => h.AccountId == accountId && h.GroupHeaderId == groupHeaderId,
                    HttpContext.RequestAborted);

            if (!exists)
            {
                return NotFound(new { message = "Modifier group not found" });
            }

            var entries = (updateDto.Entries ?? Array.Empty<UpdateModifierGroupShopPricingEntryDto>())
                .Where(entry => entry != null)
                .ToList();

            if (entries.Count == 0)
            {
                return BadRequest(new { message = "At least one shop pricing entry is required." });
            }

            if (entries.GroupBy(entry => entry.ShopId).Any(group => group.Count() > 1))
            {
                return BadRequest(new { message = "Duplicate shop IDs are not allowed." });
            }

            var shopIds = entries.Select(entry => entry.ShopId).Distinct().ToList();
            var validShopCount = await context.Shops
                .AsNoTracking()
                .CountAsync(
                    shop => shop.AccountId == accountId && shop.Enabled && shopIds.Contains(shop.ShopId),
                    HttpContext.RequestAborted);

            if (validShopCount != shopIds.Count)
            {
                return BadRequest(new { message = "One or more shops are invalid for this brand." });
            }

            var existingRows = await context.ModifierGroupShopDetails
                .Where(
                    row => row.AccountId == accountId
                           && row.GroupHeaderId == groupHeaderId
                           && row.ItemId == itemId
                           && shopIds.Contains(row.ShopId))
                .ToListAsync(HttpContext.RequestAborted);

            var existingMap = existingRows.ToDictionary(row => row.ShopId);
            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            foreach (var entry in entries)
            {
                if (existingMap.TryGetValue(entry.ShopId, out var row))
                {
                    row.Enabled = entry.Price.HasValue;
                    row.Price = entry.Price ?? row.Price;
                    row.ModifiedDate = now;
                    row.ModifiedBy = currentUser;
                }
                else
                {
                    context.ModifierGroupShopDetails.Add(new ModifierGroupShopDetail
                    {
                        AccountId = accountId,
                        GroupHeaderId = groupHeaderId,
                        ItemId = itemId,
                        ShopId = entry.ShopId,
                        Price = entry.Price ?? 0m,
                        Enabled = entry.Price.HasValue,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    });
                }
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var response = await BuildShopPricingDtosAsync(context, accountId, groupHeaderId, itemId, HttpContext.RequestAborted);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating shop pricing for modifier group {GroupHeaderId} and item {ItemId}", groupHeaderId, itemId);
            return StatusCode(500, new { message = "An error occurred while updating modifier group shop pricing." });
        }
    }

    private static async Task<IReadOnlyList<ModifierGroupShopPricingDto>> BuildShopPricingDtosAsync(
        EWHQDbContext context,
        int accountId,
        int groupHeaderId,
        int itemId,
        CancellationToken cancellationToken)
    {
        var shopPrices = await context.ItemShopDetails
            .AsNoTracking()
            .Where(detail => detail.AccountId == accountId && detail.ItemId == itemId && (detail.Enabled ?? true))
            .Join(
                context.Shops.AsNoTracking().Where(shop => shop.AccountId == accountId && shop.Enabled),
                detail => new { detail.AccountId, detail.ShopId },
                shop => new { shop.AccountId, shop.ShopId },
                (detail, shop) => new
                {
                    shop.ShopId,
                    shop.Name,
                    detail.Price
                })
            .OrderBy(row => row.Name)
            .ToListAsync(cancellationToken);

        var overrides = await context.ModifierGroupShopDetails
            .AsNoTracking()
            .Where(
                row => row.AccountId == accountId
                       && row.GroupHeaderId == groupHeaderId
                       && row.ItemId == itemId)
            .ToListAsync(cancellationToken);

        var overrideMap = overrides.ToDictionary(row => row.ShopId);

        return shopPrices
            .Select(price =>
            {
                overrideMap.TryGetValue(price.ShopId, out var overrideValue);
                var isEnabled = overrideValue?.Enabled ?? false;
                return new ModifierGroupShopPricingDto
                {
                    ShopId = price.ShopId,
                    ShopName = price.Name,
                    ItemId = itemId,
                    OriginalPrice = price.Price,
                    Price = isEnabled ? overrideValue?.Price : null,
                    Enabled = isEnabled
                };
            })
            .ToList();
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
            .Where(d => d.AccountId == accountId && d.GroupHeaderId == groupHeaderId && d.Enabled)
            .Join(
                context.ItemMasters.AsNoTracking().Where(i => i.AccountId == accountId && i.Enabled),
                detail => new { detail.AccountId, detail.ItemId },
                item => new { item.AccountId, item.ItemId },
                (detail, _) => detail)
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
            MaxModifierSelectCount = header.MaxModifierSelectCount,
            MinModifierSelectCount = header.MinModifierSelectCount ?? 0,
            IsOdoDisplay = header.IsOdoDisplay ?? true,
            IsKioskDisplay = header.IsKioskDisplay ?? true,
            IsTableOrderingDisplay = header.IsTableOrderingDisplay ?? true,
            IsPosDisplay = header.IsPosDisplay ?? true,
            IsSelfOrderingDisplay = header.IsSelfOrderingDisplay ?? true,
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
