using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using EWHQ.Api.Authorization;
using EWHQ.Api.Constants;
using EWHQ.Api.Data;
using EWHQ.Api.DTOs;
using EWHQ.Api.Models.Entities;
using EWHQ.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/discounts")]
[Authorize]
public class DiscountsController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<DiscountsController> _logger;

    public DiscountsController(IPOSDbContextService posContextService, ILogger<DiscountsController> logger)
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

    private static string Clip(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static DiscountSummaryDto ToDto(Discount discount, BundlePromoOverview? overview)
    {
        var priority = overview?.Priority ?? discount.Priority;
        return new DiscountSummaryDto
        {
            DiscountId = discount.DiscountId,
            AccountId = discount.AccountId,
            BundlePromoOverviewId = overview?.BundlePromoOverviewId,
            BundlePromoHeaderTypeId = overview?.BundlePromoHeaderTypeId ?? BundlePromoHeaderTypes.DefaultDiscountType,
            DiscountCode = discount.DiscountCode,
            DiscountName = discount.DiscountName,
            BundlePromoDesc = overview?.BundlePromoDesc,
            IsFixedAmount = discount.IsFixedAmount,
            DiscountPercent = discount.DiscountPercent,
            DiscountAmount = discount.DiscountAmount,
            Priority = priority,
            Enabled = discount.Enabled,
            IsAvailable = overview?.IsAvailable ?? discount.Enabled,
            StartDate = discount.StartDate,
            EndDate = discount.EndDate,
            StartTime = discount.StartTime,
            EndTime = discount.EndTime,
            ModifiedDate = discount.ModifiedDate,
            ModifiedBy = discount.ModifiedBy
        };
    }

    private static int ResolveRequestedType(UpsertDiscountDto payload) =>
        payload.BundlePromoHeaderTypeId == 0
            ? BundlePromoHeaderTypes.DefaultDiscountType
            : payload.BundlePromoHeaderTypeId;

    private static bool ResolveAvailability(UpsertDiscountDto payload) => payload.Enabled && payload.IsAvailable;

    private static ActionResult? ValidatePayload(UpsertDiscountDto payload)
    {
        var discountCode = payload.DiscountCode?.Trim();
        var discountName = payload.DiscountName?.Trim();
        var requestedType = ResolveRequestedType(payload);

        if (!BundlePromoHeaderTypes.DiscountTypes.Contains(requestedType))
        {
            return new BadRequestObjectResult(new { message = "Invalid discount header type." });
        }

        if (string.IsNullOrWhiteSpace(discountCode))
        {
            return new BadRequestObjectResult(new { message = "Discount code is required." });
        }

        if (string.IsNullOrWhiteSpace(discountName))
        {
            return new BadRequestObjectResult(new { message = "Discount name is required." });
        }

        if (payload.StartDate.HasValue && payload.EndDate.HasValue && payload.StartDate > payload.EndDate)
        {
            return new BadRequestObjectResult(new { message = "Start date must be earlier than or equal to end date." });
        }

        if (payload.Priority < 0)
        {
            return new BadRequestObjectResult(new { message = "Priority must be 0 or greater." });
        }

        if (payload.IsFixedAmount)
        {
            if (!payload.DiscountAmount.HasValue || payload.DiscountAmount.Value < 0)
            {
                return new BadRequestObjectResult(new { message = "Discount amount must be provided for fixed amount discounts." });
            }
        }
        else
        {
            if (!payload.DiscountPercent.HasValue || payload.DiscountPercent.Value < 0)
            {
                return new BadRequestObjectResult(new { message = "Discount percent must be provided for percentage discounts." });
            }
        }

        return null;
    }

    private static IReadOnlyList<int> ParseIdList(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return Array.Empty<int>();
        }

        return value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(entry => int.TryParse(entry, out var parsed) ? parsed : 0)
            .Where(parsed => parsed > 0)
            .Distinct()
            .ToList();
    }

    private static string SerializeIdList(IEnumerable<int>? values) =>
        string.Join(
            ',',
            (values ?? Array.Empty<int>())
                .Where(value => value > 0)
                .Distinct()
                .OrderBy(value => value));

    private static bool IsFixedAmountType(int typeId) =>
        typeId == BundlePromoHeaderTypes.DiscountFix || typeId == BundlePromoHeaderTypes.DiscountFixItem;

    private static bool IsPercentType(int typeId) =>
        typeId == BundlePromoHeaderTypes.DiscountPercent || typeId == BundlePromoHeaderTypes.DiscountPercentItem;

    private static bool IsOpenAmountType(int typeId) => typeId == BundlePromoHeaderTypes.DiscountOpen;

    private async Task<DiscountRuleEditorDto?> BuildDiscountRuleEditorAsync(
        EWHQDbContext context,
        int accountId,
        int discountId,
        CancellationToken cancellationToken)
    {
        var discount = await context.Discounts
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && x.DiscountId == discountId)
            .Select(x => new
            {
                x.DiscountId,
                x.AccountId,
                DiscountCode = x.DiscountCode ?? string.Empty,
                DiscountName = x.DiscountName ?? string.Empty,
                x.Priority,
                x.Enabled,
                x.IsDateSpecific,
                x.IsAutoCalculate,
                x.IsOpenAmount,
                x.IsFixedAmount,
                x.DiscountPercent,
                x.DiscountAmount,
                x.StartDate,
                x.EndDate,
                x.StartTime,
                x.EndTime,
                IsNoOtherLoyalty = x.IsNoOtherLoyalty ?? false,
                MandatoryIncludedCategoryIdList = x.MandatoryIncludedCategoryIdList ?? string.Empty,
                MandatoryIncludedItemIdList = x.MandatoryIncludedItemIdList ?? string.Empty,
                MandatoryIncludedModifierItemIdList = x.MandatoryIncludedModifierItemIdList ?? string.Empty,
                MandatoryExcludedCategoryIdList = x.MandatoryExcludedCategoryIdList ?? string.Empty,
                MandatoryExcludedItemIdList = x.MandatoryExcludedItemIdList ?? string.Empty,
                MandatoryExcludedModifierItemIdList = x.MandatoryExcludedModifierItemIdList ?? string.Empty,
                x.PriceSpecific,
                x.PriceHigherThanEqualToSpecific,
                x.PriceLowerThanEqualToSpecific,
                IsLinkedWithThirdPartyLoyalty = x.IsLinkedWithThirdPartyLoyalty ?? false,
                LinkedThirdPartyLoyaltyCode = x.LinkedThirdPartyLoyaltyCode ?? string.Empty,
                IsAppliedOnItemLevel = x.IsAppliedOnItemLevel ?? false,
                x.UpgradeModifierItemId,
                DiscountTag = x.DiscountTag ?? string.Empty,
                DiscountBenefitModifierAmountAdjustment = x.DiscountBenefitModifierAmountAdjustment ?? string.Empty,
                x.MinOrderAmount,
                x.MaxOrderAmount,
                x.MinMatchedItemAmount,
                x.MaxMatchedItemAmount,
                x.MinMatchedItemQty,
                x.MaxDiscountAmount,
                x.MaxDiscountQty,
                x.DiscountFirstQty,
                ConditionalDayOfWeeks = x.ConditionalDayOfWeeks ?? string.Empty,
                ConditionalMonths = x.ConditionalMonths ?? string.Empty,
                ConditionalDates = x.ConditionalDates ?? string.Empty,
                x.ConditionalStartDate,
                x.ConditionalEndDate,
                x.ConditionalStartTime,
                x.ConditionalEndTime,
                CalculateIncludedSubItems = x.CalculateIncludedSubItems ?? false,
                MatchMultiple = x.MatchMultiple ?? false,
                DiscountedCategoryIdList = x.DiscountedCategoryIdList ?? string.Empty,
                DiscountedItemIdList = x.DiscountedItemIdList ?? string.Empty,
                DiscountedModifierItemIdList = x.DiscountedModifierItemIdList ?? string.Empty,
                DiscountedItemPriceOrderDescending = x.DiscountedItemPriceOrderDescending ?? false,
                PromoHeaderIdList = x.PromoHeaderIdList ?? string.Empty
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (discount == null)
        {
            return null;
        }

        var overview = await context.BundlePromoOverviews
            .AsNoTracking()
            .Where(
                x => x.AccountId == accountId
                     && x.BundlePromoRefId == discountId
                     && BundlePromoHeaderTypes.DiscountTypes.Contains(x.BundlePromoHeaderTypeId))
            .OrderByDescending(x => x.Enabled)
            .ThenBy(x => x.Priority)
            .Select(x => new
            {
                x.BundlePromoOverviewId,
                x.BundlePromoHeaderTypeId,
                BundlePromoDesc = x.BundlePromoDesc ?? string.Empty,
                x.IsAvailable
            })
            .FirstOrDefaultAsync(cancellationToken);

        var shopOverrides = await context.DiscountShopDetails
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && x.DiscountId == discountId)
            .Select(x => new { x.ShopId, x.Enabled })
            .ToListAsync(cancellationToken);

        var overrideMap = shopOverrides.ToDictionary(x => x.ShopId, x => x.Enabled);
        var hasOverrides = overrideMap.Count > 0;

        var shops = (await context.Shops
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && x.Enabled)
            .OrderBy(x => x.Name)
            .Select(x => new
            {
                x.ShopId,
                ShopName = x.Name ?? string.Empty
            })
            .ToListAsync(cancellationToken))
            .Select(shop => new DiscountShopRuleDto
            {
                ShopId = shop.ShopId,
                ShopName = shop.ShopName,
                Enabled = hasOverrides
                    ? overrideMap.TryGetValue(shop.ShopId, out var enabled) && enabled
                    : true
            })
            .ToList();

        return new DiscountRuleEditorDto
        {
            DiscountId = discount.DiscountId,
            AccountId = discount.AccountId,
            BundlePromoOverviewId = overview?.BundlePromoOverviewId,
            BundlePromoHeaderTypeId = overview?.BundlePromoHeaderTypeId ?? BundlePromoHeaderTypes.DefaultDiscountType,
            DiscountCode = discount.DiscountCode,
            DiscountName = discount.DiscountName,
            BundlePromoDesc = string.IsNullOrWhiteSpace(overview?.BundlePromoDesc) ? null : overview!.BundlePromoDesc,
            Priority = discount.Priority,
            Enabled = discount.Enabled,
            IsAvailable = overview?.IsAvailable ?? discount.Enabled,
            IsDateSpecific = discount.IsDateSpecific,
            IsAutoCalculate = discount.IsAutoCalculate,
            IsOpenAmount = discount.IsOpenAmount,
            IsFixedAmount = discount.IsFixedAmount,
            DiscountPercent = discount.DiscountPercent,
            DiscountAmount = discount.DiscountAmount,
            StartDate = discount.StartDate,
            EndDate = discount.EndDate,
            StartTime = discount.StartTime,
            EndTime = discount.EndTime,
            IsNoOtherLoyalty = discount.IsNoOtherLoyalty,
            MandatoryIncludedCategoryIds = ParseIdList(discount.MandatoryIncludedCategoryIdList),
            MandatoryIncludedItemIds = ParseIdList(discount.MandatoryIncludedItemIdList),
            MandatoryIncludedModifierItemIds = ParseIdList(discount.MandatoryIncludedModifierItemIdList),
            MandatoryExcludedCategoryIds = ParseIdList(discount.MandatoryExcludedCategoryIdList),
            MandatoryExcludedItemIds = ParseIdList(discount.MandatoryExcludedItemIdList),
            MandatoryExcludedModifierItemIds = ParseIdList(discount.MandatoryExcludedModifierItemIdList),
            PriceSpecific = discount.PriceSpecific,
            PriceHigherThanEqualToSpecific = discount.PriceHigherThanEqualToSpecific,
            PriceLowerThanEqualToSpecific = discount.PriceLowerThanEqualToSpecific,
            IsLinkedWithThirdPartyLoyalty = discount.IsLinkedWithThirdPartyLoyalty,
            LinkedThirdPartyLoyaltyCode = string.IsNullOrWhiteSpace(discount.LinkedThirdPartyLoyaltyCode) ? null : discount.LinkedThirdPartyLoyaltyCode,
            IsAppliedOnItemLevel = discount.IsAppliedOnItemLevel,
            UpgradeModifierItemId = discount.UpgradeModifierItemId,
            DiscountTag = string.IsNullOrWhiteSpace(discount.DiscountTag) ? null : discount.DiscountTag,
            DiscountBenefitModifierAmountAdjustment = string.IsNullOrWhiteSpace(discount.DiscountBenefitModifierAmountAdjustment) ? null : discount.DiscountBenefitModifierAmountAdjustment,
            MinOrderAmount = discount.MinOrderAmount,
            MaxOrderAmount = discount.MaxOrderAmount,
            MinMatchedItemAmount = discount.MinMatchedItemAmount,
            MaxMatchedItemAmount = discount.MaxMatchedItemAmount,
            MinMatchedItemQty = discount.MinMatchedItemQty,
            MaxDiscountAmount = discount.MaxDiscountAmount,
            MaxDiscountQty = discount.MaxDiscountQty,
            DiscountFirstQty = discount.DiscountFirstQty,
            ConditionalDayOfWeeks = discount.ConditionalDayOfWeeks,
            ConditionalMonths = discount.ConditionalMonths,
            ConditionalDates = discount.ConditionalDates,
            ConditionalStartDate = discount.ConditionalStartDate,
            ConditionalEndDate = discount.ConditionalEndDate,
            ConditionalStartTime = discount.ConditionalStartTime,
            ConditionalEndTime = discount.ConditionalEndTime,
            CalculateIncludedSubItems = discount.CalculateIncludedSubItems,
            MatchMultiple = discount.MatchMultiple,
            DiscountedCategoryIds = ParseIdList(discount.DiscountedCategoryIdList),
            DiscountedItemIds = ParseIdList(discount.DiscountedItemIdList),
            DiscountedModifierItemIds = ParseIdList(discount.DiscountedModifierItemIdList),
            DiscountedItemPriceOrderDescending = discount.DiscountedItemPriceOrderDescending,
            PromoHeaderIds = ParseIdList(discount.PromoHeaderIdList),
            ShopRules = shops
        };
    }

    [HttpGet("brand/{brandId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<DiscountSummaryDto>>> GetDiscounts(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var discounts = await context.Discounts
                .AsNoTracking()
                .Where(x => x.AccountId == accountId)
                .Select(x => new DiscountSummaryDto
                {
                    DiscountId = x.DiscountId,
                    AccountId = x.AccountId,
                    BundlePromoOverviewId = null,
                    BundlePromoHeaderTypeId = BundlePromoHeaderTypes.DefaultDiscountType,
                    DiscountCode = x.DiscountCode ?? string.Empty,
                    DiscountName = x.DiscountName ?? string.Empty,
                    BundlePromoDesc = null,
                    IsFixedAmount = x.IsFixedAmount,
                    DiscountPercent = x.DiscountPercent,
                    DiscountAmount = x.DiscountAmount,
                    Priority = x.Priority,
                    Enabled = x.Enabled,
                    IsAvailable = x.Enabled,
                    StartDate = x.StartDate,
                    EndDate = x.EndDate,
                    StartTime = x.StartTime,
                    EndTime = x.EndTime,
                    ModifiedDate = x.ModifiedDate,
                    ModifiedBy = x.ModifiedBy ?? string.Empty
                })
                .ToListAsync(HttpContext.RequestAborted);

            var discountTypeIds = BundlePromoHeaderTypes.DiscountTypes.ToArray();

            List<OverviewSnapshot> overviews;
            try
            {
                overviews = await context.BundlePromoOverviews
                    .AsNoTracking()
                    .Where(x => x.AccountId == accountId && discountTypeIds.Contains(x.BundlePromoHeaderTypeId))
                    .Select(x => new OverviewSnapshot
                    {
                        BundlePromoOverviewId = x.BundlePromoOverviewId,
                        BundlePromoHeaderTypeId = x.BundlePromoHeaderTypeId,
                        BundlePromoRefId = x.BundlePromoRefId,
                        Priority = x.Priority,
                        IsAvailable = x.IsAvailable,
                        Enabled = x.Enabled
                    })
                    .ToListAsync(HttpContext.RequestAborted);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Failed loading BundlePromoOverview rows for account {AccountId}. Returning discounts without overview metadata.",
                    accountId);
                overviews = [];
            }

            var overviewByRef = overviews
                .GroupBy(x => x.BundlePromoRefId)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.Enabled).ThenBy(x => x.Priority).First());

            var response = discounts
                .Select(discount =>
                {
                    if (overviewByRef.TryGetValue(discount.DiscountId, out var overview))
                    {
                        discount.BundlePromoOverviewId = overview.BundlePromoOverviewId;
                        discount.BundlePromoHeaderTypeId = overview.BundlePromoHeaderTypeId;
                        discount.BundlePromoDesc = null;
                        discount.Priority = overview.Priority;
                        discount.IsAvailable = overview.IsAvailable;
                    }

                    return discount;
                })
                .OrderByDescending(x => x.Enabled)
                .ThenBy(x => x.Priority)
                .ThenBy(x => x.DiscountName)
                .ToList();

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching discounts for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching discounts." });
        }
    }

    [HttpPost("brand/{brandId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<DiscountSummaryDto>> CreateDiscount(int brandId, UpsertDiscountDto payload)
    {
        try
        {
            var validationError = ValidatePayload(payload);
            if (validationError != null)
            {
                return validationError;
            }

            var discountCode = Clip(payload.DiscountCode, 50);
            var discountName = Clip(payload.DiscountName, 200);
            var discountNameForOverview = Clip(payload.DiscountName, 500);
            var discountDesc = Clip(payload.BundlePromoDesc, 4000);
            var requestedType = ResolveRequestedType(payload);
            var isAvailable = ResolveAvailability(payload);

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var normalizedCode = discountCode.ToUpperInvariant();
            var duplicateCode = await context.Discounts
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId && x.DiscountCode.ToUpper() == normalizedCode,
                    HttpContext.RequestAborted);

            if (duplicateCode)
            {
                return Conflict(new { message = "A discount with the same code already exists." });
            }

            var nextDiscountId = (await context.Discounts
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.DiscountId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var nextOverviewId = (await context.BundlePromoOverviews
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.BundlePromoOverviewId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var nextPriority = (await context.BundlePromoOverviews
                .Where(x => x.AccountId == accountId && x.Enabled && BundlePromoHeaderTypes.DiscountTypes.Contains(x.BundlePromoHeaderTypeId))
                .Select(x => (int?)x.Priority)
                .MaxAsync(HttpContext.RequestAborted) ?? -1) + 1;

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var effectivePriority = payload.Priority > 0 ? payload.Priority : nextPriority;

            var discount = new Discount
            {
                DiscountId = nextDiscountId,
                AccountId = accountId,
                DiscountCode = discountCode,
                DiscountName = discountName,
                Priority = effectivePriority,
                IsDateSpecific = payload.StartDate.HasValue
                                 || payload.EndDate.HasValue
                                 || payload.StartTime.HasValue
                                 || payload.EndTime.HasValue,
                IsFixedAmount = payload.IsFixedAmount,
                DiscountPercent = payload.DiscountPercent,
                DiscountAmount = payload.DiscountAmount,
                StartDate = payload.StartDate,
                EndDate = payload.EndDate,
                StartTime = payload.StartTime,
                EndTime = payload.EndTime,
                Enabled = isAvailable,
                CreatedDate = now,
                CreatedBy = currentUser,
                ModifiedDate = now,
                ModifiedBy = currentUser,
                IsAutoCalculate = false,
                IsOpenAmount = false,
                IsSystemDiscount = false,
                IsNoOtherLoyalty = false,
                MandatoryIncludedCategoryIdList = string.Empty,
                MandatoryIncludedItemIdList = string.Empty,
                MandatoryIncludedModifierItemIdList = string.Empty,
                MandatoryExcludedCategoryIdList = string.Empty,
                MandatoryExcludedItemIdList = string.Empty,
                MandatoryExcludedModifierItemIdList = string.Empty,
                PriceSpecific = null,
                PriceHigherThanEqualToSpecific = null,
                PriceLowerThanEqualToSpecific = null,
                IsLinkedWithThirdPartyLoyalty = false,
                LinkedThirdPartyLoyaltyCode = string.Empty,
                IsAppliedOnItemLevel = false,
                UpgradeModifierItemId = null,
                DiscountTag = string.Empty,
                DiscountBenefitModifierAmountAdjustment = string.Empty,
                DiscountPrice = null,
                TotalDiscountAmount = null,
                TotalAmount = null,
                PromoHeaderIdList = string.Empty,
                MinOrderAmount = null,
                MaxOrderAmount = null,
                MinMatchedItemAmount = null,
                MaxMatchedItemAmount = null,
                MinMatchedItemQty = null,
                MaxDiscountAmount = null,
                MaxDiscountQty = null,
                DiscountFirstQty = null,
                ConditionalDayOfWeeks = string.Empty,
                ConditionalMonths = string.Empty,
                ConditionalDates = string.Empty,
                ConditionalStartDate = null,
                ConditionalEndDate = null,
                ConditionalStartTime = null,
                ConditionalEndTime = null,
                CalculateIncludedSubItems = false,
                MatchMultiple = false,
                DiscountedCategoryIdList = string.Empty,
                DiscountedItemIdList = string.Empty,
                DiscountedModifierItemIdList = string.Empty,
                DiscountedItemPriceOrderDescending = false
            };

            var overview = new BundlePromoOverview
            {
                AccountId = accountId,
                BundlePromoOverviewId = nextOverviewId,
                BundlePromoCode = discountCode,
                BundlePromoName = discountNameForOverview,
                BundlePromoDesc = discountDesc,
                BundlePromoHeaderTypeId = requestedType,
                BundlePromoRefId = nextDiscountId,
                Priority = effectivePriority,
                IsAvailable = isAvailable,
                Enabled = true,
                CreatedDate = now,
                CreatedBy = currentUser,
                ModifiedDate = now,
                ModifiedBy = currentUser
            };

            context.Discounts.Add(discount);
            context.BundlePromoOverviews.Add(overview);
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToDto(discount, overview));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating discount for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the discount." });
        }
    }

    [HttpPut("brand/{brandId:int}/{discountId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<DiscountSummaryDto>> UpdateDiscount(int brandId, int discountId, UpsertDiscountDto payload)
    {
        try
        {
            var validationError = ValidatePayload(payload);
            if (validationError != null)
            {
                return validationError;
            }

            var discountCode = Clip(payload.DiscountCode, 50);
            var discountName = Clip(payload.DiscountName, 200);
            var discountNameForOverview = Clip(payload.DiscountName, 500);
            var discountDesc = Clip(payload.BundlePromoDesc, 4000);
            var requestedType = ResolveRequestedType(payload);
            var isAvailable = ResolveAvailability(payload);

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var discount = await context.Discounts
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.DiscountId == discountId,
                    HttpContext.RequestAborted);

            if (discount == null)
            {
                return NotFound(new { message = "Discount not found." });
            }

            var normalizedCode = discountCode.ToUpperInvariant();
            var duplicateCode = await context.Discounts
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.DiscountId != discountId
                         && x.DiscountCode.ToUpper() == normalizedCode,
                    HttpContext.RequestAborted);

            if (duplicateCode)
            {
                return Conflict(new { message = "A discount with the same code already exists." });
            }

            var overview = await context.BundlePromoOverviews
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId
                         && x.BundlePromoRefId == discountId
                         && BundlePromoHeaderTypes.DiscountTypes.Contains(x.BundlePromoHeaderTypeId),
                    HttpContext.RequestAborted);

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var effectivePriority = payload.Priority > 0
                ? payload.Priority
                : overview?.Priority ?? discount.Priority;

            if (overview == null)
            {
                var nextOverviewId = (await context.BundlePromoOverviews
                    .Where(x => x.AccountId == accountId)
                    .Select(x => (int?)x.BundlePromoOverviewId)
                    .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

                overview = new BundlePromoOverview
                {
                    AccountId = accountId,
                    BundlePromoOverviewId = nextOverviewId,
                    BundlePromoRefId = discountId,
                    Enabled = true,
                    CreatedDate = now,
                    CreatedBy = currentUser
                };
                context.BundlePromoOverviews.Add(overview);
            }

            overview.BundlePromoHeaderTypeId = requestedType;
            overview.BundlePromoCode = discountCode;
            overview.BundlePromoName = discountNameForOverview;
            overview.BundlePromoDesc = discountDesc;
            overview.Priority = effectivePriority;
            overview.IsAvailable = isAvailable;
            overview.Enabled = true;
            overview.ModifiedDate = now;
            overview.ModifiedBy = currentUser;

            discount.DiscountCode = discountCode;
            discount.DiscountName = discountName;
            discount.IsFixedAmount = payload.IsFixedAmount;
            discount.DiscountPercent = payload.DiscountPercent;
            discount.DiscountAmount = payload.DiscountAmount;
            discount.Priority = effectivePriority;
            discount.Enabled = isAvailable;
            discount.StartDate = payload.StartDate;
            discount.EndDate = payload.EndDate;
            discount.StartTime = payload.StartTime;
            discount.EndTime = payload.EndTime;
            discount.IsDateSpecific = payload.StartDate.HasValue
                                    || payload.EndDate.HasValue
                                    || payload.StartTime.HasValue
                                    || payload.EndTime.HasValue;
            discount.ModifiedDate = now;
            discount.ModifiedBy = currentUser;

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return Ok(ToDto(discount, overview));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating discount {DiscountId} for brand {BrandId}", discountId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating the discount." });
        }
    }

    [HttpGet("brand/{brandId:int}/{discountId:int}/rule-editor")]
    [RequireBrandView]
    public async Task<ActionResult<DiscountRuleEditorDto>> GetDiscountRuleEditor(int brandId, int discountId)
    {
        int? accountId = null;
        try
        {
            var (context, resolvedAccountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            accountId = resolvedAccountId;
            var response = await BuildDiscountRuleEditorAsync(context, resolvedAccountId, discountId, HttpContext.RequestAborted);
            if (response == null)
            {
                return NotFound(new { message = "Discount not found." });
            }

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error fetching discount rule editor for discount {DiscountId}, brand {BrandId}, account {AccountId}",
                discountId,
                brandId,
                accountId);
            return StatusCode(500, new { message = "An error occurred while loading the discount rule editor." });
        }
    }

    [HttpPut("brand/{brandId:int}/{discountId:int}/rule-editor")]
    [RequireBrandModify]
    public async Task<ActionResult<DiscountRuleEditorDto>> UpdateDiscountRuleEditor(
        int brandId,
        int discountId,
        UpdateDiscountRuleEditorDto payload)
    {
        int? accountId = null;
        try
        {
            var requestedType = payload.BundlePromoHeaderTypeId == 0
                ? BundlePromoHeaderTypes.DefaultDiscountType
                : payload.BundlePromoHeaderTypeId;

            if (!BundlePromoHeaderTypes.DiscountTypes.Contains(requestedType))
            {
                return BadRequest(new { message = "Invalid discount header type." });
            }

            var discountCode = Clip(payload.DiscountCode, 50);
            var discountName = Clip(payload.DiscountName, 200);
            var discountNameForOverview = Clip(payload.DiscountName, 500);
            var discountDesc = Clip(payload.BundlePromoDesc, 4000);
            var linkedThirdPartyCode = Clip(payload.LinkedThirdPartyLoyaltyCode, 50);
            var discountTag = Clip(payload.DiscountTag, 500);
            var discountBenefitAdjustment = Clip(payload.DiscountBenefitModifierAmountAdjustment, 1000);
            var conditionalDayOfWeeks = Clip(payload.ConditionalDayOfWeeks, 100);
            var conditionalMonths = Clip(payload.ConditionalMonths, 100);
            var conditionalDates = Clip(payload.ConditionalDates, 150);

            if (string.IsNullOrWhiteSpace(discountCode))
            {
                return BadRequest(new { message = "Discount code is required." });
            }

            if (string.IsNullOrWhiteSpace(discountName))
            {
                return BadRequest(new { message = "Discount name is required." });
            }

            if (payload.Priority < 0)
            {
                return BadRequest(new { message = "Priority must be 0 or greater." });
            }

            if (payload.StartDate.HasValue && payload.EndDate.HasValue && payload.StartDate > payload.EndDate)
            {
                return BadRequest(new { message = "Start date must be earlier than or equal to end date." });
            }

            if (payload.ConditionalStartDate.HasValue
                && payload.ConditionalEndDate.HasValue
                && payload.ConditionalStartDate > payload.ConditionalEndDate)
            {
                return BadRequest(new { message = "Conditional start date must be earlier than or equal to conditional end date." });
            }

            if ((payload.DiscountAmount ?? 0m) < 0m
                || (payload.DiscountPercent ?? 0m) < 0m
                || (payload.PriceSpecific ?? 0m) < 0m
                || (payload.PriceHigherThanEqualToSpecific ?? 0m) < 0m
                || (payload.PriceLowerThanEqualToSpecific ?? 0m) < 0m
                || (payload.MinOrderAmount ?? 0m) < 0m
                || (payload.MaxOrderAmount ?? 0m) < 0m
                || (payload.MinMatchedItemAmount ?? 0m) < 0m
                || (payload.MaxMatchedItemAmount ?? 0m) < 0m
                || (payload.MinMatchedItemQty ?? 0m) < 0m
                || (payload.MaxDiscountAmount ?? 0m) < 0m
                || (payload.MaxDiscountQty ?? 0m) < 0m
                || (payload.DiscountFirstQty ?? 0m) < 0m)
            {
                return BadRequest(new { message = "Numeric discount rule values cannot be negative." });
            }

            if (IsFixedAmountType(requestedType) && (!payload.DiscountAmount.HasValue || payload.DiscountAmount.Value < 0))
            {
                return BadRequest(new { message = "Discount amount is required for fixed discount types." });
            }

            if (IsPercentType(requestedType) && (!payload.DiscountPercent.HasValue || payload.DiscountPercent.Value < 0))
            {
                return BadRequest(new { message = "Discount percent is required for percent discount types." });
            }

            var mandatoryIncludedCategoryIds = (payload.MandatoryIncludedCategoryIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            var mandatoryIncludedItemIds = (payload.MandatoryIncludedItemIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            var mandatoryIncludedModifierItemIds = (payload.MandatoryIncludedModifierItemIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            var mandatoryExcludedCategoryIds = (payload.MandatoryExcludedCategoryIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            var mandatoryExcludedItemIds = (payload.MandatoryExcludedItemIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            var mandatoryExcludedModifierItemIds = (payload.MandatoryExcludedModifierItemIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            var discountedCategoryIds = (payload.DiscountedCategoryIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            var discountedItemIds = (payload.DiscountedItemIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            var discountedModifierItemIds = (payload.DiscountedModifierItemIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            var promoHeaderIds = (payload.PromoHeaderIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            var categoryIds = mandatoryIncludedCategoryIds
                .Concat(mandatoryExcludedCategoryIds)
                .Concat(discountedCategoryIds)
                .Distinct()
                .ToList();

            var itemIds = mandatoryIncludedItemIds
                .Concat(mandatoryIncludedModifierItemIds)
                .Concat(mandatoryExcludedItemIds)
                .Concat(mandatoryExcludedModifierItemIds)
                .Concat(discountedItemIds)
                .Concat(discountedModifierItemIds)
                .Concat(payload.UpgradeModifierItemId.HasValue && payload.UpgradeModifierItemId.Value > 0
                    ? [payload.UpgradeModifierItemId.Value]
                    : Array.Empty<int>())
                .Distinct()
                .ToList();

            var normalizedShopRules = (payload.ShopRules ?? Array.Empty<DiscountShopRuleDto>())
                .Where(shop => shop != null)
                .GroupBy(shop => shop.ShopId)
                .Select(group => group.Last())
                .ToList();
            var requestedShopIds = normalizedShopRules.Select(shop => shop.ShopId).Distinct().ToList();

            var (context, resolvedAccountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            accountId = resolvedAccountId;
            var discount = await context.Discounts
                .FirstOrDefaultAsync(
                    x => x.AccountId == resolvedAccountId && x.DiscountId == discountId,
                    HttpContext.RequestAborted);

            if (discount == null)
            {
                return NotFound(new { message = "Discount not found." });
            }

            var normalizedCode = discountCode.ToUpperInvariant();
            var duplicateCode = await context.Discounts
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == resolvedAccountId
                         && x.DiscountId != discountId
                         && x.DiscountCode.ToUpper() == normalizedCode,
                    HttpContext.RequestAborted);
            if (duplicateCode)
            {
                return Conflict(new { message = "A discount with the same code already exists." });
            }

            if (categoryIds.Count > 0)
            {
                var validCategoryCount = await context.ItemCategories
                    .AsNoTracking()
                    .CountAsync(
                        category => category.AccountId == resolvedAccountId && categoryIds.Contains(category.CategoryId),
                        HttpContext.RequestAborted);
                if (validCategoryCount != categoryIds.Count)
                {
                    return BadRequest(new { message = "One or more category IDs are invalid for this brand." });
                }
            }

            if (itemIds.Count > 0)
            {
                var validItemCount = await context.ItemMasters
                    .AsNoTracking()
                    .CountAsync(
                        item => item.AccountId == resolvedAccountId && itemIds.Contains(item.ItemId),
                        HttpContext.RequestAborted);
                if (validItemCount != itemIds.Count)
                {
                    return BadRequest(new { message = "One or more item IDs are invalid for this brand." });
                }
            }

            if (promoHeaderIds.Count > 0)
            {
                var validPromoHeaderCount = await context.PromoHeaders
                    .AsNoTracking()
                    .CountAsync(
                        header => header.AccountId == resolvedAccountId && promoHeaderIds.Contains(header.PromoHeaderId),
                        HttpContext.RequestAborted);
                if (validPromoHeaderCount != promoHeaderIds.Count)
                {
                    return BadRequest(new { message = "One or more promo header IDs are invalid for this brand." });
                }
            }

            if (requestedShopIds.Count > 0)
            {
                var validShopCount = await context.Shops
                    .AsNoTracking()
                    .CountAsync(shop => shop.AccountId == resolvedAccountId && shop.Enabled && requestedShopIds.Contains(shop.ShopId), HttpContext.RequestAborted);
                if (validShopCount != requestedShopIds.Count)
                {
                    return BadRequest(new { message = "One or more shop IDs are invalid for this brand." });
                }
            }

            var overview = await context.BundlePromoOverviews
                .FirstOrDefaultAsync(
                    x => x.AccountId == resolvedAccountId
                         && x.BundlePromoRefId == discountId
                         && BundlePromoHeaderTypes.DiscountTypes.Contains(x.BundlePromoHeaderTypeId),
                        HttpContext.RequestAborted);

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var isAvailable = payload.Enabled && payload.IsAvailable;

            if (overview == null)
            {
                var nextOverviewId = (await context.BundlePromoOverviews
                    .Where(x => x.AccountId == resolvedAccountId)
                    .Select(x => (int?)x.BundlePromoOverviewId)
                    .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

                overview = new BundlePromoOverview
                {
                    AccountId = resolvedAccountId,
                    BundlePromoOverviewId = nextOverviewId,
                    BundlePromoRefId = discountId,
                    Enabled = true,
                    CreatedDate = now,
                    CreatedBy = currentUser
                };
                context.BundlePromoOverviews.Add(overview);
            }

            overview.BundlePromoHeaderTypeId = requestedType;
            overview.BundlePromoCode = discountCode;
            overview.BundlePromoName = discountNameForOverview;
            overview.BundlePromoDesc = discountDesc;
            overview.Priority = payload.Priority;
            overview.IsAvailable = isAvailable;
            overview.Enabled = true;
            overview.ModifiedDate = now;
            overview.ModifiedBy = currentUser;

            discount.DiscountCode = discountCode;
            discount.DiscountName = discountName;
            discount.Priority = payload.Priority;
            discount.Enabled = isAvailable;
            discount.IsAutoCalculate = payload.IsAutoCalculate;
            discount.IsOpenAmount = IsOpenAmountType(requestedType);
            discount.IsFixedAmount = IsFixedAmountType(requestedType);
            discount.DiscountPercent = IsPercentType(requestedType) ? payload.DiscountPercent : null;
            discount.DiscountAmount = IsFixedAmountType(requestedType)
                ? payload.DiscountAmount
                : IsOpenAmountType(requestedType)
                    ? 0
                    : null;
            discount.StartDate = payload.StartDate;
            discount.EndDate = payload.EndDate;
            discount.StartTime = payload.StartTime;
            discount.EndTime = payload.EndTime;
            discount.IsDateSpecific = payload.StartDate.HasValue
                                    || payload.EndDate.HasValue
                                    || payload.StartTime.HasValue
                                    || payload.EndTime.HasValue;
            discount.IsNoOtherLoyalty = payload.IsNoOtherLoyalty;
            discount.MandatoryIncludedCategoryIdList = SerializeIdList(mandatoryIncludedCategoryIds);
            discount.MandatoryIncludedItemIdList = SerializeIdList(mandatoryIncludedItemIds);
            discount.MandatoryIncludedModifierItemIdList = SerializeIdList(mandatoryIncludedModifierItemIds);
            discount.MandatoryExcludedCategoryIdList = SerializeIdList(mandatoryExcludedCategoryIds);
            discount.MandatoryExcludedItemIdList = SerializeIdList(mandatoryExcludedItemIds);
            discount.MandatoryExcludedModifierItemIdList = SerializeIdList(mandatoryExcludedModifierItemIds);
            discount.PriceSpecific = payload.PriceSpecific;
            discount.PriceHigherThanEqualToSpecific = payload.PriceHigherThanEqualToSpecific;
            discount.PriceLowerThanEqualToSpecific = payload.PriceLowerThanEqualToSpecific;
            discount.IsLinkedWithThirdPartyLoyalty = payload.IsLinkedWithThirdPartyLoyalty;
            discount.LinkedThirdPartyLoyaltyCode = linkedThirdPartyCode;
            discount.IsAppliedOnItemLevel = payload.IsAppliedOnItemLevel;
            discount.UpgradeModifierItemId = payload.UpgradeModifierItemId;
            discount.DiscountTag = discountTag;
            discount.DiscountBenefitModifierAmountAdjustment = discountBenefitAdjustment;
            discount.MinOrderAmount = payload.MinOrderAmount;
            discount.MaxOrderAmount = payload.MaxOrderAmount;
            discount.MinMatchedItemAmount = payload.MinMatchedItemAmount;
            discount.MaxMatchedItemAmount = payload.MaxMatchedItemAmount;
            discount.MinMatchedItemQty = payload.MinMatchedItemQty;
            discount.MaxDiscountAmount = payload.MaxDiscountAmount;
            discount.MaxDiscountQty = payload.MaxDiscountQty;
            discount.DiscountFirstQty = payload.DiscountFirstQty;
            discount.ConditionalDayOfWeeks = conditionalDayOfWeeks;
            discount.ConditionalMonths = conditionalMonths;
            discount.ConditionalDates = conditionalDates;
            discount.ConditionalStartDate = payload.ConditionalStartDate;
            discount.ConditionalEndDate = payload.ConditionalEndDate;
            discount.ConditionalStartTime = payload.ConditionalStartTime;
            discount.ConditionalEndTime = payload.ConditionalEndTime;
            discount.CalculateIncludedSubItems = payload.CalculateIncludedSubItems;
            discount.MatchMultiple = payload.MatchMultiple;
            discount.DiscountedCategoryIdList = SerializeIdList(discountedCategoryIds);
            discount.DiscountedItemIdList = SerializeIdList(discountedItemIds);
            discount.DiscountedModifierItemIdList = SerializeIdList(discountedModifierItemIds);
            discount.DiscountedItemPriceOrderDescending = payload.DiscountedItemPriceOrderDescending;
            discount.PromoHeaderIdList = SerializeIdList(promoHeaderIds);
            discount.ModifiedDate = now;
            discount.ModifiedBy = currentUser;

            await context.DiscountShopDetails
                .Where(detail => detail.AccountId == resolvedAccountId && detail.DiscountId == discountId)
                .ExecuteDeleteAsync(HttpContext.RequestAborted);

            foreach (var shop in normalizedShopRules)
            {
                context.DiscountShopDetails.Add(new DiscountShopDetail
                {
                    DiscountId = discountId,
                    ShopId = shop.ShopId,
                    AccountId = resolvedAccountId,
                    Enabled = shop.Enabled,
                    CreatedDate = now,
                    CreatedBy = currentUser,
                    ModifiedDate = now,
                    ModifiedBy = currentUser
                });
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            var response = await BuildDiscountRuleEditorAsync(context, resolvedAccountId, discountId, HttpContext.RequestAborted);
            if (response == null)
            {
                return NotFound(new { message = "Discount not found." });
            }

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error updating discount rule editor for discount {DiscountId}, brand {BrandId}, account {AccountId}",
                discountId,
                brandId,
                accountId);
            return StatusCode(500, new { message = "An error occurred while saving discount rule editor settings." });
        }
    }

    [HttpDelete("brand/{brandId:int}/{discountId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivateDiscount(int brandId, int discountId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var discount = await context.Discounts
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.DiscountId == discountId,
                    HttpContext.RequestAborted);

            if (discount == null)
            {
                return NotFound(new { message = "Discount not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            discount.Enabled = false;
            discount.ModifiedDate = now;
            discount.ModifiedBy = currentUser;

            var overviews = await context.BundlePromoOverviews
                .Where(
                    x => x.AccountId == accountId
                         && x.BundlePromoRefId == discountId
                         && BundlePromoHeaderTypes.DiscountTypes.Contains(x.BundlePromoHeaderTypeId))
                .ToListAsync(HttpContext.RequestAborted);

            if (overviews.Count > 0)
            {
                context.BundlePromoOverviews.RemoveRange(overviews);
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating discount {DiscountId} for brand {BrandId}", discountId, brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the discount." });
        }
    }

    private sealed class OverviewSnapshot
    {
        public int BundlePromoOverviewId { get; init; }
        public int BundlePromoHeaderTypeId { get; init; }
        public int BundlePromoRefId { get; init; }
        public int Priority { get; init; }
        public bool IsAvailable { get; init; }
        public bool Enabled { get; init; }
    }
}
