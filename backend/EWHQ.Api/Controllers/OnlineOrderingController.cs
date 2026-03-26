using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using EWHQ.Api.Authorization;
using EWHQ.Api.Data;
using EWHQ.Api.DTOs;
using EWHQ.Api.Models.Entities;
using EWHQ.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/online-ordering")]
[Authorize]
public class OnlineOrderingController : ControllerBase
{
    private const string SettingsTableName = "ONLINE_ORDERING";
    private const string GeneralSettingsField = "GENERAL_SETTINGS";
    private const string CallToActionField = "CALL_TO_ACTION";
    private const string UiI18nField = "UI_I18N";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly IPOSDbContextService _posContextService;
    private readonly ISettingsAuditService _settingsAuditService;
    private readonly ILogger<OnlineOrderingController> _logger;

    public OnlineOrderingController(
        IPOSDbContextService posContextService,
        ISettingsAuditService settingsAuditService,
        ILogger<OnlineOrderingController> logger)
    {
        _posContextService = posContextService;
        _settingsAuditService = settingsAuditService;
        _logger = logger;
    }

    [HttpGet("brand/{brandId:int}/lookups")]
    [RequireBrandView]
    public async Task<ActionResult<OnlineOrderingLookupsDto>> GetLookups(int brandId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            // EF Core DbContext is NOT thread-safe — all queries must be sequential
            var shops = await context.Shops
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.Name)
                .Select(x => new OnlineOrderingLookupItemDto
                {
                    Id = x.ShopId,
                    Name = x.Name ?? string.Empty,
                    AltName = x.AltName,
                    Code = x.ShopCode
                })
                .ToListAsync(cancellationToken);

            var channels = await context.OrderChannels
                .AsNoTracking()
                .OrderBy(x => x.OrderChannelName)
                .Select(x => new OnlineOrderingLookupItemDto
                {
                    Id = x.OrderChannelId,
                    Name = x.OrderChannelName ?? string.Empty,
                    AltName = x.OrderChannelNameAlt,
                    Code = x.OrderChannelCode
                })
                .ToListAsync(cancellationToken);

            var smartCategories = await context.SmartCategories
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && (x.IsOdoDisplay ?? false))
                .OrderBy(x => x.DisplayIndex)
                .ThenBy(x => x.Name)
                .Select(x => new OnlineOrderingLookupItemDto
                {
                    Id = x.SmartCategoryId,
                    Name = x.Name ?? string.Empty,
                    AltName = x.NameAlt
                })
                .ToListAsync(cancellationToken);

            var categoryIds = smartCategories.Select(x => x.Id).ToList();
            var odoItemCount = categoryIds.Count == 0
                ? 0
                : await context.SmartCategoryItemDetails
                    .AsNoTracking()
                    .Where(x => x.AccountId == accountId && x.Enabled && categoryIds.Contains(x.SmartCategoryId))
                    .Select(x => x.ItemId)
                    .Distinct()
                    .CountAsync(cancellationToken);

            var modifierGroupCount = await context.ModifierGroupHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && !(x.IsFollowSet ?? false) && (x.IsOdoDisplay ?? false))
                .CountAsync(cancellationToken);

            var mealSetCount = await context.ModifierGroupHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && (x.IsFollowSet ?? false) && (x.IsOdoDisplay ?? false))
                .CountAsync(cancellationToken);

            var languages = await context.DbMasterTableTranslations
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.DbTableName == SettingsTableName && x.DbFieldName == UiI18nField)
                .Select(x => x.LanguageCode)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync(cancellationToken);

            if (languages.Count == 0)
            {
                languages = ["en", "zh-HK"];
            }

            return Ok(new OnlineOrderingLookupsDto
            {
                Shops = shops,
                OrderChannels = channels,
                SmartCategories = smartCategories,
                Languages = languages,
                Summary = new OnlineOrderingMenuSummaryDto
                {
                    OdoCategoryCount = smartCategories.Count,
                    OdoItemCount = odoItemCount,
                    OdoModifierGroupCount = modifierGroupCount,
                    OdoMealSetCount = mealSetCount
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load online ordering lookups for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while loading online ordering lookups." });
        }
    }

    // ════════════════════════════════════════════════════════════════
    //  PER-SHOP ODO SETTINGS (stored in ShopSystemParameter)
    // ════════════════════════════════════════════════════════════════

    [HttpGet("brand/{brandId:int}/shop-settings")]
    [RequireBrandView]
    public async Task<IActionResult> GetShopSettingsList(int brandId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var shops = await context.Shops
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.Name)
                .Select(x => new { x.ShopId, x.Name })
                .ToListAsync(cancellationToken);

            var odoParams = await context.ShopSystemParameters
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled
                    && (x.ParamCode == "ODO_SETTING" || x.ParamCode == "ODO_ENABLED"))
                .Select(x => new { x.ShopId, x.ParamCode, x.ParamValue })
                .ToListAsync(cancellationToken);

            var paramsByShop = odoParams.ToLookup(x => x.ShopId);

            var result = shops.Select(shop =>
            {
                var shopParams = paramsByShop[shop.ShopId].ToList();
                var hasSettings = shopParams.Any(p => p.ParamCode == "ODO_SETTING");
                var enabledParam = shopParams.FirstOrDefault(p => p.ParamCode == "ODO_ENABLED");
                var isEnabled = enabledParam != null
                    && string.Equals(enabledParam.ParamValue, "True", StringComparison.OrdinalIgnoreCase);

                return new
                {
                    shopId = shop.ShopId,
                    shopName = shop.Name ?? $"Shop {shop.ShopId}",
                    hasSettings,
                    odoEnabled = isEnabled
                };
            }).ToList();

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching shop settings list for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    [HttpGet("brand/{brandId:int}/shop-settings/{shopId:int}")]
    [RequireBrandView]
    public async Task<IActionResult> GetShopSettings(int brandId, int shopId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var param = await context.ShopSystemParameters
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId
                        && x.ParamCode == "ODO_SETTING" && x.Enabled,
                    cancellationToken);

            if (param == null)
            {
                // Return empty settings object
                return Ok(new { });
            }

            // Return raw JSON — the frontend handles the schema
            return Content(param.ParamValue, "application/json");
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching shop settings for brand {BrandId} shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    [HttpPut("brand/{brandId:int}/shop-settings/{shopId:int}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> UpdateShopSettings(
        int brandId, int shopId,
        [FromBody] JsonElement settings,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var actor = GetCurrentUserIdentifier();
            var jsonString = JsonSerializer.Serialize(settings, JsonOptions);

            var param = await context.ShopSystemParameters
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId
                        && x.ParamCode == "ODO_SETTING",
                    cancellationToken);

            if (param == null)
            {
                // Create new — need next ParamId
                var nextId = (await context.ShopSystemParameters
                    .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                    .Select(x => (int?)x.ParamId)
                    .MaxAsync(cancellationToken) ?? 0) + 1;

                param = new ShopSystemParameter
                {
                    ParamId = nextId,
                    AccountId = accountId,
                    ShopId = shopId,
                    ParamCode = "ODO_SETTING",
                    Description = "ODO Settings",
                    ParamValue = jsonString,
                    Enabled = true,
                    CreatedDate = now,
                    CreatedBy = actor,
                    ModifiedDate = now,
                    ModifiedBy = actor
                };
                context.ShopSystemParameters.Add(param);
            }
            else
            {
                param.ParamValue = jsonString;
                param.Enabled = true;
                param.ModifiedDate = now;
                param.ModifiedBy = actor;
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "ONLINE_ORDERING",
                    ActionType = "UPSERT_SHOP_SETTINGS",
                    ActionRefId = $"ODO_SETTING:{shopId}",
                    ActionRefDescription = "ODO per-shop settings",
                    Details = "Updated online ordering settings for shop.",
                    Actor = actor
                },
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "Settings saved." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving shop settings for brand {BrandId} shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while saving settings." });
        }
    }

    [HttpPost("brand/{brandId:int}/copy-categories")]
    [RequireBrandModify]
    public async Task<IActionResult> CopyCategoriesToOdo(
        int brandId,
        [FromBody] CopyCategoriesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (request.SourceCategoryIds == null || request.SourceCategoryIds.Count == 0)
                return BadRequest(new { message = "No source categories provided." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var actor = GetCurrentUserIdentifier();

            var sourceCategories = await context.SmartCategories
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && request.SourceCategoryIds.Contains(x.SmartCategoryId))
                .ToListAsync(cancellationToken);

            var newIds = new List<int>();
            var maxId = await context.SmartCategories
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.SmartCategoryId)
                .MaxAsync(cancellationToken) ?? 0;

            foreach (var source in sourceCategories)
            {
                maxId++;
                var newCat = new SmartCategory
                {
                    SmartCategoryId = maxId,
                    AccountId = accountId,
                    Name = source.Name,
                    NameAlt = source.NameAlt,
                    ParentSmartCategoryId = null,
                    DisplayIndex = source.DisplayIndex,
                    Enabled = true,
                    IsTerminal = true,
                    IsPublicDisplay = true,
                    ButtonStyleId = source.ButtonStyleId,
                    Description = source.Description,
                    DescriptionAlt = source.DescriptionAlt,
                    ImageFileName = source.ImageFileName,
                    ImageFileName2 = source.ImageFileName2,
                    ImageFileName3 = source.ImageFileName3,
                    IsSelfOrderingDisplay = false,
                    IsOnlineStoreDisplay = false,
                    IsOdoDisplay = true,
                    IsKioskDisplay = false,
                    IsTableOrderingDisplay = false,
                    Remark = source.Remark,
                    CreatedDate = now,
                    CreatedBy = actor,
                    ModifiedDate = now,
                    ModifiedBy = actor,
                };
                context.SmartCategories.Add(newCat);

                // Copy items from source
                var sourceItems = await context.SmartCategoryItemDetails
                    .AsNoTracking()
                    .Where(x => x.AccountId == accountId && x.SmartCategoryId == source.SmartCategoryId && x.Enabled)
                    .ToListAsync(cancellationToken);

                foreach (var item in sourceItems)
                {
                    context.SmartCategoryItemDetails.Add(new SmartCategoryItemDetail
                    {
                        SmartCategoryId = maxId,
                        AccountId = accountId,
                        ItemId = item.ItemId,
                        DisplayIndex = item.DisplayIndex,
                        Enabled = true,
                        CreatedDate = now,
                        CreatedBy = actor,
                        ModifiedDate = now,
                        ModifiedBy = actor,
                    });
                }

                // Copy shop details
                var sourceShopDetails = await context.SmartCategoryShopDetails
                    .AsNoTracking()
                    .Where(x => x.AccountId == accountId && x.SmartCategoryId == source.SmartCategoryId && x.Enabled)
                    .ToListAsync(cancellationToken);

                foreach (var shopDetail in sourceShopDetails)
                {
                    context.SmartCategoryShopDetails.Add(new SmartCategoryShopDetail
                    {
                        SmartCategoryId = maxId,
                        AccountId = accountId,
                        ShopId = shopDetail.ShopId,
                        DisplayIndex = shopDetail.DisplayIndex,
                        Enabled = true,
                        DisplayFromDate = shopDetail.DisplayFromDate,
                        DisplayToDate = shopDetail.DisplayToDate,
                        DisplayFromTime = shopDetail.DisplayFromTime,
                        DisplayToTime = shopDetail.DisplayToTime,
                        DaysOfWeek = shopDetail.DaysOfWeek,
                        CreatedDate = now,
                        CreatedBy = actor,
                        ModifiedDate = now,
                        ModifiedBy = actor,
                    });
                }

                newIds.Add(maxId);
            }

            await context.SaveChangesAsync(cancellationToken);
            return Ok(new { newCategoryIds = newIds, count = newIds.Count });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error copying categories to ODO for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while copying categories." });
        }
    }

    [HttpGet("brand/{brandId:int}/display-order")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<OnlineOrderingDisplayOrderNodeDto>>> GetDisplayOrder(
        int brandId,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var result = await BuildDisplayOrderTreeAsync(context, accountId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load ODO display order for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while loading ODO display order." });
        }
    }

    [HttpPut("brand/{brandId:int}/display-order")]
    [RequireBrandModify]
    public async Task<IActionResult> UpdateDisplayOrder(
        int brandId,
        [FromBody] OnlineOrderingDisplayOrderUpdateRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Categories.Count == 0)
        {
            return BadRequest(new { message = "At least one category is required." });
        }

        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var categoryIds = request.Categories.Select(x => x.SmartCategoryId).ToList();
            if (categoryIds.Distinct().Count() != categoryIds.Count)
            {
                return BadRequest(new { message = "Duplicate smart category identifiers are not allowed." });
            }

            var categories = await context.SmartCategories
                .Where(x => x.AccountId == accountId && x.Enabled && (x.IsOdoDisplay ?? false) && categoryIds.Contains(x.SmartCategoryId))
                .ToListAsync(cancellationToken);

            if (categories.Count != categoryIds.Count)
            {
                return BadRequest(new { message = "One or more ODO smart categories could not be found." });
            }

            var payloadLookup = request.Categories.ToDictionary(x => x.SmartCategoryId);
            var now = DateTime.UtcNow;
            var actor = GetCurrentUserIdentifier();

            foreach (var category in categories)
            {
                var update = payloadLookup[category.SmartCategoryId];
                category.ParentSmartCategoryId = update.ParentSmartCategoryId;
                category.DisplayIndex = update.DisplayIndex;
                category.ModifiedDate = now;
                category.ModifiedBy = actor;
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "ONLINE_ORDERING",
                    ActionType = "UPDATE_DISPLAY_ORDER",
                    ActionRefId = "ODO_DISPLAY_ORDER",
                    ActionRefDescription = "ODO display order",
                    Details = $"Updated ODO display order for {categories.Count} categories.",
                    Actor = actor
                },
                cancellationToken);

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
            _logger.LogError(ex, "Failed to update ODO display order for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while saving ODO display order." });
        }
    }

    [HttpGet("brand/{brandId:int}/settings")]
    [RequireBrandView]
    public async Task<ActionResult<OnlineOrderingGeneralSettingsDto>> GetGeneralSettings(int brandId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var settings = await GetJsonDocumentAsync(
                    context,
                    accountId,
                    GeneralSettingsField,
                    0,
                    "json",
                    new OnlineOrderingGeneralSettingsDto(),
                    cancellationToken)
                ?? new OnlineOrderingGeneralSettingsDto();

            return Ok(settings);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load ODO general settings for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while loading online ordering settings." });
        }
    }

    [HttpPut("brand/{brandId:int}/settings")]
    [RequireBrandAdmin]
    public async Task<ActionResult<OnlineOrderingGeneralSettingsDto>> UpdateGeneralSettings(
        int brandId,
        [FromBody] OnlineOrderingGeneralSettingsDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var actor = GetCurrentUserIdentifier();
            await UpsertJsonDocumentAsync(
                context,
                accountId,
                GeneralSettingsField,
                0,
                "json",
                request,
                actor,
                cancellationToken);

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "ONLINE_ORDERING",
                    ActionType = "UPSERT_GENERAL_SETTINGS",
                    ActionRefId = GeneralSettingsField,
                    ActionRefDescription = "ODO general settings",
                    Details = "Updated online ordering general settings.",
                    Actor = actor
                },
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);
            return Ok(request);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update ODO general settings for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while saving online ordering settings." });
        }
    }

    [HttpGet("brand/{brandId:int}/call-to-action")]
    [RequireBrandView]
    public async Task<ActionResult<OnlineOrderingCallToActionSettingsDto>> GetCallToActionSettings(int brandId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var result = await GetJsonDocumentAsync(
                    context,
                    accountId,
                    CallToActionField,
                    0,
                    "json",
                    BuildDefaultCallToActionSettings(),
                    cancellationToken)
                ?? BuildDefaultCallToActionSettings();

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load ODO call-to-action settings for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while loading call-to-action settings." });
        }
    }

    [HttpPut("brand/{brandId:int}/call-to-action")]
    [RequireBrandAdmin]
    public async Task<ActionResult<OnlineOrderingCallToActionSettingsDto>> UpdateCallToActionSettings(
        int brandId,
        [FromBody] OnlineOrderingCallToActionSettingsDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var actor = GetCurrentUserIdentifier();

            await UpsertJsonDocumentAsync(
                context,
                accountId,
                CallToActionField,
                0,
                "json",
                request,
                actor,
                cancellationToken);

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "ONLINE_ORDERING",
                    ActionType = "UPSERT_CALL_TO_ACTION",
                    ActionRefId = CallToActionField,
                    ActionRefDescription = "ODO call-to-action settings",
                    Details = $"Updated {request.Slots.Count} call-to-action slots.",
                    Actor = actor
                },
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);
            return Ok(request);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update ODO call-to-action settings for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while saving call-to-action settings." });
        }
    }

    [HttpGet("brand/{brandId:int}/ui-i18n")]
    [RequireBrandView]
    public async Task<ActionResult<OnlineOrderingUiI18nResponseDto>> GetUiI18n(int brandId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var channels = await context.OrderChannels
                .AsNoTracking()
                .OrderBy(x => x.OrderChannelName)
                .Select(x => new { x.OrderChannelId, Name = x.OrderChannelName ?? string.Empty })
                .ToListAsync(cancellationToken);

            var translations = await context.DbMasterTableTranslations
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.DbTableName == SettingsTableName && x.DbFieldName == UiI18nField)
                .ToListAsync(cancellationToken);

            var languages = translations
                .Select(x => x.LanguageCode)
                .Distinct()
                .OrderBy(x => x)
                .ToList();

            if (languages.Count == 0)
            {
                languages = ["en", "zh-HK"];
            }

            var documents = channels
                .Select(channel => new OnlineOrderingUiI18nDocumentDto
                {
                    OrderChannelId = channel.OrderChannelId,
                    OrderChannelName = channel.Name,
                    Entries = languages
                        .Select(language => new OnlineOrderingUiI18nEntryDto
                        {
                            OrderChannelId = channel.OrderChannelId,
                            LanguageCode = language,
                            Content = translations
                                .FirstOrDefault(x => x.DbFieldId == channel.OrderChannelId && x.LanguageCode == language)
                                ?.ParamValue ?? "{}"
                        })
                        .ToList()
                })
                .ToList();

            return Ok(new OnlineOrderingUiI18nResponseDto
            {
                Languages = languages,
                Documents = documents
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load ODO UI i18n for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while loading ODO UI i18n." });
        }
    }

    [HttpPut("brand/{brandId:int}/ui-i18n")]
    [RequireBrandAdmin]
    public async Task<ActionResult<OnlineOrderingUiI18nResponseDto>> UpdateUiI18n(
        int brandId,
        [FromBody] OnlineOrderingUiI18nUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var actor = GetCurrentUserIdentifier();
            var now = DateTime.UtcNow;
            var existing = await context.DbMasterTableTranslations
                .Where(x => x.AccountId == accountId && x.DbTableName == SettingsTableName && x.DbFieldName == UiI18nField)
                .ToListAsync(cancellationToken);

            var payloadKeys = request.Entries
                .Select(x => (x.OrderChannelId, LanguageCode: x.LanguageCode.Trim()))
                .ToHashSet();

            foreach (var entry in request.Entries)
            {
                var languageCode = entry.LanguageCode.Trim();
                if (string.IsNullOrWhiteSpace(languageCode))
                {
                    return BadRequest(new { message = "Language code is required for every UI i18n entry." });
                }

                var entity = existing.FirstOrDefault(x => x.DbFieldId == entry.OrderChannelId && x.LanguageCode == languageCode);
                if (entity == null)
                {
                    entity = new DbMasterTableTranslation
                    {
                        AccountId = accountId,
                        DbTableName = SettingsTableName,
                        DbFieldName = UiI18nField,
                        DbFieldId = entry.OrderChannelId,
                        LanguageCode = languageCode,
                        CreatedDate = now,
                        CreatedBy = actor
                    };
                    context.DbMasterTableTranslations.Add(entity);
                    existing.Add(entity);
                }

                entity.ParamValue = entry.Content?.Trim().Length > 0 ? entry.Content : "{}";
                entity.ModifiedDate = now;
                entity.ModifiedBy = actor;
            }

            foreach (var entity in existing.Where(x => !payloadKeys.Contains((x.DbFieldId, x.LanguageCode))).ToList())
            {
                context.DbMasterTableTranslations.Remove(entity);
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "ONLINE_ORDERING",
                    ActionType = "UPSERT_UI_I18N",
                    ActionRefId = UiI18nField,
                    ActionRefDescription = "ODO UI i18n",
                    Details = $"Updated {request.Entries.Count} UI i18n documents.",
                    Actor = actor
                },
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);
            return await GetUiI18n(brandId, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update ODO UI i18n for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while saving ODO UI i18n." });
        }
    }

    [HttpGet("brand/{brandId:int}/menu-combinations")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<OnlineOrderingMenuCombinationDto>>> GetMenuCombinations(
        int brandId,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var result = await FetchMenuCombinationsAsync(context, accountId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load ODO menu combinations for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while loading ODO menu combinations." });
        }
    }

    [HttpPost("brand/{brandId:int}/menu-combinations")]
    [RequireBrandAdmin]
    public async Task<ActionResult<OnlineOrderingMenuCombinationDto>> CreateMenuCombination(
        int brandId,
        [FromBody] UpsertOnlineOrderingMenuCombinationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var actor = GetCurrentUserIdentifier();
            var now = DateTime.UtcNow;
            var menuId = (await context.MenuHeaders
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.MenuId)
                .MaxAsync(cancellationToken) ?? 0) + 1;

            var validationError = await ValidateMenuCombinationRequestAsync(context, accountId, request, cancellationToken);
            if (validationError != null)
            {
                return validationError;
            }

            context.MenuHeaders.Add(new MenuHeader
            {
                AccountId = accountId,
                MenuId = menuId,
                MenuName = request.MenuName.Trim(),
                MenuNameAlt = NullIfEmpty(request.MenuNameAlt) ?? string.Empty,
                MenuCode = NullIfEmpty(request.MenuCode) ?? string.Empty,
                DisplayOrder = request.DisplayOrder,
                Enabled = request.Enabled,
                IsPublished = request.IsPublished,
                IsBuiltIn = false,
                IsOdoDisplay = request.IsOdoDisplay,
                CreatedDate = now,
                CreatedBy = actor,
                ModifiedDate = now,
                ModifiedBy = actor
            });

            context.MenuHeaderMetaOnlines.Add(new MenuHeaderMetaOnline
            {
                AccountId = accountId,
                MenuId = menuId,
                IsFoodpandaMealForOne = request.IsFoodpandaMealForOne,
                CreatedDate = now,
                CreatedBy = actor,
                ModifiedDate = now,
                ModifiedBy = actor
            });

            foreach (var category in request.Categories)
            {
                context.MenuDetails.Add(new MenuDetail
                {
                    AccountId = accountId,
                    MenuId = menuId,
                    CategoryId = category.CategoryId,
                    IsSmartCategory = category.IsSmartCategory,
                    CreatedDate = now,
                    CreatedBy = actor,
                    ModifiedDate = now,
                    ModifiedBy = actor
                });
            }

            foreach (var shop in request.Shops)
            {
                context.MenuShopDetails.Add(ToMenuShopDetail(accountId, menuId, shop, actor, now));
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "ONLINE_ORDERING",
                    ActionType = "CREATE_MENU_COMBINATION",
                    ActionRefId = menuId.ToString(CultureInfo.InvariantCulture),
                    ActionRefDescription = request.MenuName.Trim(),
                    Details = $"Created ODO menu combination with {request.Categories.Count} categories and {request.Shops.Count} shops.",
                    Actor = actor
                },
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);
            var created = (await FetchMenuCombinationsAsync(context, accountId, cancellationToken))
                .First(x => x.MenuId == menuId);

            return CreatedAtAction(nameof(GetMenuCombinations), new { brandId }, created);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create ODO menu combination for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the ODO menu combination." });
        }
    }

    [HttpPut("brand/{brandId:int}/menu-combinations/{menuId:int}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<OnlineOrderingMenuCombinationDto>> UpdateMenuCombination(
        int brandId,
        int menuId,
        [FromBody] UpsertOnlineOrderingMenuCombinationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var header = await context.MenuHeaders
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.MenuId == menuId, cancellationToken);

            if (header == null)
            {
                return NotFound(new { message = "Menu combination not found." });
            }

            var validationError = await ValidateMenuCombinationRequestAsync(context, accountId, request, cancellationToken);
            if (validationError != null)
            {
                return validationError;
            }

            var actor = GetCurrentUserIdentifier();
            var now = DateTime.UtcNow;
            header.MenuName = request.MenuName.Trim();
            header.MenuNameAlt = NullIfEmpty(request.MenuNameAlt) ?? string.Empty;
            header.MenuCode = NullIfEmpty(request.MenuCode) ?? string.Empty;
            header.DisplayOrder = request.DisplayOrder;
            header.Enabled = request.Enabled;
            header.IsPublished = request.IsPublished;
            header.IsOdoDisplay = request.IsOdoDisplay;
            header.ModifiedDate = now;
            header.ModifiedBy = actor;

            var meta = await context.MenuHeaderMetaOnlines
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.MenuId == menuId, cancellationToken);
            if (meta == null)
            {
                meta = new MenuHeaderMetaOnline
                {
                    AccountId = accountId,
                    MenuId = menuId,
                    CreatedDate = now,
                    CreatedBy = actor
                };
                context.MenuHeaderMetaOnlines.Add(meta);
            }

            meta.IsFoodpandaMealForOne = request.IsFoodpandaMealForOne;
            meta.ModifiedDate = now;
            meta.ModifiedBy = actor;

            var existingDetails = await context.MenuDetails
                .Where(x => x.AccountId == accountId && x.MenuId == menuId)
                .ToListAsync(cancellationToken);
            context.MenuDetails.RemoveRange(existingDetails);

            var existingShopDetails = await context.MenuShopDetails
                .Where(x => x.AccountId == accountId && x.MenuId == menuId)
                .ToListAsync(cancellationToken);
            context.MenuShopDetails.RemoveRange(existingShopDetails);

            foreach (var category in request.Categories)
            {
                context.MenuDetails.Add(new MenuDetail
                {
                    AccountId = accountId,
                    MenuId = menuId,
                    CategoryId = category.CategoryId,
                    IsSmartCategory = category.IsSmartCategory,
                    CreatedDate = now,
                    CreatedBy = actor,
                    ModifiedDate = now,
                    ModifiedBy = actor
                });
            }

            foreach (var shop in request.Shops)
            {
                context.MenuShopDetails.Add(ToMenuShopDetail(accountId, menuId, shop, actor, now));
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "ONLINE_ORDERING",
                    ActionType = "UPDATE_MENU_COMBINATION",
                    ActionRefId = menuId.ToString(CultureInfo.InvariantCulture),
                    ActionRefDescription = request.MenuName.Trim(),
                    Details = $"Updated ODO menu combination with {request.Categories.Count} categories and {request.Shops.Count} shops.",
                    Actor = actor
                },
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);
            var updated = (await FetchMenuCombinationsAsync(context, accountId, cancellationToken))
                .First(x => x.MenuId == menuId);

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update ODO menu combination {MenuId} for brand {BrandId}", menuId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating the ODO menu combination." });
        }
    }

    [HttpDelete("brand/{brandId:int}/menu-combinations/{menuId:int}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> DeleteMenuCombination(int brandId, int menuId, CancellationToken cancellationToken)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var header = await context.MenuHeaders
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.MenuId == menuId, cancellationToken);

            if (header == null)
            {
                return NotFound(new { message = "Menu combination not found." });
            }

            var actor = GetCurrentUserIdentifier();
            header.Enabled = false;
            header.IsOdoDisplay = false;
            header.ModifiedDate = DateTime.UtcNow;
            header.ModifiedBy = actor;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "ONLINE_ORDERING",
                    ActionType = "DISABLE_MENU_COMBINATION",
                    ActionRefId = menuId.ToString(CultureInfo.InvariantCulture),
                    ActionRefDescription = header.MenuName,
                    Details = "Disabled ODO menu combination.",
                    Actor = actor
                },
                cancellationToken);

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
            _logger.LogError(ex, "Failed to disable ODO menu combination {MenuId} for brand {BrandId}", menuId, brandId);
            return StatusCode(500, new { message = "An error occurred while disabling the ODO menu combination." });
        }
    }

    private string GetCurrentUserIdentifier()
    {
        const int maxLength = 50;
        var identifier = User?.FindFirst(ClaimTypes.Email)?.Value
            ?? User?.FindFirst(ClaimTypes.Name)?.Value
            ?? "System";

        identifier = identifier.Trim();
        return identifier.Length <= maxLength ? identifier : identifier[..maxLength];
    }

    private static async Task<IReadOnlyList<OnlineOrderingDisplayOrderNodeDto>> BuildDisplayOrderTreeAsync(
        EWHQDbContext context,
        int accountId,
        CancellationToken cancellationToken)
    {
        var categories = await context.SmartCategories
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && x.Enabled && (x.IsOdoDisplay ?? false))
            .OrderBy(x => x.ParentSmartCategoryId ?? 0)
            .ThenBy(x => x.DisplayIndex)
            .ThenBy(x => x.SmartCategoryId)
            .ToListAsync(cancellationToken);

        var categoryIds = categories.Select(x => x.SmartCategoryId).ToList();
        var itemCounts = categoryIds.Count == 0
            ? new Dictionary<int, int>()
            : await context.SmartCategoryItemDetails
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && categoryIds.Contains(x.SmartCategoryId))
                .GroupBy(x => x.SmartCategoryId)
                .Select(group => new { group.Key, Count = group.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var nodes = categories.ToDictionary(
            x => x.SmartCategoryId,
            x => new OnlineOrderingDisplayOrderNodeDto
            {
                SmartCategoryId = x.SmartCategoryId,
                ParentSmartCategoryId = x.ParentSmartCategoryId,
                Name = x.Name ?? string.Empty,
                NameAlt = x.NameAlt,
                DisplayIndex = x.DisplayIndex,
                ItemCount = itemCounts.TryGetValue(x.SmartCategoryId, out var count) ? count : 0,
                Children = new List<OnlineOrderingDisplayOrderNodeDto>()
            });

        var roots = new List<OnlineOrderingDisplayOrderNodeDto>();
        foreach (var category in categories)
        {
            var node = nodes[category.SmartCategoryId];
            if (category.ParentSmartCategoryId.HasValue && nodes.TryGetValue(category.ParentSmartCategoryId.Value, out var parent))
            {
                ((List<OnlineOrderingDisplayOrderNodeDto>)parent.Children).Add(node);
            }
            else
            {
                roots.Add(node);
            }
        }

        return roots;
    }

    private static OnlineOrderingCallToActionSettingsDto BuildDefaultCallToActionSettings() =>
        new()
        {
            Slots =
            [
                new OnlineOrderingCallToActionSlotDto
                {
                    Placement = "cart",
                    Enabled = false,
                    Title = "Need something else?"
                },
                new OnlineOrderingCallToActionSlotDto
                {
                    Placement = "order-history",
                    Enabled = false,
                    Title = "Order again"
                }
            ]
        };

    private async Task<T?> GetJsonDocumentAsync<T>(
        EWHQDbContext context,
        int accountId,
        string fieldName,
        int fieldId,
        string languageCode,
        T defaultValue,
        CancellationToken cancellationToken)
    {
        var entity = await context.DbMasterTableTranslations
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.AccountId == accountId
                     && x.DbTableName == SettingsTableName
                     && x.DbFieldName == fieldName
                     && x.DbFieldId == fieldId
                     && x.LanguageCode == languageCode,
                cancellationToken);

        if (entity == null || string.IsNullOrWhiteSpace(entity.ParamValue))
        {
            return defaultValue;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(entity.ParamValue, JsonOptions) ?? defaultValue;
        }
        catch
        {
            return defaultValue;
        }
    }

    private async Task UpsertJsonDocumentAsync<T>(
        EWHQDbContext context,
        int accountId,
        string fieldName,
        int fieldId,
        string languageCode,
        T document,
        string actor,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var entity = await context.DbMasterTableTranslations
            .FirstOrDefaultAsync(
                x => x.AccountId == accountId
                     && x.DbTableName == SettingsTableName
                     && x.DbFieldName == fieldName
                     && x.DbFieldId == fieldId
                     && x.LanguageCode == languageCode,
                cancellationToken);

        if (entity == null)
        {
            entity = new DbMasterTableTranslation
            {
                AccountId = accountId,
                DbTableName = SettingsTableName,
                DbFieldName = fieldName,
                DbFieldId = fieldId,
                LanguageCode = languageCode,
                CreatedDate = now,
                CreatedBy = actor
            };

            context.DbMasterTableTranslations.Add(entity);
        }

        entity.ParamValue = JsonSerializer.Serialize(document, JsonOptions);
        entity.ModifiedDate = now;
        entity.ModifiedBy = actor;
    }

    private static string? NullIfEmpty(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private async Task<ActionResult?> ValidateMenuCombinationRequestAsync(
        EWHQDbContext context,
        int accountId,
        UpsertOnlineOrderingMenuCombinationRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.MenuName))
        {
            return BadRequest(new { message = "Menu name is required." });
        }

        if (request.Categories.Count == 0)
        {
            return BadRequest(new { message = "At least one category is required." });
        }

        if (request.Categories.Select(x => (x.CategoryId, x.IsSmartCategory)).Distinct().Count() != request.Categories.Count)
        {
            return BadRequest(new { message = "Duplicate categories are not allowed in a menu combination." });
        }

        if (request.Shops.Select(x => x.ShopId).Distinct().Count() != request.Shops.Count)
        {
            return BadRequest(new { message = "Duplicate shops are not allowed in a menu combination." });
        }

        var smartCategoryIds = request.Categories.Where(x => x.IsSmartCategory).Select(x => x.CategoryId).Distinct().ToList();
        if (smartCategoryIds.Count > 0)
        {
            var validSmartCount = await context.SmartCategories
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && smartCategoryIds.Contains(x.SmartCategoryId))
                .CountAsync(cancellationToken);
            if (validSmartCount != smartCategoryIds.Count)
            {
                return BadRequest(new { message = "One or more smart categories are invalid." });
            }
        }

        var categoryIds = request.Categories.Where(x => !x.IsSmartCategory).Select(x => x.CategoryId).Distinct().ToList();
        if (categoryIds.Count > 0)
        {
            var validCategoryCount = await context.ItemCategories
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && categoryIds.Contains(x.CategoryId))
                .CountAsync(cancellationToken);
            if (validCategoryCount != categoryIds.Count)
            {
                return BadRequest(new { message = "One or more categories are invalid." });
            }
        }

        var shopIds = request.Shops.Select(x => x.ShopId).Distinct().ToList();
        if (shopIds.Count > 0)
        {
            var validShopCount = await context.Shops
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && shopIds.Contains(x.ShopId))
                .CountAsync(cancellationToken);
            if (validShopCount != shopIds.Count)
            {
                return BadRequest(new { message = "One or more shops are invalid." });
            }
        }

        return null;
    }

    private static MenuShopDetail ToMenuShopDetail(
        int accountId,
        int menuId,
        UpsertOnlineOrderingMenuCombinationShopDto source,
        string actor,
        DateTime now) =>
        new()
        {
            AccountId = accountId,
            MenuId = menuId,
            ShopId = source.ShopId,
            Enabled = source.Enabled,
            IsPublicDisplay = source.IsPublicDisplay,
            DaysOfWeek = NullIfEmpty(source.DaysOfWeek) ?? string.Empty,
            Dates = NullIfEmpty(source.Dates) ?? string.Empty,
            Months = NullIfEmpty(source.Months) ?? string.Empty,
            DisplayFromTime = ParseTime(source.DisplayFromTime),
            DisplayToTime = ParseTime(source.DisplayToTime),
            CreatedDate = now,
            CreatedBy = actor,
            ModifiedDate = now,
            ModifiedBy = actor
        };

    private static TimeSpan? ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return TimeSpan.TryParse(value, CultureInfo.InvariantCulture, out var result) ? result : null;
    }

    private static string? FormatTime(TimeSpan? value) =>
        value.HasValue ? value.Value.ToString(@"hh\:mm", CultureInfo.InvariantCulture) : null;

    private static async Task<List<OnlineOrderingMenuCombinationDto>> FetchMenuCombinationsAsync(
        EWHQDbContext context,
        int accountId,
        CancellationToken cancellationToken)
    {
        var headers = await context.MenuHeaders
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && (x.IsOdoDisplay ?? false))
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.MenuId)
            .ToListAsync(cancellationToken);

        var menuIds = headers.Select(x => x.MenuId).ToList();
        if (menuIds.Count == 0)
        {
            return [];
        }

        var details = await context.MenuDetails
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && menuIds.Contains(x.MenuId))
            .ToListAsync(cancellationToken);

        var shopDetails = await context.MenuShopDetails
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && menuIds.Contains(x.MenuId))
            .ToListAsync(cancellationToken);

        var metaLookup = await context.MenuHeaderMetaOnlines
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && menuIds.Contains(x.MenuId))
            .ToDictionaryAsync(x => x.MenuId, cancellationToken);

        var smartCategoryIds = details.Where(x => x.IsSmartCategory).Select(x => x.CategoryId).Distinct().ToList();
        var itemCategoryIds = details.Where(x => !x.IsSmartCategory).Select(x => x.CategoryId).Distinct().ToList();
        var shopIds = shopDetails.Select(x => x.ShopId).Distinct().ToList();

        var smartCategoryLookup = smartCategoryIds.Count == 0
            ? new Dictionary<int, SmartCategory>()
            : await context.SmartCategories
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && smartCategoryIds.Contains(x.SmartCategoryId))
                .ToDictionaryAsync(x => x.SmartCategoryId, cancellationToken);

        var itemCategoryLookup = itemCategoryIds.Count == 0
            ? new Dictionary<int, ItemCategory>()
            : await context.ItemCategories
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && itemCategoryIds.Contains(x.CategoryId))
                .ToDictionaryAsync(x => x.CategoryId, cancellationToken);

        var shopLookup = shopIds.Count == 0
            ? new Dictionary<int, Shop>()
            : await context.Shops
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && shopIds.Contains(x.ShopId))
                .ToDictionaryAsync(x => x.ShopId, cancellationToken);

        return headers
            .Select(header => new OnlineOrderingMenuCombinationDto
            {
                MenuId = header.MenuId,
                MenuName = header.MenuName,
                MenuNameAlt = header.MenuNameAlt,
                MenuCode = header.MenuCode,
                DisplayOrder = header.DisplayOrder,
                Enabled = header.Enabled,
                IsPublished = header.IsPublished,
                IsOdoDisplay = header.IsOdoDisplay ?? false,
                IsFoodpandaMealForOne = metaLookup.TryGetValue(header.MenuId, out var meta) && (meta.IsFoodpandaMealForOne ?? false),
                Categories = details
                    .Where(x => x.MenuId == header.MenuId)
                    .Select(x => new OnlineOrderingMenuCombinationCategoryDto
                    {
                        CategoryId = x.CategoryId,
                        IsSmartCategory = x.IsSmartCategory,
                        Name = x.IsSmartCategory
                            ? smartCategoryLookup.TryGetValue(x.CategoryId, out var smart) ? smart.Name ?? $"Smart Category #{x.CategoryId}" : $"Smart Category #{x.CategoryId}"
                            : itemCategoryLookup.TryGetValue(x.CategoryId, out var category) ? category.CategoryName ?? $"Category #{x.CategoryId}" : $"Category #{x.CategoryId}"
                    })
                    .ToList(),
                Shops = shopDetails
                    .Where(x => x.MenuId == header.MenuId)
                    .OrderBy(x => x.ShopId)
                    .Select(x => new OnlineOrderingMenuCombinationShopDto
                    {
                        ShopId = x.ShopId,
                        ShopName = shopLookup.TryGetValue(x.ShopId, out var shop) ? shop.Name ?? $"Shop #{x.ShopId}" : $"Shop #{x.ShopId}",
                        Enabled = x.Enabled,
                        IsPublicDisplay = x.IsPublicDisplay,
                        DaysOfWeek = x.DaysOfWeek,
                        Dates = x.Dates,
                        Months = x.Months,
                        DisplayFromTime = FormatTime(x.DisplayFromTime),
                        DisplayToTime = FormatTime(x.DisplayToTime)
                    })
                    .ToList()
            })
            .ToList();
    }
}
