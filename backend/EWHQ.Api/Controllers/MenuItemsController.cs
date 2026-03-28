using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
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
[Route("api/menu-items")]
[Authorize]
public class MenuItemsController : ControllerBase
{
    private const int MaxPageSize = 200;
    private const string NewModifierModeLinkType = "NEW_MODIFIER_MODE";
    private const int MaxRelationshipDepth = 6;

    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<MenuItemsController> _logger;

    public MenuItemsController(
        IPOSDbContextService posContextService,
        ILogger<MenuItemsController> logger)
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
        return identifier.Length <= maxLength ? identifier : identifier.Substring(0, maxLength);
    }

    [HttpGet("brand/{brandId}/{itemId}/modifiers")]
    [RequireBrandView]
    public async Task<ActionResult<ItemModifierMappingsDto>> GetItemModifierMappings(int brandId, int itemId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var itemExists = await context.ItemMasters
                .AsNoTracking()
                .AnyAsync(i => i.AccountId == accountId && i.ItemId == itemId, HttpContext.RequestAborted);

            if (!itemExists)
            {
                return NotFound(new { message = "Menu item not found" });
            }

            var response = await FetchModifierMappingsAsync(context, accountId, itemId, HttpContext.RequestAborted);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching modifier mappings for item {ItemId}", itemId);
            return StatusCode(500, new { message = "An error occurred while fetching modifier mappings" });
        }
    }

    [HttpGet("brand/{brandId}/{itemId}/relationships")]
    [RequireBrandView]
    public async Task<ActionResult<ItemRelationshipTreeDto>> GetItemRelationships(int brandId, int itemId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var itemExists = await context.ItemMasters
                .AsNoTracking()
                .AnyAsync(i => i.AccountId == accountId && i.ItemId == itemId, HttpContext.RequestAborted);

            if (!itemExists)
            {
                return NotFound(new { message = "Menu item not found" });
            }

            var root = await BuildItemRelationshipNodeAsync(
                context,
                accountId,
                itemId,
                new HashSet<int>(),
                new Dictionary<int, MenuItemSummaryDto>(),
                new Dictionary<int, ModifierGroupHeaderDto>(),
                HttpContext.RequestAborted);

            if (root == null)
            {
                return NotFound(new { message = "Unable to build the relationship graph for this item." });
            }

            return Ok(new ItemRelationshipTreeDto { Root = root });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching item relationships for item {ItemId}", itemId);
            return StatusCode(500, new { message = "An error occurred while fetching item relationships" });
        }
    }

    [HttpPut("brand/{brandId}/{itemId}/modifiers")]
    [RequireBrandModify]
    public async Task<ActionResult<ItemModifierMappingsDto>> UpdateItemModifierMappings(int brandId, int itemId, UpdateItemModifierMappingsDto updateDto)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var item = await context.ItemMasters.FirstOrDefaultAsync(i => i.AccountId == accountId && i.ItemId == itemId);
            if (item == null)
            {
                return NotFound(new { message = "Menu item not found" });
            }

            var currentUser = GetCurrentUserIdentifier();
            var now = DateTime.UtcNow;

            try
            {
                await ApplyModifierMappingsAsync(
                    context,
                    accountId,
                    item,
                    updateDto.InStore ?? Array.Empty<ItemModifierMappingUpsertDto>(),
                    updateDto.Online ?? Array.Empty<ItemModifierMappingUpsertDto>(),
                    currentUser,
                    now,
                    HttpContext.RequestAborted);
            }
            catch (InvalidOperationException dupEx)
            {
                return BadRequest(new { message = dupEx.Message });
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var response = await FetchModifierMappingsAsync(context, accountId, itemId, HttpContext.RequestAborted);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating modifier mappings for item {ItemId}", itemId);
            return StatusCode(500, new { message = "An error occurred while updating modifier mappings" });
        }
    }

    [HttpPut("brand/{brandId}/{itemId}/relationships")]
    [RequireBrandModify]
    public async Task<ActionResult<ItemRelationshipTreeDto>> UpdateItemRelationships(int brandId, int itemId, UpdateItemRelationshipTreeDto updateDto)
    {
        if (updateDto?.Root == null)
        {
            return BadRequest(new { message = "A valid relationship payload is required." });
        }

        if (updateDto.Root.ItemId != itemId)
        {
            return BadRequest(new { message = "Root item identifier does not match the requested item." });
        }

        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var currentUser = GetCurrentUserIdentifier();
            var now = DateTime.UtcNow;
            var processedItems = new HashSet<int>();

            try
            {
                await ApplyItemRelationshipNodeUpdatesAsync(
                    context,
                    accountId,
                    updateDto.Root,
                    processedItems,
                    currentUser,
                    now,
                    HttpContext.RequestAborted);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var root = await BuildItemRelationshipNodeAsync(
                context,
                accountId,
                itemId,
                new HashSet<int>(),
                new Dictionary<int, MenuItemSummaryDto>(),
                new Dictionary<int, ModifierGroupHeaderDto>(),
                HttpContext.RequestAborted);

            if (root == null)
            {
                return NotFound(new { message = "Menu item not found" });
            }

            return Ok(new ItemRelationshipTreeDto { Root = root });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item relationships for item {ItemId}", itemId);
            return StatusCode(500, new { message = "An error occurred while updating item relationships" });
        }
    }

    [HttpGet("brand/{brandId}/modifier-groups/{groupHeaderId}/preview")]
    [RequireBrandView]
    public async Task<ActionResult<ModifierGroupPreviewDto>> GetModifierGroupPreview(int brandId, int groupHeaderId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var group = await context.ModifierGroupHeaders
                .AsNoTracking()
                .FirstOrDefaultAsync(mg => mg.AccountId == accountId && mg.GroupHeaderId == groupHeaderId);

            if (group == null)
            {
                return NotFound(new { message = "Modifier group not found" });
            }

            var items = await context.ModifierGroupDetails
                .AsNoTracking()
                .Where(detail => detail.AccountId == accountId && detail.GroupHeaderId == groupHeaderId)
                .OrderBy(detail => detail.DisplayIndex)
                .Take(25)
                .Join(
                    context.ItemMasters.AsNoTracking(),
                    detail => new { detail.ItemId, detail.AccountId },
                    item => new { item.ItemId, item.AccountId },
                    (detail, item) => new ModifierGroupPreviewItemDto
                    {
                        ItemId = item.ItemId,
                        ItemCode = item.ItemCode,
                        ItemName = item.ItemName ?? item.ItemPosName ?? item.ItemPublicDisplayName,
                        Enabled = item.Enabled,
                        DisplayIndex = detail.DisplayIndex
                    })
                .ToListAsync();

            var response = new ModifierGroupPreviewDto
            {
                GroupHeaderId = group.GroupHeaderId,
                GroupBatchName = group.GroupBatchName ?? string.Empty,
                Items = items
            };

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching modifier group preview for group {GroupHeaderId}", groupHeaderId);
            return StatusCode(500, new { message = "An error occurred while fetching modifier group preview" });
        }
    }

    private async Task<ItemModifierMappingsDto> FetchModifierMappingsAsync(
        EWHQDbContext context,
        int accountId,
        int itemId,
        CancellationToken cancellationToken)
    {
        var mappings = await context.ItemModifierGroupMappings
            .AsNoTracking()
            .Where(m => m.AccountId == accountId && m.ItemId == itemId)
            .OrderBy(m => m.Seq)
            .Select(m => new ItemModifierMappingDto
            {
                GroupHeaderId = m.GroupHeaderId,
                Sequence = m.Seq,
                ModifierLinkType = string.IsNullOrWhiteSpace(m.ModifierLinkType) ? null : m.ModifierLinkType
            })
            .ToListAsync(cancellationToken);

        return new ItemModifierMappingsDto
        {
            InStore = mappings
                .Where(m => string.Equals(m.ModifierLinkType, NewModifierModeLinkType, StringComparison.OrdinalIgnoreCase))
                .ToList(),
            Online = mappings
                .Where(m => string.IsNullOrWhiteSpace(m.ModifierLinkType))
                .ToList()
        };
    }

    private async Task ApplyModifierMappingsAsync(
        EWHQDbContext context,
        int accountId,
        ItemMaster item,
        IEnumerable<ItemModifierMappingUpsertDto> inStoreSource,
        IEnumerable<ItemModifierMappingUpsertDto> onlineSource,
        string currentUser,
        DateTime now,
        CancellationToken cancellationToken)
    {
        static List<(int GroupHeaderId, int Sequence)> NormalizeMappings(IEnumerable<ItemModifierMappingUpsertDto> source, string contextName)
        {
            var items = source
                .Where(m => m != null)
                .Select((m, index) => new
                {
                    m.GroupHeaderId,
                    ProvidedSequence = m.Sequence,
                    Index = index
                })
                .ToList();

            if (items.GroupBy(x => x.GroupHeaderId).Any(g => g.Count() > 1))
            {
                throw new InvalidOperationException($"Duplicate modifier groups detected in the {contextName} list.");
            }

            return items
                .OrderBy(x => x.ProvidedSequence > 0 ? x.ProvidedSequence : int.MaxValue)
                .ThenBy(x => x.Index)
                .Select((x, position) => (x.GroupHeaderId, position + 1))
                .ToList();
        }

        var inStore = NormalizeMappings(inStoreSource ?? Array.Empty<ItemModifierMappingUpsertDto>(), "in-store");
        var online = NormalizeMappings(onlineSource ?? Array.Empty<ItemModifierMappingUpsertDto>(), "online");

        var allGroupIds = inStore.Select(x => x.GroupHeaderId).Concat(online.Select(x => x.GroupHeaderId)).Distinct().ToList();
        if (allGroupIds.Count > 0)
        {
            var validGroupIds = await context.ModifierGroupHeaders
                .AsNoTracking()
                .Where(g => g.AccountId == accountId && allGroupIds.Contains(g.GroupHeaderId))
                .Select(g => g.GroupHeaderId)
                .ToListAsync(cancellationToken);

            var invalid = allGroupIds.Except(validGroupIds).ToList();
            if (invalid.Count > 0)
            {
                throw new InvalidOperationException("One or more modifier groups are invalid for this brand.");
            }
        }

        var existing = await context.ItemModifierGroupMappings
            .Where(m => m.AccountId == accountId && m.ItemId == item.ItemId)
            .ToListAsync(cancellationToken);

        void ApplyMappings(IEnumerable<(int GroupHeaderId, int Sequence)> mappings, string? linkType)
        {
            var desired = mappings.ToDictionary(x => x.GroupHeaderId, x => x.Sequence);

            var matches = existing
                .Where(m => LinkTypeEquals(m.ModifierLinkType, linkType))
                .ToList();

            foreach (var obsolete in matches.Where(m => !desired.ContainsKey(m.GroupHeaderId)).ToList())
            {
                context.ItemModifierGroupMappings.Remove(obsolete);
                existing.Remove(obsolete);
                matches.Remove(obsolete);
            }

            foreach (var kvp in desired)
            {
                var current = matches.FirstOrDefault(m => m.GroupHeaderId == kvp.Key);
                if (current == null)
                {
                    var newMapping = new ItemModifierGroupMapping
                    {
                        AccountId = accountId,
                        ItemId = item.ItemId,
                        GroupHeaderId = kvp.Key,
                        Seq = kvp.Value,
                        ModifierLinkType = linkType,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    };

                    context.ItemModifierGroupMappings.Add(newMapping);
                    existing.Add(newMapping);
                    matches.Add(newMapping);
                }
                else
                {
                    current.Seq = kvp.Value;
                    current.ModifiedDate = now;
                    current.ModifiedBy = currentUser;
                    current.ModifierLinkType = linkType;
                }
            }
        }

        ApplyMappings(inStore, NewModifierModeLinkType);
        ApplyMappings(online, null);

        var hasMappings = inStore.Count > 0 || online.Count > 0;
        item.HasModifier = hasMappings;
        item.ModifierGroupHeaderId = null;
        item.ModifiedDate = now;
        item.ModifiedBy = currentUser;
    }

    private async Task<MenuItemSummaryDto?> GetMenuItemSummaryAsync(
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
                ItemPosName = i.ItemPosName,
                ItemPosNameAlt = i.ItemPosNameAlt,
                Enabled = i.Enabled,
                IsItemShow = i.IsItemShow,
                IsPriceShow = i.IsPriceShow,
                HasModifier = i.HasModifier,
                IsModifier = i.IsModifier,
                IsFollowSet = i.IsFollowSet,
                IsFollowSetDynamic = i.IsFollowSetDynamic,
                IsFollowSetStandard = i.IsFollowSetStandard,
                IsPromoItem = i.IsPromoItem,
                IsManualPrice = i.IsManualPrice,
                IsManualName = i.IsManualName,
                IsNonDiscountItem = i.IsNonDiscountItem,
                IsNonServiceChargeItem = i.IsNonServiceChargeItem,
                IsPointPaidItem = i.IsPointPaidItem,
                IsNoPointEarnItem = i.IsNoPointEarnItem,
                IsNonTaxableItem = i.IsNonTaxableItem,
                IsComboRequired = i.IsComboRequired,
                ButtonStyleId = i.ButtonStyleId,
                DisplayIndex = i.DisplayIndex,
                ItemPublicDisplayName = i.ItemPublicDisplayName,
                ItemPublicDisplayNameAlt = i.ItemPublicDisplayNameAlt,
                ItemPublicPrintedName = i.ItemPublicPrintedName,
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

    private async Task<ModifierGroupHeaderDto?> GetModifierGroupHeaderAsync(
        EWHQDbContext context,
        int accountId,
        int groupHeaderId,
        Dictionary<int, ModifierGroupHeaderDto> cache,
        CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(groupHeaderId, out var cached))
        {
            return cached;
        }

        var group = await context.ModifierGroupHeaders
            .AsNoTracking()
            .Where(g => g.AccountId == accountId && g.GroupHeaderId == groupHeaderId)
            .Select(g => new ModifierGroupHeaderDto
            {
                GroupHeaderId = g.GroupHeaderId,
                AccountId = g.AccountId,
                GroupBatchName = g.GroupBatchName ?? string.Empty,
                GroupBatchNameAlt = g.GroupBatchNameAlt,
                Enabled = g.Enabled,
                IsFollowSet = g.IsFollowSet ?? false
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (group != null)
        {
            cache[groupHeaderId] = group;
        }

        return group;
    }

    private async Task<List<ItemRelationshipModifierNodeDto>> BuildModifierNodesAsync(
        IEnumerable<ItemModifierMappingDto> mappings,
        EWHQDbContext context,
        int accountId,
        Dictionary<int, ModifierGroupHeaderDto> groupCache,
        CancellationToken cancellationToken)
    {
        var list = new List<ItemRelationshipModifierNodeDto>();

        foreach (var mapping in mappings.OrderBy(m => m.Sequence))
        {
            var group = await GetModifierGroupHeaderAsync(context, accountId, mapping.GroupHeaderId, groupCache, cancellationToken);
            if (group == null)
            {
                continue;
            }

            list.Add(new ItemRelationshipModifierNodeDto
            {
                GroupHeaderId = mapping.GroupHeaderId,
                Sequence = mapping.Sequence,
                LinkType = mapping.ModifierLinkType,
                Group = group
            });
        }

        return list;
    }

    private async Task<ItemRelationshipItemNodeDto?> BuildItemRelationshipNodeAsync(
        EWHQDbContext context,
        int accountId,
        int itemId,
        HashSet<int> recursionStack,
        Dictionary<int, MenuItemSummaryDto> itemCache,
        Dictionary<int, ModifierGroupHeaderDto> groupCache,
        CancellationToken cancellationToken,
        int depth = 0)
    {
        if (depth > MaxRelationshipDepth)
        {
            return null;
        }

        if (recursionStack.Contains(itemId))
        {
            var summaryCycle = await GetMenuItemSummaryAsync(context, accountId, itemId, itemCache, cancellationToken);
            if (summaryCycle == null)
            {
                return null;
            }

            return new ItemRelationshipItemNodeDto
            {
                Item = summaryCycle,
                InStore = new ItemRelationshipContextDto(),
                Online = new ItemRelationshipContextDto()
            };
        }

        var summary = await GetMenuItemSummaryAsync(context, accountId, itemId, itemCache, cancellationToken);
        if (summary == null)
        {
            return null;
        }

        recursionStack.Add(itemId);

        try
        {
            var node = new ItemRelationshipItemNodeDto
            {
                Item = summary
            };

            var mappings = await FetchModifierMappingsAsync(context, accountId, itemId, cancellationToken);
            var inStoreModifiers = await BuildModifierNodesAsync(mappings.InStore, context, accountId, groupCache, cancellationToken);
            var onlineModifiers = await BuildModifierNodesAsync(mappings.Online, context, accountId, groupCache, cancellationToken);

            var itemSets = await context.ItemSets
                .AsNoTracking()
                .Where(s => s.AccountId == accountId && s.ItemId == itemId && s.Enabled)
                .OrderBy(s => s.Seq ?? int.MaxValue)
                .ThenBy(s => s.ItemSetId)
                .ToListAsync(cancellationToken);

            var inStoreSets = new List<ItemRelationshipSetNodeDto>();
            var onlineSets = new List<ItemRelationshipSetNodeDto>();

            foreach (var itemSet in itemSets)
            {
                if (!itemSet.GroupHeaderId.HasValue)
                {
                    continue;
                }

                var group = await GetModifierGroupHeaderAsync(context, accountId, itemSet.GroupHeaderId.Value, groupCache, cancellationToken);
                if (group == null)
                {
                    continue;
                }

                var details = await context.ModifierGroupDetails
                    .AsNoTracking()
                    .Where(d => d.AccountId == accountId && d.GroupHeaderId == itemSet.GroupHeaderId.Value && d.Enabled)
                    .Join(
                        context.ItemMasters
                            .AsNoTracking()
                            .Where(
                                i => i.AccountId == accountId
                                     && i.Enabled
                                     && (i.IsFollowSet || (i.IsStandaloneAndSetItem ?? false))),
                        detail => new { detail.AccountId, detail.ItemId },
                        item => new { item.AccountId, item.ItemId },
                        (detail, _) => detail)
                    .OrderBy(d => d.DisplayIndex)
                    .ToListAsync(cancellationToken);

                var children = new List<ItemRelationshipItemNodeDto>();
                foreach (var detail in details)
                {
                    var childNode = await BuildItemRelationshipNodeAsync(
                        context,
                        accountId,
                        detail.ItemId,
                        recursionStack,
                        itemCache,
                        groupCache,
                        cancellationToken,
                        depth + 1);

                    if (childNode != null)
                    {
                        children.Add(childNode);
                    }
                }

                var linkType = string.IsNullOrWhiteSpace(itemSet.LinkType) ? null : itemSet.LinkType;
                var fallbackSequence = LinkTypeEquals(linkType, NewModifierModeLinkType)
                    ? inStoreSets.Count + 1
                    : onlineSets.Count + 1;

                var setNode = new ItemRelationshipSetNodeDto
                {
                    ItemSetId = itemSet.ItemSetId,
                    GroupHeaderId = itemSet.GroupHeaderId.Value,
                    Sequence = itemSet.Seq ?? fallbackSequence,
                    LinkType = linkType,
                    Group = group,
                    Children = children
                };

                if (LinkTypeEquals(linkType, NewModifierModeLinkType))
                {
                    inStoreSets.Add(setNode);
                }
                else
                {
                    onlineSets.Add(setNode);
                }
            }

            node.InStore = new ItemRelationshipContextDto
            {
                Modifiers = inStoreModifiers,
                ItemSets = inStoreSets.OrderBy(s => s.Sequence).ToList()
            };

            node.Online = new ItemRelationshipContextDto
            {
                Modifiers = onlineModifiers,
                ItemSets = onlineSets.OrderBy(s => s.Sequence).ToList()
            };

            return node;
        }
        finally
        {
            recursionStack.Remove(itemId);
        }
    }

    private async Task ApplyItemSetLinksAsync(
        EWHQDbContext context,
        int accountId,
        int itemId,
        IEnumerable<UpdateItemRelationshipSetDto> inStoreSource,
        IEnumerable<UpdateItemRelationshipSetDto> onlineSource,
        string currentUser,
        DateTime now,
        CancellationToken cancellationToken)
    {
        static List<(int? ItemSetId, int GroupHeaderId, int Sequence)> NormalizeSets(IEnumerable<UpdateItemRelationshipSetDto> source, string contextName)
        {
            var items = source
                .Where(s => s != null)
                .Select((s, index) => new
                {
                    s.ItemSetId,
                    s.GroupHeaderId,
                    ProvidedSequence = s.Sequence,
                    Index = index
                })
                .ToList();

            if (items.GroupBy(x => x.GroupHeaderId).Any(g => g.Count() > 1))
            {
                throw new InvalidOperationException($"Duplicate item set groups detected in the {contextName} list.");
            }

            return items
                .OrderBy(x => x.ProvidedSequence > 0 ? x.ProvidedSequence : int.MaxValue)
                .ThenBy(x => x.Index)
                .Select((x, position) => (x.ItemSetId, x.GroupHeaderId, position + 1))
                .ToList();
        }

        var inStore = NormalizeSets(inStoreSource ?? Array.Empty<UpdateItemRelationshipSetDto>(), "in-store");
        var online = NormalizeSets(onlineSource ?? Array.Empty<UpdateItemRelationshipSetDto>(), "online");

        var allGroupIds = inStore.Select(x => x.GroupHeaderId).Concat(online.Select(x => x.GroupHeaderId)).Distinct().ToList();
        if (allGroupIds.Count > 0)
        {
            var validGroupIds = await context.ModifierGroupHeaders
                .AsNoTracking()
                .Where(
                    g => g.AccountId == accountId
                         && allGroupIds.Contains(g.GroupHeaderId)
                         && (g.IsFollowSet ?? false))
                .Select(g => g.GroupHeaderId)
                .ToListAsync(cancellationToken);

            var invalid = allGroupIds.Except(validGroupIds).ToList();
            if (invalid.Count > 0)
            {
                throw new InvalidOperationException("One or more item set groups are invalid for this brand or are not meal-set groups.");
            }
        }

        var existing = await context.ItemSets
            .Where(s => s.AccountId == accountId && s.ItemId == itemId)
            .ToListAsync(cancellationToken);

        void ApplySets(IEnumerable<(int? ItemSetId, int GroupHeaderId, int Sequence)> desired, string? linkType)
        {
            var normalizedLink = string.IsNullOrWhiteSpace(linkType) ? null : linkType;
            var matches = existing
                .Where(s => LinkTypeEquals(s.LinkType, normalizedLink))
                .ToList();

            foreach (var stale in matches.Where(s => !desired.Any(d => d.GroupHeaderId == s.GroupHeaderId)).ToList())
            {
                context.ItemSets.Remove(stale);
                existing.Remove(stale);
            }

            foreach (var target in desired)
            {
                var current = matches.FirstOrDefault(s => s.GroupHeaderId == target.GroupHeaderId);
                if (current == null)
                {
                    var newEntity = new ItemSet
                    {
                        AccountId = accountId,
                        ItemId = itemId,
                        GroupHeaderId = target.GroupHeaderId,
                        Seq = target.Sequence,
                        Enabled = true,
                        LinkType = normalizedLink,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    };

                    context.ItemSets.Add(newEntity);
                    existing.Add(newEntity);
                }
                else
                {
                    current.Seq = target.Sequence;
                    current.Enabled = true;
                    current.LinkType = normalizedLink;
                    current.ModifiedDate = now;
                    current.ModifiedBy = currentUser;
                }
            }
        }

        ApplySets(inStore, NewModifierModeLinkType);
        ApplySets(online, null);
    }

    private async Task ApplyItemRelationshipNodeUpdatesAsync(
        EWHQDbContext context,
        int accountId,
        UpdateItemRelationshipNodeDto node,
        HashSet<int> processedItems,
        string currentUser,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (!processedItems.Add(node.ItemId))
        {
            return;
        }

        var item = await context.ItemMasters.FirstOrDefaultAsync(i => i.AccountId == accountId && i.ItemId == node.ItemId, cancellationToken);
        if (item == null)
        {
            throw new InvalidOperationException($"Menu item {node.ItemId} was not found for this brand.");
        }

        await ApplyModifierMappingsAsync(
            context,
            accountId,
            item,
            node.InStore?.Modifiers ?? Array.Empty<ItemModifierMappingUpsertDto>(),
            node.Online?.Modifiers ?? Array.Empty<ItemModifierMappingUpsertDto>(),
            currentUser,
            now,
            cancellationToken);

        await ApplyItemSetLinksAsync(
            context,
            accountId,
            item.ItemId,
            node.InStore?.ItemSets ?? Array.Empty<UpdateItemRelationshipSetDto>(),
            node.Online?.ItemSets ?? Array.Empty<UpdateItemRelationshipSetDto>(),
            currentUser,
            now,
            cancellationToken);

        var childMap = new Dictionary<int, UpdateItemRelationshipNodeDto>();

        void CollectChildren(IEnumerable<UpdateItemRelationshipSetDto>? sets)
        {
            if (sets == null)
            {
                return;
            }

            foreach (var set in sets)
            {
                if (set?.Children == null)
                {
                    continue;
                }

                foreach (var child in set.Children)
                {
                    if (child == null)
                    {
                        continue;
                    }

                    childMap[child.ItemId] = child;
                }
            }
        }

        CollectChildren(node.InStore?.ItemSets);
        CollectChildren(node.Online?.ItemSets);

        foreach (var child in childMap.Values)
        {
            await ApplyItemRelationshipNodeUpdatesAsync(
                context,
                accountId,
                child,
                processedItems,
                currentUser,
                now,
                cancellationToken);
        }
    }


    private static bool LinkTypeEquals(string? value, string? expected)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.IsNullOrWhiteSpace(expected);
        }

        if (string.IsNullOrWhiteSpace(expected))
        {
            return false;
        }

        return string.Equals(value.Trim(), expected.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    [HttpGet("brand/{brandId}")]
    [RequireBrandView]
    public async Task<ActionResult<MenuItemListResponse>> GetMenuItems(int brandId, [FromQuery] MenuItemListQuery query)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var page = Math.Max(query.Page, 1);
            var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

            var itemsBaseQuery = context.ItemMasters
                .AsNoTracking()
                .Where(i => i.AccountId == accountId);

            if (!query.IncludeDisabled)
            {
                itemsBaseQuery = itemsBaseQuery.Where(i => i.Enabled);
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var term = query.Search.Trim().ToUpperInvariant();
                itemsBaseQuery = itemsBaseQuery.Where(i =>
                    (i.ItemName ?? string.Empty).ToUpper().Contains(term) ||
                    (i.ItemNameAlt ?? string.Empty).ToUpper().Contains(term) ||
                    i.ItemCode.ToUpper().Contains(term));
            }

            if (query.HasModifier.HasValue)
            {
                itemsBaseQuery = itemsBaseQuery.Where(i => i.HasModifier == query.HasModifier.Value);
            }

            if (query.IsPromoItem.HasValue)
            {
                itemsBaseQuery = itemsBaseQuery.Where(i => i.IsPromoItem == query.IsPromoItem.Value);
            }

            if (!string.IsNullOrWhiteSpace(query.ItemType))
            {
                switch (query.ItemType.ToLowerInvariant())
                {
                    case "sellable":
                        itemsBaseQuery = itemsBaseQuery.Where(i => !i.IsModifier && !i.IsFollowSetDynamic && !i.IsFollowSetStandard);
                        break;
                    case "modifier":
                        itemsBaseQuery = itemsBaseQuery.Where(i => i.IsModifier);
                        break;
                    case "setitem":
                        itemsBaseQuery = itemsBaseQuery.Where(i => i.IsFollowSetDynamic || i.IsFollowSetStandard);
                        break;
                }
            }

            var categoryCounts = await itemsBaseQuery
                .GroupBy(i => i.CategoryId)
                .Select(g => new CategoryItemCountDto
                {
                    CategoryId = g.Key,
                    ItemCount = g.Count()
                })
                .ToListAsync();

            var filteredQuery = itemsBaseQuery;

            if (query.CategoryId.HasValue)
            {
                filteredQuery = filteredQuery.Where(i => i.CategoryId == query.CategoryId.Value);
            }

            filteredQuery = ApplySorting(filteredQuery, query);

            var totalItems = await filteredQuery.CountAsync();
            var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            var items = await filteredQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(i => new MenuItemSummaryDto
                {
                    ItemId = i.ItemId,
                    AccountId = i.AccountId,
                    CategoryId = i.CategoryId,
                    DepartmentId = i.DepartmentId,
                    ItemCode = i.ItemCode,
                    ItemName = i.ItemName,
                    ItemNameAlt = i.ItemNameAlt,
                    ItemPosName = i.ItemPosName,
                    ItemPosNameAlt = i.ItemPosNameAlt,
                    Enabled = i.Enabled,
                    IsItemShow = i.IsItemShow,
                    IsPriceShow = i.IsPriceShow,
                    HasModifier = i.HasModifier,
                    IsModifier = i.IsModifier,
                    IsPromoItem = i.IsPromoItem,
                    IsManualPrice = i.IsManualPrice,
                    IsManualName = i.IsManualName,
                    IsNonDiscountItem = i.IsNonDiscountItem,
                    IsNonServiceChargeItem = i.IsNonServiceChargeItem,
                    IsPointPaidItem = i.IsPointPaidItem,
                    IsNoPointEarnItem = i.IsNoPointEarnItem,
                    IsNonTaxableItem = i.IsNonTaxableItem,
                    IsComboRequired = i.IsComboRequired,
                    ButtonStyleId = i.ButtonStyleId,
                    DisplayIndex = i.DisplayIndex,
                    ItemPublicDisplayName = i.ItemPublicDisplayName,
                    ItemPublicDisplayNameAlt = i.ItemPublicDisplayNameAlt,
                    ItemPublicPrintedName = i.ItemPublicPrintedName,
                    ImageFileName = i.ImageFileName,
                    ModifiedDate = i.ModifiedDate,
                    ModifiedBy = i.ModifiedBy
                })
                .ToListAsync();

            var response = new MenuItemListResponse
            {
                Items = items,
                TotalItems = totalItems,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                CategoryCounts = categoryCounts
            };

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching menu items for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching menu items" });
        }
    }

    [HttpGet("brand/{brandId}/{itemId}")]
    [RequireBrandView]
    public async Task<ActionResult<MenuItemDetailDto>> GetMenuItem(int brandId, int itemId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var item = await context.ItemMasters
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.ItemId == itemId && i.AccountId == accountId);

            if (item == null)
            {
                return NotFound(new { message = "Menu item not found" });
            }

            var (prices, availability) = await BuildPricingAndAvailabilityAsync(context, accountId, item.ItemId);

            return Ok(MapToDetailDto(item, prices, availability));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching menu item {ItemId} for brand {BrandId}", itemId, brandId);
            return StatusCode(500, new { message = "An error occurred while fetching the menu item" });
        }
    }

    [HttpPost("brand/{brandId}")]
    [RequireBrandModify]
    public async Task<ActionResult<MenuItemDetailDto>> CreateMenuItem(int brandId, MenuItemUpsertDto createDto)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            // Ensure category exists
            var categoryExists = await context.ItemCategories
                .AnyAsync(c => c.CategoryId == createDto.CategoryId && c.AccountId == accountId);
            if (!categoryExists)
            {
                return BadRequest(new { message = "Category not found for this brand" });
            }

            // Ensure department exists
            var departmentExists = await context.Departments
                .AnyAsync(d => d.DepartmentId == createDto.DepartmentId && d.AccountId == accountId);
            if (!departmentExists)
            {
                return BadRequest(new { message = "Department not found for this brand" });
            }

            var normalizedItemCode = createDto.ItemCode.Trim();
            var duplicateCode = await context.ItemMasters
                .AnyAsync(i => i.AccountId == accountId && i.ItemCode == normalizedItemCode);
            if (duplicateCode)
            {
                return Conflict(new { message = "Item code already exists" });
            }

            var currentUser = GetCurrentUserIdentifier();
            var now = DateTime.UtcNow;

            var newItem = new ItemMaster
            {
                AccountId = accountId,
                CreatedDate = now,
                CreatedBy = currentUser,
                ModifiedDate = now,
                ModifiedBy = currentUser
            };

            ApplyUpsertDtoToEntity(newItem, createDto, normalizedItemCode);

            context.ItemMasters.Add(newItem);
            await context.SaveChangesAsync();

            var (prices, availability) = await BuildPricingAndAvailabilityAsync(context, accountId, newItem.ItemId);

            return CreatedAtAction(
                nameof(GetMenuItem),
                new { brandId, itemId = newItem.ItemId },
                MapToDetailDto(newItem, prices, availability));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error when creating menu item for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the menu item" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when creating menu item for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the menu item" });
        }
    }

    [HttpPut("brand/{brandId}/reorder")]
    [RequireBrandModify]
    public async Task<ActionResult> ReorderMenuItems(int brandId, MenuItemReorderRequestDto request)
    {
        if (request.Items == null || request.Items.Count == 0)
        {
            return BadRequest(new { message = "At least one item is required to reorder." });
        }

        if (request.Items.Select(i => i.ItemId).Distinct().Count() != request.Items.Count)
        {
            return BadRequest(new { message = "Duplicate item identifiers are not allowed." });
        }

        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var itemIds = request.Items.Select(i => i.ItemId).ToArray();

            var items = await context.ItemMasters
                .Where(i => i.AccountId == accountId && itemIds.Contains(i.ItemId))
                .ToListAsync();

            if (items.Count != request.Items.Count)
            {
                var foundIds = items.Select(i => i.ItemId).ToHashSet();
                var missing = itemIds.First(id => !foundIds.Contains(id));
                return NotFound(new { message = $"Menu item {missing} was not found." });
            }

            if (items.Select(i => i.CategoryId).Distinct().Count() > 1)
            {
                return BadRequest(new { message = "Items must belong to the same category to reorder." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var mapping = request.Items.ToDictionary(i => i.ItemId, i => i.DisplayIndex);

            foreach (var item in items)
            {
                if (!mapping.TryGetValue(item.ItemId, out var displayIndex))
                {
                    continue;
                }

                item.DisplayIndex = displayIndex;
                item.ModifiedDate = now;
                item.ModifiedBy = currentUser;
            }

            await context.SaveChangesAsync();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reordering menu items for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while reordering menu items" });
        }
    }

    [HttpPut("brand/{brandId}/{itemId}")]
    [RequireBrandModify]
    public async Task<ActionResult> UpdateMenuItem(int brandId, int itemId, MenuItemUpsertDto updateDto)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var item = await context.ItemMasters
                .FirstOrDefaultAsync(i => i.ItemId == itemId && i.AccountId == accountId);

            if (item == null)
            {
                return NotFound(new { message = "Menu item not found" });
            }

            var categoryExists = await context.ItemCategories
                .AnyAsync(c => c.CategoryId == updateDto.CategoryId && c.AccountId == accountId);
            if (!categoryExists)
            {
                return BadRequest(new { message = "Category not found for this brand" });
            }

            var departmentExists = await context.Departments
                .AnyAsync(d => d.DepartmentId == updateDto.DepartmentId && d.AccountId == accountId);
            if (!departmentExists)
            {
                return BadRequest(new { message = "Department not found for this brand" });
            }

            var normalizedItemCode = updateDto.ItemCode.Trim();
            var duplicateCode = await context.ItemMasters
                .AnyAsync(i => i.AccountId == accountId && i.ItemId != itemId && i.ItemCode == normalizedItemCode);
            if (duplicateCode)
            {
                return Conflict(new { message = "Item code already exists" });
            }

            ApplyUpsertDtoToEntity(item, updateDto, normalizedItemCode);

            item.ModifiedDate = DateTime.UtcNow;
            item.ModifiedBy = GetCurrentUserIdentifier();

            await context.SaveChangesAsync();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error when updating menu item {ItemId} for brand {BrandId}", itemId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating the menu item" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when updating menu item {ItemId} for brand {BrandId}", itemId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating the menu item" });
        }
    }

    [HttpGet("brand/{brandId}/lookups")]
    [RequireBrandView]
    public async Task<ActionResult<MenuItemLookupsDto>> GetMenuItemLookups(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var categories = await context.ItemCategories
                .AsNoTracking()
                .Where(c => c.AccountId == accountId && c.Enabled)
                .OrderBy(c => c.DisplayIndex)
                .ThenBy(c => c.CategoryName)
                .Select(c => new ItemCategoryDto
                {
                    CategoryId = c.CategoryId,
                    AccountId = c.AccountId,
                    CategoryName = c.CategoryName ?? string.Empty,
                    CategoryNameAlt = c.CategoryNameAlt,
                    DisplayIndex = c.DisplayIndex,
                    ParentCategoryId = c.ParentCategoryId,
                    IsTerminal = c.IsTerminal,
                    IsPublicDisplay = c.IsPublicDisplay,
                    ButtonStyleId = c.ButtonStyleId,
                    PrinterName = c.PrinterName,
                    IsModifier = c.IsModifier,
                    Enabled = c.Enabled,
                    CreatedDate = c.CreatedDate,
                    CreatedBy = c.CreatedBy,
                    ModifiedDate = c.ModifiedDate,
                    ModifiedBy = c.ModifiedBy,
                    CategoryTypeId = c.CategoryTypeId,
                    ImageFileName = c.ImageFileName,
                    IsSelfOrderingDisplay = c.IsSelfOrderingDisplay,
                    IsOnlineStoreDisplay = c.IsOnlineStoreDisplay,
                    CategoryCode = c.CategoryCode
                })
                .ToListAsync();

            var buttonStyles = await context.ButtonStyleMasters
                .AsNoTracking()
                .Where(bs => bs.AccountId == accountId && bs.IsSystemUse != true)
                .OrderBy(bs => bs.StyleName)
                .Select(bs => new ButtonStyleDto
                {
                    ButtonStyleId = bs.ButtonStyleId,
                    AccountId = bs.AccountId,
                    StyleName = bs.StyleName ?? string.Empty,
                    StyleNameAlt = bs.StyleNameAlt,
                    ResourceStyleName = bs.ResourceStyleName,
                    BackgroundColorTop = bs.BackgroundColorTop,
                    BackgroundColorMiddle = bs.BackgroundColorMiddle,
                    BackgroundColorBottom = bs.BackgroundColorBottom,
                    Enabled = bs.Enabled,
                    FontSize = bs.FontSize,
                    Width = bs.Width,
                    Height = bs.Height,
                    ImageModeWidth = bs.ImageModeWidth,
                    ImageModeHeight = bs.ImageModeHeight,
                    ImageModeFontSize = bs.ImageModeFontSize,
                    ImageModeResourceStyleName = bs.ImageModeResourceStyleName,
                    IsSystemUse = bs.IsSystemUse,
                    CreatedDate = bs.CreatedDate,
                    CreatedBy = bs.CreatedBy,
                    ModifiedDate = bs.ModifiedDate,
                    ModifiedBy = bs.ModifiedBy
                })
                .ToListAsync();

            var departments = await context.Departments
                .AsNoTracking()
                .Where(d => d.AccountId == accountId && d.Enabled)
                .OrderBy(d => d.DepartmentName)
                .Select(d => new DepartmentDto
                {
                    DepartmentId = d.DepartmentId,
                    AccountId = d.AccountId,
                    DepartmentName = d.DepartmentName,
                    DepartmentCode = d.DepartmentCode,
                    Enabled = d.Enabled
                })
                .ToListAsync();

            var modifierGroups = await context.ModifierGroupHeaders
                .AsNoTracking()
                .Where(mg => mg.AccountId == accountId && mg.Enabled)
                .OrderBy(mg => mg.GroupBatchName)
                .Select(mg => new ModifierGroupHeaderDto
                {
                    GroupHeaderId = mg.GroupHeaderId,
                    AccountId = mg.AccountId,
                    GroupBatchName = mg.GroupBatchName ?? string.Empty,
                    GroupBatchNameAlt = mg.GroupBatchNameAlt,
                    Enabled = mg.Enabled,
                    IsFollowSet = mg.IsFollowSet ?? false
                })
                .ToListAsync();

            return Ok(new MenuItemLookupsDto
            {
                Categories = categories,
                ButtonStyles = buttonStyles,
                Departments = departments,
                ModifierGroups = modifierGroups
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching menu item lookups for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching menu item lookups" });
        }
    }

    [HttpPut("brand/{brandId}/{itemId}/prices/{shopId}")]
    [RequireBrandModify]
    public async Task<ActionResult<MenuItemPriceDto>> UpsertMenuItemPrice(int brandId, int itemId, int shopId, UpdateMenuItemPriceDto updateDto)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var itemExists = await context.ItemMasters.AnyAsync(i => i.AccountId == accountId && i.ItemId == itemId);
            if (!itemExists)
            {
                return NotFound(new { message = "Menu item not found" });
            }

            var shop = await context.Shops.AsNoTracking().FirstOrDefaultAsync(s => s.AccountId == accountId && s.ShopId == shopId);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found for this brand" });
            }

            var price = await context.ItemPrices.FirstOrDefaultAsync(p => p.AccountId == accountId && p.ItemId == itemId && p.ShopId == shopId);
            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            if (price == null)
            {
                price = new ItemPrice
                {
                    AccountId = accountId,
                    ItemId = itemId,
                    ShopId = shopId,
                    Price = updateDto.Price,
                    Enabled = updateDto.Enabled,
                    CreatedDate = now,
                    CreatedBy = currentUser,
                    ModifiedDate = now,
                    ModifiedBy = currentUser
                };

                context.ItemPrices.Add(price);
            }
            else
            {
                price.Price = updateDto.Price;
                price.Enabled = updateDto.Enabled;
                price.ModifiedDate = now;
                price.ModifiedBy = currentUser;
            }

            await context.SaveChangesAsync();

            return Ok(new MenuItemPriceDto
            {
                ShopId = shop.ShopId,
                ShopName = shop.Name,
                Price = price.Price,
                Enabled = price.Enabled,
                ModifiedDate = price.ModifiedDate,
                ModifiedBy = price.ModifiedBy
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating menu item price for item {ItemId} in shop {ShopId}", itemId, shopId);
            return StatusCode(500, new { message = "An error occurred while updating the price" });
        }
    }

    [HttpPut("brand/{brandId}/{itemId}/availability/{shopId}")]
    [RequireBrandModify]
    public async Task<ActionResult<MenuItemShopAvailabilityDto>> UpdateMenuItemAvailability(int brandId, int itemId, int shopId, UpdateMenuItemAvailabilityDto updateDto)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var itemExists = await context.ItemMasters.AnyAsync(i => i.AccountId == accountId && i.ItemId == itemId);
            if (!itemExists)
            {
                return NotFound(new { message = "Menu item not found" });
            }

            var shop = await context.Shops.AsNoTracking().FirstOrDefaultAsync(s => s.AccountId == accountId && s.ShopId == shopId);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found for this brand" });
            }

            var detail = await context.ItemShopDetails.FirstOrDefaultAsync(d => d.AccountId == accountId && d.ItemId == itemId && d.ShopId == shopId);
            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            if (detail == null)
            {
                var referencePrice = await context.ItemPrices.AsNoTracking()
                    .Where(p => p.AccountId == accountId && p.ItemId == itemId && p.ShopId == shopId)
                    .Select(p => (decimal?)p.Price)
                    .FirstOrDefaultAsync() ?? 0m;

                detail = new ItemShopDetail
                {
                    AccountId = accountId,
                    ItemId = itemId,
                    ShopId = shopId,
                    Price = referencePrice,
                    IsLimitedItem = updateDto.IsLimitedItem ?? false,
                    IsOutOfStock = updateDto.IsOutOfStock ?? false,
                    ItemQty = null,
                    ItemCount = null,
                    CreatedDate = now,
                    CreatedBy = currentUser,
                    ModifiedDate = now,
                    ModifiedBy = currentUser,
                    Enabled = updateDto.Enabled,
                    IsPublicDisplay = null,
                    IsLimitedItemAutoReset = null,
                    OriginalPrice = null,
                    ShopPrinter1 = updateDto.ShopPrinter1,
                    ShopPrinter2 = updateDto.ShopPrinter2,
                    ShopPrinter3 = updateDto.ShopPrinter3,
                    ShopPrinter4 = updateDto.ShopPrinter4,
                    ShopPrinter5 = updateDto.ShopPrinter5,
                    IsGroupPrintByPrinter = updateDto.IsGroupPrintByPrinter ?? false
                };

                context.ItemShopDetails.Add(detail);
            }
            else
            {
                if (updateDto.Enabled.HasValue)
                {
                    detail.Enabled = updateDto.Enabled.Value;
                }

                if (updateDto.IsOutOfStock.HasValue)
                {
                    detail.IsOutOfStock = updateDto.IsOutOfStock.Value;
                }

                if (updateDto.IsLimitedItem.HasValue)
                {
                    detail.IsLimitedItem = updateDto.IsLimitedItem.Value;
                }

                detail.ShopPrinter1 = updateDto.ShopPrinter1;
                detail.ShopPrinter2 = updateDto.ShopPrinter2;
                detail.ShopPrinter3 = updateDto.ShopPrinter3;
                detail.ShopPrinter4 = updateDto.ShopPrinter4;
                detail.ShopPrinter5 = updateDto.ShopPrinter5;
                detail.IsGroupPrintByPrinter = updateDto.IsGroupPrintByPrinter ?? false;

                detail.ModifiedDate = now;
                detail.ModifiedBy = currentUser;
            }

            await context.SaveChangesAsync();

            var printerOptions = await context.ShopPrinterMasters
                .AsNoTracking()
                .Where(sp => sp.AccountId == accountId && sp.ShopId == shopId && sp.Enabled)
                .OrderBy(sp => sp.PrinterName)
                .Select(sp => new ShopPrinterOptionDto
                {
                    ShopPrinterMasterId = sp.ShopPrinterMasterId,
                    PrinterName = sp.PrinterName ?? string.Empty
                })
                .ToListAsync();

            return Ok(new MenuItemShopAvailabilityDto
            {
                ShopId = shop.ShopId,
                ShopName = shop.Name,
                Enabled = detail.Enabled,
                IsOutOfStock = detail.IsOutOfStock,
                IsLimitedItem = detail.IsLimitedItem,
                LastUpdated = detail.ModifiedDate,
                UpdatedBy = detail.ModifiedBy,
                ShopPrinter1 = detail.ShopPrinter1,
                ShopPrinter2 = detail.ShopPrinter2,
                ShopPrinter3 = detail.ShopPrinter3,
                ShopPrinter4 = detail.ShopPrinter4,
                ShopPrinter5 = detail.ShopPrinter5,
                IsGroupPrintByPrinter = detail.IsGroupPrintByPrinter,
                PrinterOptions = printerOptions
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating availability for menu item {ItemId} in shop {ShopId}", itemId, shopId);
            return StatusCode(500, new { message = "An error occurred while updating availability" });
        }
    }

    private static IQueryable<ItemMaster> ApplySorting(IQueryable<ItemMaster> query, MenuItemListQuery request)
    {
        var direction = string.Equals(request.SortDirection, "desc", StringComparison.OrdinalIgnoreCase) ? "desc" : "asc";
        var sortBy = request.SortBy?.ToLowerInvariant();

        return (sortBy) switch
        {
            "name" => direction == "desc"
                ? query.OrderByDescending(i => i.ItemName ?? i.ItemCode).ThenByDescending(i => i.ItemId)
                : query.OrderBy(i => i.ItemName ?? i.ItemCode).ThenBy(i => i.ItemId),
            "modified" or "modifieddate" => direction == "desc"
                ? query.OrderByDescending(i => i.ModifiedDate ?? i.CreatedDate ?? DateTime.MinValue).ThenByDescending(i => i.ItemId)
                : query.OrderBy(i => i.ModifiedDate ?? i.CreatedDate ?? DateTime.MinValue).ThenBy(i => i.ItemId),
            _ => direction == "desc"
                ? query.OrderByDescending(i => i.DisplayIndex).ThenByDescending(i => i.ItemId)
                : query.OrderBy(i => i.DisplayIndex).ThenBy(i => i.ItemId)
        };
    }

    private static async Task<(List<MenuItemPriceDto> prices, List<MenuItemShopAvailabilityDto> availability)> BuildPricingAndAvailabilityAsync(
        EWHQDbContext context,
        int accountId,
        int itemId)
    {
        var shops = await context.Shops
            .AsNoTracking()
            .Where(s => s.AccountId == accountId)
            .Select(s => new { s.ShopId, s.Name })
            .ToListAsync();

        var priceEntities = await context.ItemPrices
            .AsNoTracking()
            .Where(p => p.AccountId == accountId && p.ItemId == itemId)
            .ToListAsync();

        var availabilityEntities = await context.ItemShopDetails
            .AsNoTracking()
            .Where(a => a.AccountId == accountId && a.ItemId == itemId)
            .ToListAsync();

        var printerEntities = await context.ShopPrinterMasters
            .AsNoTracking()
            .Where(sp => sp.AccountId == accountId && sp.Enabled)
            .Select(sp => new { sp.ShopId, sp.ShopPrinterMasterId, sp.PrinterName })
            .ToListAsync();

        var priceLookup = priceEntities
            .GroupBy(p => p.ShopId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.ModifiedDate).First());

        var availabilityLookup = availabilityEntities
            .GroupBy(a => a.ShopId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.ModifiedDate).First());

        var printerLookup = printerEntities
            .GroupBy(p => p.ShopId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(p => p.PrinterName ?? string.Empty)
                    .Select(p => new ShopPrinterOptionDto
                    {
                        ShopPrinterMasterId = p.ShopPrinterMasterId,
                        PrinterName = p.PrinterName ?? string.Empty
                    })
                    .ToList()
            );

        var prices = shops
            .Select(shop =>
            {
                priceLookup.TryGetValue(shop.ShopId, out var price);
                return new MenuItemPriceDto
                {
                    ShopId = shop.ShopId,
                    ShopName = shop.Name,
                    Price = price?.Price,
                    Enabled = price?.Enabled ?? false,
                    ModifiedDate = price?.ModifiedDate,
                    ModifiedBy = price?.ModifiedBy
                };
            })
            .ToList();

        var availability = shops
            .Select(shop =>
            {
                availabilityLookup.TryGetValue(shop.ShopId, out var detail);
                printerLookup.TryGetValue(shop.ShopId, out var printers);
                return new MenuItemShopAvailabilityDto
                {
                    ShopId = shop.ShopId,
                    ShopName = shop.Name,
                    Enabled = detail?.Enabled,
                    IsOutOfStock = detail?.IsOutOfStock,
                    IsLimitedItem = detail?.IsLimitedItem,
                    LastUpdated = detail?.ModifiedDate,
                    UpdatedBy = detail?.ModifiedBy,
                    ShopPrinter1 = detail?.ShopPrinter1,
                    ShopPrinter2 = detail?.ShopPrinter2,
                    ShopPrinter3 = detail?.ShopPrinter3,
                    ShopPrinter4 = detail?.ShopPrinter4,
                    ShopPrinter5 = detail?.ShopPrinter5,
                    IsGroupPrintByPrinter = detail?.IsGroupPrintByPrinter,
                    PrinterOptions = printers ?? new List<ShopPrinterOptionDto>()
                };
            })
            .ToList();

        return (prices, availability);
    }

    private static void ApplyUpsertDtoToEntity(ItemMaster entity, MenuItemUpsertDto dto, string normalizedItemCode)
    {
        entity.ItemCode = normalizedItemCode;
        entity.ItemName = dto.ItemName ?? string.Empty;
        entity.ItemNameAlt = dto.ItemNameAlt ?? string.Empty;
        entity.ItemNameAlt2 = dto.ItemNameAlt2 ?? string.Empty;
        entity.ItemNameAlt3 = dto.ItemNameAlt3 ?? string.Empty;
        entity.ItemNameAlt4 = dto.ItemNameAlt4 ?? string.Empty;
        entity.ItemPosName = dto.ItemPosName ?? string.Empty;
        entity.ItemPosNameAlt = dto.ItemPosNameAlt ?? string.Empty;
        entity.ItemPublicDisplayName = dto.ItemPublicDisplayName ?? string.Empty;
        entity.ItemPublicDisplayNameAlt = dto.ItemPublicDisplayNameAlt ?? string.Empty;
        entity.ItemPublicPrintedName = dto.ItemPublicPrintedName ?? string.Empty;
        entity.ItemPublicPrintedNameAlt = dto.ItemPublicPrintedNameAlt ?? string.Empty;
        entity.Remark = dto.Remark ?? string.Empty;
        entity.RemarkAlt = dto.RemarkAlt ?? string.Empty;
        entity.ImageFileName = dto.ImageFileName ?? string.Empty;
        entity.ImageFileName2 = dto.ImageFileName2 ?? string.Empty;
        entity.TableOrderingImageFileName = dto.TableOrderingImageFileName ?? string.Empty;
        entity.CategoryId = dto.CategoryId;
        entity.DepartmentId = dto.DepartmentId;
        entity.SubDepartmentId = dto.SubDepartmentId;
        entity.DisplayIndex = dto.DisplayIndex;
        entity.Enabled = dto.Enabled;
        entity.IsItemShow = dto.IsItemShow;
        entity.IsPriceShow = dto.IsPriceShow;
        entity.HasModifier = dto.HasModifier;
        entity.AutoRedirectToModifier = dto.AutoRedirectToModifier;
        entity.IsModifier = dto.IsModifier;
        entity.ModifierGroupHeaderId = dto.ModifierGroupHeaderId;
        entity.ButtonStyleId = dto.ButtonStyleId;
        entity.IsManualPrice = dto.IsManualPrice;
        entity.IsManualName = dto.IsManualName;
        entity.IsPromoItem = dto.IsPromoItem;
        entity.IsModifierConcatToParent = dto.IsModifierConcatToParent;
        entity.IsFollowSet = dto.IsFollowSet;
        entity.IsFollowSetDynamic = dto.IsFollowSetDynamic;
        entity.IsFollowSetStandard = dto.IsFollowSetStandard;
        entity.IsNonDiscountItem = dto.IsNonDiscountItem;
        entity.IsNonServiceChargeItem = dto.IsNonServiceChargeItem;
        entity.IsStandaloneAndSetItem = dto.IsStandaloneAndSetItem;
        entity.IsGroupRightItem = dto.IsGroupRightItem;
        entity.IsPrintLabel = dto.IsPrintLabel;
        entity.IsPrintLabelTakeaway = dto.IsPrintLabelTakeaway;
        entity.IsPriceInPercentage = dto.IsPriceInPercentage;
        entity.IsPointPaidItem = dto.IsPointPaidItem;
        entity.IsNoPointEarnItem = dto.IsNoPointEarnItem;
        entity.IsNonTaxableItem = dto.IsNonTaxableItem;
        entity.IsItemShowInKitchenChecklist = dto.IsItemShowInKitchenChecklist;
        entity.IsSoldoutAutoLock = dto.IsSoldoutAutoLock;
        entity.IsPrepaidRechargeItem = dto.IsPrepaidRechargeItem;
        entity.IsAutoLinkWithRawMaterial = dto.IsAutoLinkWithRawMaterial;
        entity.IsDinein = dto.IsDinein;
        entity.IsTakeaway = dto.IsTakeaway;
        entity.IsDelivery = dto.IsDelivery;
        entity.IsKitchenPrintInRedColor = dto.IsKitchenPrintInRedColor;
        entity.IsManualPriceGroup = dto.IsManualPriceGroup;
        entity.IsExcludeLabelCount = dto.IsExcludeLabelCount;
        entity.ServingSize = dto.ServingSize;
        entity.SystemRemark = dto.SystemRemark ?? string.Empty;
        entity.IsNonSalesItem = dto.IsNonSalesItem;
        entity.ProductionSeconds = dto.ProductionSeconds;
        entity.ParentItemId = dto.ParentItemId;
        entity.IsComboRequired = dto.IsComboRequired;
    }

    private static MenuItemDetailDto MapToDetailDto(
        ItemMaster item,
        IReadOnlyList<MenuItemPriceDto> prices,
        IReadOnlyList<MenuItemShopAvailabilityDto> availability)
    {
        return new MenuItemDetailDto
        {
            ItemId = item.ItemId,
            AccountId = item.AccountId,
            CategoryId = item.CategoryId,
            DepartmentId = item.DepartmentId,
            ItemCode = item.ItemCode,
            ItemName = item.ItemName,
            ItemNameAlt = item.ItemNameAlt,
            ItemNameAlt2 = item.ItemNameAlt2,
            ItemNameAlt3 = item.ItemNameAlt3,
            ItemNameAlt4 = item.ItemNameAlt4,
            ItemPosName = item.ItemPosName,
            ItemPosNameAlt = item.ItemPosNameAlt,
            ItemPublicDisplayName = item.ItemPublicDisplayName,
            ItemPublicDisplayNameAlt = item.ItemPublicDisplayNameAlt,
            ItemPublicPrintedName = item.ItemPublicPrintedName,
            ItemPublicPrintedNameAlt = item.ItemPublicPrintedNameAlt,
            Remark = item.Remark,
            RemarkAlt = item.RemarkAlt,
            ImageFileName = item.ImageFileName,
            ImageFileName2 = item.ImageFileName2,
            TableOrderingImageFileName = item.TableOrderingImageFileName,
            DisplayIndex = item.DisplayIndex,
            Enabled = item.Enabled,
            IsItemShow = item.IsItemShow,
            IsPriceShow = item.IsPriceShow,
            HasModifier = item.HasModifier,
            AutoRedirectToModifier = item.AutoRedirectToModifier,
            IsModifier = item.IsModifier,
            ModifierGroupHeaderId = item.ModifierGroupHeaderId,
            ButtonStyleId = item.ButtonStyleId,
            IsManualPrice = item.IsManualPrice,
            IsManualName = item.IsManualName,
            IsPromoItem = item.IsPromoItem,
            IsModifierConcatToParent = item.IsModifierConcatToParent,
            IsFollowSet = item.IsFollowSet,
            IsFollowSetDynamic = item.IsFollowSetDynamic,
            IsFollowSetStandard = item.IsFollowSetStandard,
            IsNonDiscountItem = item.IsNonDiscountItem,
            IsNonServiceChargeItem = item.IsNonServiceChargeItem,
            IsStandaloneAndSetItem = item.IsStandaloneAndSetItem,
            IsGroupRightItem = item.IsGroupRightItem,
            IsPrintLabel = item.IsPrintLabel,
            IsPrintLabelTakeaway = item.IsPrintLabelTakeaway,
            IsPriceInPercentage = item.IsPriceInPercentage,
            IsPointPaidItem = item.IsPointPaidItem,
            IsNoPointEarnItem = item.IsNoPointEarnItem,
            IsNonTaxableItem = item.IsNonTaxableItem,
            IsItemShowInKitchenChecklist = item.IsItemShowInKitchenChecklist,
            IsSoldoutAutoLock = item.IsSoldoutAutoLock,
            IsPrepaidRechargeItem = item.IsPrepaidRechargeItem,
            IsAutoLinkWithRawMaterial = item.IsAutoLinkWithRawMaterial,
            IsDinein = item.IsDinein,
            IsTakeaway = item.IsTakeaway,
            IsDelivery = item.IsDelivery,
            IsKitchenPrintInRedColor = item.IsKitchenPrintInRedColor,
            IsManualPriceGroup = item.IsManualPriceGroup,
            SubDepartmentId = item.SubDepartmentId,
            IsExcludeLabelCount = item.IsExcludeLabelCount,
            ServingSize = item.ServingSize,
            SystemRemark = item.SystemRemark,
            IsNonSalesItem = item.IsNonSalesItem,
            ProductionSeconds = item.ProductionSeconds,
            ParentItemId = item.ParentItemId,
            IsComboRequired = item.IsComboRequired,
            ModifiedDate = item.ModifiedDate,
            CreatedDate = item.CreatedDate,
            CreatedBy = item.CreatedBy,
            ModifiedBy = item.ModifiedBy,
            Prices = prices,
            ShopAvailability = availability
        };
    }
}
