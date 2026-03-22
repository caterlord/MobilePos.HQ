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
using EWHQ.Api.DTOs;
using EWHQ.Api.Data;
using EWHQ.Api.Models.Entities;
using EWHQ.Api.Services;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/smart-categories")]
[Authorize]
public class SmartCategoriesController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<SmartCategoriesController> _logger;

    public SmartCategoriesController(
        IPOSDbContextService posContextService,
        ILogger<SmartCategoriesController> logger)
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

    [HttpGet("brand/{brandId}")]
    [RequireBrandView]
    public async Task<ActionResult<IEnumerable<SmartCategoryTreeNodeDto>>> GetSmartCategories(int brandId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var categories = await context.SmartCategories
                .Where(c => c.AccountId == accountId && c.Enabled)
                .AsNoTracking()
                .OrderBy(c => c.ParentSmartCategoryId ?? 0)
                .ThenBy(c => c.DisplayIndex)
                .ThenBy(c => c.SmartCategoryId)
                .ToListAsync(cancellationToken);

            if (categories.Count == 0)
            {
                return Ok(Array.Empty<SmartCategoryTreeNodeDto>());
            }

            var categoryIds = categories
                .Select(c => c.SmartCategoryId)
                .ToList();

            var itemCounts = await context.SmartCategoryItemDetails
                .Where(i => i.AccountId == accountId && categoryIds.Contains(i.SmartCategoryId))
                .AsNoTracking()
                .GroupBy(i => i.SmartCategoryId)
                .Select(group => new
                {
                    SmartCategoryId = group.Key,
                    Count = group.Count(item => item.Enabled)
                })
                .ToListAsync(cancellationToken);

            var itemCountLookup = itemCounts.ToDictionary(x => x.SmartCategoryId, x => x.Count);
            var nodeLookup = new Dictionary<int, SmartCategoryTreeNodeDto>(categories.Count);
            var childLookup = new Dictionary<int, List<SmartCategoryTreeNodeDto>>(categories.Count);

            foreach (var category in categories)
            {
                var node = new SmartCategoryTreeNodeDto
                {
                    SmartCategoryId = category.SmartCategoryId,
                    ParentSmartCategoryId = category.ParentSmartCategoryId,
                    Name = category.Name ?? string.Empty,
                    NameAlt = category.NameAlt,
                    DisplayIndex = category.DisplayIndex,
                    Enabled = category.Enabled,
                    ButtonStyleId = category.ButtonStyleId,
                    ItemCount = itemCountLookup.TryGetValue(category.SmartCategoryId, out var count) ? count : 0,
                };

                var children = new List<SmartCategoryTreeNodeDto>();
                node.Children = children;

                nodeLookup[category.SmartCategoryId] = node;
                childLookup[category.SmartCategoryId] = children;
            }

            var roots = new List<SmartCategoryTreeNodeDto>();

            foreach (var category in categories)
            {
                var node = nodeLookup[category.SmartCategoryId];
                if (category.ParentSmartCategoryId.HasValue && nodeLookup.TryGetValue(category.ParentSmartCategoryId.Value, out var parent))
                {
                    childLookup[parent.SmartCategoryId].Add(node);
                }
                else
                {
                    roots.Add(node);
                }
            }

            return Ok(roots);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching smart categories for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching smart categories" });
        }
    }

    [HttpGet("brand/{brandId}/lookups")]
    [RequireBrandView]
    public async Task<ActionResult<LookupOptionsDto>> GetLookups(int brandId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var buttonStyles = await context.ButtonStyleMasters
                .Where(bs => bs.AccountId == accountId && bs.IsSystemUse != true && bs.StyleName != null)
                .AsNoTracking()
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
                .ToListAsync(cancellationToken);

            var shops = await context.Shops
                .Where(s => s.AccountId == accountId && s.Enabled)
                .AsNoTracking()
                .OrderBy(s => s.Name)
                .Select(s => new LookupItemDto
                {
                    Id = s.ShopId,
                    Name = s.Name ?? string.Empty,
                    AltName = s.AltName,
                    Code = s.ShopCode
                })
                .ToListAsync(cancellationToken);

            var orderChannels = await context.OrderChannels
                .AsNoTracking()
                .OrderBy(oc => oc.OrderChannelName)
                .Select(oc => new LookupItemDto
                {
                    Id = oc.OrderChannelId,
                    Name = oc.OrderChannelName ?? string.Empty,
                    AltName = oc.OrderChannelNameAlt,
                    Code = oc.OrderChannelCode
                })
                .ToListAsync(cancellationToken);

            return Ok(new LookupOptionsDto
            {
                ButtonStyles = buttonStyles,
                Shops = shops,
                OrderChannels = orderChannels
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching smart category lookups for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching smart category lookups" });
        }
    }

    [HttpGet("brand/{brandId}/{smartCategoryId}")]
    [RequireBrandView]
    public async Task<ActionResult<SmartCategoryDetailDto>> GetSmartCategory(
        int brandId,
        int smartCategoryId,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var category = await context.SmartCategories
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.AccountId == accountId && c.SmartCategoryId == smartCategoryId, cancellationToken);

            if (category == null)
            {
                return NotFound(new { message = "Smart category not found" });
            }

            var categoryDto = MapToDto(category);

            var items = await FetchCategoryItemsAsync(context, accountId, smartCategoryId, cancellationToken);
            var schedules = await FetchShopSchedulesAsync(context, accountId, smartCategoryId, cancellationToken);
            var channels = await FetchOrderChannelsAsync(context, accountId, smartCategoryId, cancellationToken);

            return Ok(new SmartCategoryDetailDto
            {
                Category = categoryDto,
                Items = items,
                ShopSchedules = schedules,
                OrderChannels = channels
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching smart category {SmartCategoryId} for brand {BrandId}", smartCategoryId, brandId);
            return StatusCode(500, new { message = "An error occurred while fetching the smart category" });
        }
    }

    [HttpPost("brand/{brandId}")]
    [RequireBrandModify]
    public async Task<ActionResult<SmartCategoryDetailDto>> CreateSmartCategory(
        int brandId,
        SmartCategoryUpsertDto createDto,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            if (string.IsNullOrWhiteSpace(createDto.Name))
            {
                return BadRequest(new { message = "Smart category name is required." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            if (createDto.ParentSmartCategoryId.HasValue)
            {
                var parentExists = await context.SmartCategories
                    .AnyAsync(
                        c => c.AccountId == accountId && c.SmartCategoryId == createDto.ParentSmartCategoryId.Value,
                        cancellationToken);

                if (!parentExists)
                {
                    return BadRequest(new { message = "Parent smart category not found." });
                }
            }

            var maxId = await context.SmartCategories
                .Where(c => c.AccountId == accountId)
                .MaxAsync(c => (int?)c.SmartCategoryId, cancellationToken) ?? 0;

            var smartCategoryId = maxId + 1;
            var displayIndex = createDto.DisplayIndex;

            if (displayIndex <= 0)
            {
                displayIndex = await context.SmartCategories
                    .Where(c => c.AccountId == accountId && c.ParentSmartCategoryId == createDto.ParentSmartCategoryId)
                    .MaxAsync(c => (int?)c.DisplayIndex, cancellationToken) ?? 0;
                displayIndex += 1;
            }

            var normalizedName = createDto.Name.Trim();

            var entity = new SmartCategory
            {
                SmartCategoryId = smartCategoryId,
                AccountId = accountId,
                ParentSmartCategoryId = createDto.ParentSmartCategoryId,
                Name = normalizedName,
                NameAlt = createDto.NameAlt?.Trim(),
                DisplayIndex = displayIndex,
                Enabled = createDto.Enabled,
                IsTerminal = createDto.IsTerminal,
                IsPublicDisplay = createDto.IsPublicDisplay,
                ButtonStyleId = createDto.ButtonStyleId,
                Description = createDto.Description,
                DescriptionAlt = createDto.DescriptionAlt,
                ImageFileName = createDto.ImageFileName,
                ImageFileName2 = createDto.ImageFileName2,
                ImageFileName3 = createDto.ImageFileName3,
                IsSelfOrderingDisplay = createDto.IsSelfOrderingDisplay,
                IsOnlineStoreDisplay = createDto.IsOnlineStoreDisplay,
                IsOdoDisplay = createDto.IsOdoDisplay,
                IsKioskDisplay = createDto.IsKioskDisplay,
                IsTableOrderingDisplay = createDto.IsTableOrderingDisplay,
                OnlineStoreRefCategoryId = createDto.OnlineStoreRefCategoryId,
                Remark = createDto.Remark,
                RemarkAlt = createDto.RemarkAlt,
                CreatedDate = now,
                CreatedBy = currentUser,
                ModifiedDate = now,
                ModifiedBy = currentUser,
            };

            context.SmartCategories.Add(entity);
            await context.SaveChangesAsync(cancellationToken);

            var detailDto = new SmartCategoryDetailDto
            {
                Category = MapToDto(entity),
                Items = Array.Empty<SmartCategoryItemAssignmentDto>(),
                ShopSchedules = Array.Empty<SmartCategoryShopScheduleDto>(),
                OrderChannels = Array.Empty<SmartCategoryOrderChannelDto>()
            };

            return CreatedAtAction(
                nameof(GetSmartCategory),
                new { brandId, smartCategoryId = entity.SmartCategoryId },
                detailDto);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating smart category for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the smart category" });
        }
    }

    [HttpPut("brand/{brandId}/{smartCategoryId}")]
    [RequireBrandModify]
    public async Task<ActionResult> UpdateSmartCategory(
        int brandId,
        int smartCategoryId,
        SmartCategoryUpsertDto updateDto,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(updateDto.Name))
        {
            return BadRequest(new { message = "Smart category name is required." });
        }

        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var category = await context.SmartCategories
                .FirstOrDefaultAsync(c => c.AccountId == accountId && c.SmartCategoryId == smartCategoryId, cancellationToken);

            if (category == null)
            {
                return NotFound(new { message = "Smart category not found" });
            }

            if (updateDto.ParentSmartCategoryId.HasValue && updateDto.ParentSmartCategoryId.Value == smartCategoryId)
            {
                return BadRequest(new { message = "A smart category cannot be its own parent." });
            }

            if (updateDto.ParentSmartCategoryId.HasValue)
            {
                var parentExists = await context.SmartCategories
                    .AnyAsync(
                        c => c.AccountId == accountId && c.SmartCategoryId == updateDto.ParentSmartCategoryId.Value,
                        cancellationToken);

                if (!parentExists)
                {
                    return BadRequest(new { message = "Parent smart category not found." });
                }
            }

            if (updateDto.ParentSmartCategoryId.HasValue)
            {
                // Prevent circular relationships by ensuring the new parent is not a descendant.
                var descendants = await GetDescendantIdsAsync(context, accountId, smartCategoryId, cancellationToken);
                if (descendants.Contains(updateDto.ParentSmartCategoryId.Value))
                {
                    return BadRequest(new { message = "Cannot assign a descendant as parent." });
                }
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var normalizedName = updateDto.Name.Trim();

            category.ParentSmartCategoryId = updateDto.ParentSmartCategoryId;
            category.Name = normalizedName;
            category.NameAlt = updateDto.NameAlt?.Trim();
            category.DisplayIndex = updateDto.DisplayIndex <= 0 ? category.DisplayIndex : updateDto.DisplayIndex;
            category.Enabled = updateDto.Enabled;
            category.IsTerminal = updateDto.IsTerminal;
            category.IsPublicDisplay = updateDto.IsPublicDisplay;
            category.ButtonStyleId = updateDto.ButtonStyleId;
            category.Description = updateDto.Description;
            category.DescriptionAlt = updateDto.DescriptionAlt;
            category.ImageFileName = updateDto.ImageFileName;
            category.ImageFileName2 = updateDto.ImageFileName2;
            category.ImageFileName3 = updateDto.ImageFileName3;
            category.IsSelfOrderingDisplay = updateDto.IsSelfOrderingDisplay;
            category.IsOnlineStoreDisplay = updateDto.IsOnlineStoreDisplay;
            category.IsOdoDisplay = updateDto.IsOdoDisplay;
            category.IsKioskDisplay = updateDto.IsKioskDisplay;
            category.IsTableOrderingDisplay = updateDto.IsTableOrderingDisplay;
            category.OnlineStoreRefCategoryId = updateDto.OnlineStoreRefCategoryId;
            category.Remark = updateDto.Remark;
            category.RemarkAlt = updateDto.RemarkAlt;
            category.ModifiedDate = now;
            category.ModifiedBy = currentUser;

            await context.SaveChangesAsync(cancellationToken);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating smart category {SmartCategoryId} for brand {BrandId}", smartCategoryId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating the smart category" });
        }
    }

    [HttpDelete("brand/{brandId}/{smartCategoryId}")]
    [RequireBrandModify]
    public async Task<ActionResult> DeleteSmartCategory(int brandId, int smartCategoryId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var category = await context.SmartCategories
                .FirstOrDefaultAsync(c => c.AccountId == accountId && c.SmartCategoryId == smartCategoryId, cancellationToken);

            if (category == null)
            {
                return NotFound(new { message = "Smart category not found" });
            }

            var hasChildren = await context.SmartCategories
                .AnyAsync(c => c.AccountId == accountId && c.ParentSmartCategoryId == smartCategoryId, cancellationToken);

            if (hasChildren)
            {
                return BadRequest(new { message = "Cannot delete a smart category that has child categories." });
            }

            var hasItems = await context.SmartCategoryItemDetails
                .AnyAsync(i => i.AccountId == accountId && i.SmartCategoryId == smartCategoryId, cancellationToken);

            if (hasItems)
            {
                return BadRequest(new { message = "Cannot delete a smart category that has assigned items." });
            }

            context.SmartCategories.Remove(category);
            await context.SaveChangesAsync(cancellationToken);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting smart category {SmartCategoryId} for brand {BrandId}", smartCategoryId, brandId);
            return StatusCode(500, new { message = "An error occurred while deleting the smart category" });
        }
    }

    [HttpPut("brand/{brandId}/reorder")]
    [RequireBrandModify]
    public async Task<ActionResult> ReorderSmartCategories(
        int brandId,
        SmartCategoryReorderRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.Categories == null || request.Categories.Count == 0)
        {
            return BadRequest(new { message = "At least one category is required to reorder." });
        }

        if (request.Categories.Select(c => c.SmartCategoryId).Distinct().Count() != request.Categories.Count)
        {
            return BadRequest(new { message = "Duplicate smart category identifiers are not allowed." });
        }

        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var ids = request.Categories.Select(c => c.SmartCategoryId).ToArray();

            var categories = await context.SmartCategories
                .Where(c => c.AccountId == accountId && ids.Contains(c.SmartCategoryId))
                .ToListAsync(cancellationToken);

            if (categories.Count != request.Categories.Count)
            {
                var found = categories.Select(c => c.SmartCategoryId).ToHashSet();
                var missing = ids.First(id => !found.Contains(id));
                return NotFound(new { message = $"Smart category {missing} was not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var requestLookup = request.Categories.ToDictionary(c => c.SmartCategoryId);

            foreach (var category in categories)
            {
                var payload = requestLookup[category.SmartCategoryId];
                category.ParentSmartCategoryId = payload.ParentSmartCategoryId;
                category.DisplayIndex = payload.DisplayIndex;
                category.ModifiedDate = now;
                category.ModifiedBy = currentUser;
            }

            await context.SaveChangesAsync(cancellationToken);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reordering smart categories for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while reordering smart categories" });
        }
    }

    [HttpPut("brand/{brandId}/{smartCategoryId}/items")]
    [RequireBrandModify]
    public async Task<ActionResult> UpsertSmartCategoryItems(
        int brandId,
        int smartCategoryId,
        SmartCategoryItemAssignmentRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.Items == null)
        {
            return BadRequest(new { message = "Items collection is required." });
        }

        if (request.Items.Select(i => i.ItemId).Distinct().Count() != request.Items.Count)
        {
            return BadRequest(new { message = "Duplicate item identifiers are not allowed." });
        }

        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var categoryExists = await context.SmartCategories
                .AnyAsync(c => c.AccountId == accountId && c.SmartCategoryId == smartCategoryId, cancellationToken);

            if (!categoryExists)
            {
                return NotFound(new { message = "Smart category not found." });
            }

            var itemIds = request.Items.Select(i => i.ItemId).ToArray();

            var items = await context.ItemMasters
                .Where(i => i.AccountId == accountId && itemIds.Contains(i.ItemId))
                .Select(i => i.ItemId)
                .ToListAsync(cancellationToken);

            if (items.Count != request.Items.Count)
            {
                var found = items.ToHashSet();
                var missing = itemIds.First(id => !found.Contains(id));
                return NotFound(new { message = $"Menu item {missing} was not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var existingMappings = await context.SmartCategoryItemDetails
                .Where(i => i.AccountId == accountId && i.SmartCategoryId == smartCategoryId)
                .ToListAsync(cancellationToken);

            var requestLookup = request.Items.ToDictionary(i => i.ItemId);
            var existingLookup = existingMappings.ToDictionary(i => i.ItemId);

            // Update existing or add new mappings
            foreach (var payload in request.Items)
            {
                if (existingLookup.TryGetValue(payload.ItemId, out var mapping))
                {
                    mapping.DisplayIndex = payload.DisplayIndex;
                    mapping.Enabled = payload.Enabled;
                    mapping.ModifiedDate = now;
                    mapping.ModifiedBy = currentUser;
                }
                else
                {
                    context.SmartCategoryItemDetails.Add(new SmartCategoryItemDetail
                    {
                        AccountId = accountId,
                        SmartCategoryId = smartCategoryId,
                        ItemId = payload.ItemId,
                        DisplayIndex = payload.DisplayIndex,
                        Enabled = payload.Enabled,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    });
                }
            }

            // Remove mappings that are not in the request
            foreach (var mapping in existingMappings)
            {
                if (!requestLookup.ContainsKey(mapping.ItemId))
                {
                    context.SmartCategoryItemDetails.Remove(mapping);
                }
            }

            await context.SaveChangesAsync(cancellationToken);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating items for smart category {SmartCategoryId} in brand {BrandId}", smartCategoryId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating smart category items" });
        }
    }

    [HttpPut("brand/{brandId}/{smartCategoryId}/display-settings")]
    [RequireBrandModify]
    public async Task<ActionResult> UpdateDisplaySettings(
        int brandId,
        int smartCategoryId,
        SmartCategoryDisplaySettingsUpsertDto request,
        CancellationToken cancellationToken)
    {
        var schedulesPayload = request.ShopSchedules?.ToList() ?? new List<SmartCategoryShopScheduleUpsertDto>();
        var channelPayload = request.OrderChannels?.ToList() ?? new List<SmartCategoryOrderChannelUpsertDto>();

        if (schedulesPayload.Select(s => s.ShopId).Distinct().Count() != schedulesPayload.Count)
        {
            return BadRequest(new { message = "Duplicate shop identifiers are not allowed within shop schedules." });
        }

        if (channelPayload.Select(c => (c.ShopId, c.OrderChannelId)).Distinct().Count() != channelPayload.Count)
        {
            return BadRequest(new { message = "Duplicate order channel assignments are not allowed." });
        }

        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var categoryExists = await context.SmartCategories
                .AnyAsync(c => c.AccountId == accountId && c.SmartCategoryId == smartCategoryId, cancellationToken);

            if (!categoryExists)
            {
                return NotFound(new { message = "Smart category not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            // Shop schedules
            var existingSchedules = await context.SmartCategoryShopDetails
                .Where(s => s.AccountId == accountId && s.SmartCategoryId == smartCategoryId)
                .ToListAsync(cancellationToken);

            var scheduleLookup = schedulesPayload.ToDictionary(s => s.ShopId);
            var existingScheduleLookup = existingSchedules.ToDictionary(s => s.ShopId);

            foreach (var schedule in schedulesPayload)
            {
                if (existingScheduleLookup.TryGetValue(schedule.ShopId, out var entity))
                {
                    entity.DisplayIndex = schedule.DisplayIndex;
                    entity.DisplayFromDate = schedule.DisplayFromDate;
                    entity.DisplayToDate = schedule.DisplayToDate;
                    entity.DisplayFromTime = schedule.DisplayFromTime;
                    entity.DisplayToTime = schedule.DisplayToTime;
                    entity.DisplayFromDateTime = schedule.DisplayFromDateTime;
                    entity.DisplayToDateTime = schedule.DisplayToDateTime;
                    entity.IsPublicDisplay = schedule.IsPublicDisplay;
                    entity.Enabled = schedule.Enabled;
                    entity.DayOfWeek = schedule.DayOfWeek;
                    entity.IsWeekdayHide = schedule.IsWeekdayHide;
                    entity.IsWeekendHide = schedule.IsWeekendHide;
                    entity.IsHolidayHide = schedule.IsHolidayHide;
                    entity.DaysOfWeek = schedule.DaysOfWeek ?? string.Empty;
                    entity.Months = schedule.Months ?? string.Empty;
                    entity.Dates = schedule.Dates ?? string.Empty;
                    entity.ModifiedDate = now;
                    entity.ModifiedBy = currentUser;
                }
                else
                {
                    context.SmartCategoryShopDetails.Add(new SmartCategoryShopDetail
                    {
                        AccountId = accountId,
                        ShopId = schedule.ShopId,
                        SmartCategoryId = smartCategoryId,
                        DisplayIndex = schedule.DisplayIndex,
                        DisplayFromDate = schedule.DisplayFromDate,
                        DisplayToDate = schedule.DisplayToDate,
                        DisplayFromTime = schedule.DisplayFromTime,
                        DisplayToTime = schedule.DisplayToTime,
                        DisplayFromDateTime = schedule.DisplayFromDateTime,
                        DisplayToDateTime = schedule.DisplayToDateTime,
                        IsPublicDisplay = schedule.IsPublicDisplay,
                        Enabled = schedule.Enabled,
                        DayOfWeek = schedule.DayOfWeek,
                        IsWeekdayHide = schedule.IsWeekdayHide,
                        IsWeekendHide = schedule.IsWeekendHide,
                        IsHolidayHide = schedule.IsHolidayHide,
                        DaysOfWeek = schedule.DaysOfWeek ?? string.Empty,
                        Months = schedule.Months ?? string.Empty,
                        Dates = schedule.Dates ?? string.Empty,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    });
                }
            }

            foreach (var existing in existingSchedules)
            {
                if (!scheduleLookup.ContainsKey(existing.ShopId))
                {
                    context.SmartCategoryShopDetails.Remove(existing);
                }
            }

            // Order channels
            var existingChannels = await context.SmartCategoryOrderChannelMappings
                .Where(c => c.AccountId == accountId && c.SmartCategoryId == smartCategoryId)
                .ToListAsync(cancellationToken);

            var channelLookup = channelPayload.ToDictionary(c => (c.ShopId, c.OrderChannelId));
            var existingChannelLookup = existingChannels.ToDictionary(c => (c.ShopId, c.OrderChannelId));

            foreach (var channel in channelPayload)
            {
                if (existingChannelLookup.TryGetValue((channel.ShopId, channel.OrderChannelId), out var entity))
                {
                    entity.Enabled = channel.Enabled;
                    entity.ModifiedDate = now;
                    entity.ModifiedBy = currentUser;
                }
                else
                {
                    context.SmartCategoryOrderChannelMappings.Add(new SmartCategoryOrderChannelMapping
                    {
                        AccountId = accountId,
                        ShopId = channel.ShopId,
                        SmartCategoryId = smartCategoryId,
                        OrderChannelId = channel.OrderChannelId,
                        Enabled = channel.Enabled,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    });
                }
            }

            foreach (var existing in existingChannels)
            {
                if (!channelLookup.ContainsKey((existing.ShopId, existing.OrderChannelId)))
                {
                    context.SmartCategoryOrderChannelMappings.Remove(existing);
                }
            }

            await context.SaveChangesAsync(cancellationToken);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating display settings for smart category {SmartCategoryId} in brand {BrandId}", smartCategoryId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating smart category display settings" });
        }
    }

    private static SmartCategoryDto MapToDto(SmartCategory entity)
    {
        return new SmartCategoryDto
        {
            SmartCategoryId = entity.SmartCategoryId,
            AccountId = entity.AccountId,
            ParentSmartCategoryId = entity.ParentSmartCategoryId,
            Name = entity.Name ?? string.Empty,
            NameAlt = entity.NameAlt,
            DisplayIndex = entity.DisplayIndex,
            Enabled = entity.Enabled,
            IsTerminal = entity.IsTerminal,
            IsPublicDisplay = entity.IsPublicDisplay,
            ButtonStyleId = entity.ButtonStyleId,
            Description = entity.Description,
            DescriptionAlt = entity.DescriptionAlt,
            ImageFileName = entity.ImageFileName,
            ImageFileName2 = entity.ImageFileName2,
            ImageFileName3 = entity.ImageFileName3,
            IsSelfOrderingDisplay = entity.IsSelfOrderingDisplay,
            IsOnlineStoreDisplay = entity.IsOnlineStoreDisplay,
            IsOdoDisplay = entity.IsOdoDisplay,
            IsKioskDisplay = entity.IsKioskDisplay,
            IsTableOrderingDisplay = entity.IsTableOrderingDisplay,
            OnlineStoreRefCategoryId = entity.OnlineStoreRefCategoryId,
            Remark = entity.Remark,
            RemarkAlt = entity.RemarkAlt,
            CreatedDate = entity.CreatedDate,
            CreatedBy = entity.CreatedBy ?? string.Empty,
            ModifiedDate = entity.ModifiedDate,
            ModifiedBy = entity.ModifiedBy ?? string.Empty
        };
    }

    private static Task<List<SmartCategoryItemAssignmentDto>> FetchCategoryItemsAsync(
        EWHQDbContext context,
        int accountId,
        int smartCategoryId,
        CancellationToken cancellationToken)
    {
        return context.SmartCategoryItemDetails
            .Where(i => i.AccountId == accountId && i.SmartCategoryId == smartCategoryId)
            .AsNoTracking()
            .Join(
                context.ItemMasters.Where(m => m.AccountId == accountId),
                detail => detail.ItemId,
                item => item.ItemId,
                (detail, item) => new SmartCategoryItemAssignmentDto
                {
                    ItemId = detail.ItemId,
                    ItemCode = item.ItemCode,
                    ItemName = item.ItemName ?? string.Empty,
                    ItemNameAlt = item.ItemNameAlt,
                    DisplayIndex = detail.DisplayIndex,
                    Enabled = detail.Enabled,
                    ModifiedDate = detail.ModifiedDate,
                    ModifiedBy = detail.ModifiedBy ?? string.Empty
                })
            .OrderBy(dto => dto.DisplayIndex)
            .ThenBy(dto => dto.ItemId)
            .ToListAsync(cancellationToken);
    }

    private static Task<List<SmartCategoryShopScheduleDto>> FetchShopSchedulesAsync(
        EWHQDbContext context,
        int accountId,
        int smartCategoryId,
        CancellationToken cancellationToken)
    {
        return context.SmartCategoryShopDetails
            .Where(s => s.AccountId == accountId && s.SmartCategoryId == smartCategoryId)
            .AsNoTracking()
            .Join(
                context.Shops.Where(shop => shop.AccountId == accountId),
                detail => detail.ShopId,
                shop => shop.ShopId,
                (detail, shop) => new SmartCategoryShopScheduleDto
                {
                    ShopId = detail.ShopId,
                    ShopName = shop.Name ?? string.Empty,
                    DisplayIndex = detail.DisplayIndex,
                    DisplayFromDate = detail.DisplayFromDate,
                    DisplayToDate = detail.DisplayToDate,
                    DisplayFromTime = detail.DisplayFromTime,
                    DisplayToTime = detail.DisplayToTime,
                    DisplayFromDateTime = detail.DisplayFromDateTime,
                    DisplayToDateTime = detail.DisplayToDateTime,
                    IsPublicDisplay = detail.IsPublicDisplay,
                    Enabled = detail.Enabled,
                    DayOfWeek = detail.DayOfWeek,
                    IsWeekdayHide = detail.IsWeekdayHide,
                    IsWeekendHide = detail.IsWeekendHide,
                    IsHolidayHide = detail.IsHolidayHide,
                    DaysOfWeek = detail.DaysOfWeek ?? string.Empty,
                    Months = detail.Months ?? string.Empty,
                    Dates = detail.Dates ?? string.Empty,
                    ModifiedDate = detail.ModifiedDate,
                    ModifiedBy = detail.ModifiedBy ?? string.Empty
                })
            .OrderBy(dto => dto.DisplayIndex)
            .ThenBy(dto => dto.ShopId)
            .ToListAsync(cancellationToken);
    }

    private static Task<List<SmartCategoryOrderChannelDto>> FetchOrderChannelsAsync(
        EWHQDbContext context,
        int accountId,
        int smartCategoryId,
        CancellationToken cancellationToken)
    {
        return context.SmartCategoryOrderChannelMappings
            .Where(c => c.AccountId == accountId && c.SmartCategoryId == smartCategoryId)
            .AsNoTracking()
            .Join(
                context.OrderChannels,
                mapping => mapping.OrderChannelId,
                channel => channel.OrderChannelId,
                (mapping, channel) => new { mapping, channel })
            .Join(
                context.Shops.Where(shop => shop.AccountId == accountId),
                composite => composite.mapping.ShopId,
                shop => shop.ShopId,
                (composite, shop) => new SmartCategoryOrderChannelDto
                {
                    ShopId = composite.mapping.ShopId,
                    ShopName = shop.Name ?? string.Empty,
                    OrderChannelId = composite.mapping.OrderChannelId,
                    Name = composite.channel.OrderChannelName ?? string.Empty,
                    NameAlt = composite.channel.OrderChannelNameAlt,
                    Enabled = composite.mapping.Enabled,
                    ModifiedDate = composite.mapping.ModifiedDate,
                    ModifiedBy = composite.mapping.ModifiedBy ?? string.Empty
                })
            .OrderBy(dto => dto.ShopId)
            .ThenBy(dto => dto.OrderChannelId)
            .ToListAsync(cancellationToken);
    }

    private static async Task<HashSet<int>> GetDescendantIdsAsync(
        EWHQDbContext context,
        int accountId,
        int rootSmartCategoryId,
        CancellationToken cancellationToken)
    {
        var result = new HashSet<int>();
        var queue = new Queue<int>();
        queue.Enqueue(rootSmartCategoryId);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();

            var children = await context.SmartCategories
                .Where(c => c.AccountId == accountId && c.ParentSmartCategoryId == current)
                .Select(c => c.SmartCategoryId)
                .ToListAsync(cancellationToken);

            foreach (var child in children)
            {
                if (result.Add(child))
                {
                    queue.Enqueue(child);
                }
            }
        }

        return result;
    }
}
