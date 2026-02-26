using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using EWHQ.Api.Authorization;
using EWHQ.Api.Constants;
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
