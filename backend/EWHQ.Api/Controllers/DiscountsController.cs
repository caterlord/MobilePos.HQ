using System;
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

    private static DiscountSummaryDto ToDto(Discount entity) =>
        new()
        {
            DiscountId = entity.DiscountId,
            AccountId = entity.AccountId,
            DiscountCode = entity.DiscountCode,
            DiscountName = entity.DiscountName,
            IsFixedAmount = entity.IsFixedAmount,
            DiscountPercent = entity.DiscountPercent,
            DiscountAmount = entity.DiscountAmount,
            Priority = entity.Priority,
            Enabled = entity.Enabled,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            StartTime = entity.StartTime,
            EndTime = entity.EndTime,
            ModifiedDate = entity.ModifiedDate,
            ModifiedBy = entity.ModifiedBy
        };

    private static ActionResult? ValidatePayload(UpsertDiscountDto payload)
    {
        var discountCode = payload.DiscountCode?.Trim();
        var discountName = payload.DiscountName?.Trim();

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
                .OrderByDescending(x => x.Enabled)
                .ThenBy(x => x.Priority)
                .ThenBy(x => x.DiscountName)
                .Select(x => new DiscountSummaryDto
                {
                    DiscountId = x.DiscountId,
                    AccountId = x.AccountId,
                    DiscountCode = x.DiscountCode,
                    DiscountName = x.DiscountName,
                    IsFixedAmount = x.IsFixedAmount,
                    DiscountPercent = x.DiscountPercent,
                    DiscountAmount = x.DiscountAmount,
                    Priority = x.Priority,
                    Enabled = x.Enabled,
                    StartDate = x.StartDate,
                    EndDate = x.EndDate,
                    StartTime = x.StartTime,
                    EndTime = x.EndTime,
                    ModifiedDate = x.ModifiedDate,
                    ModifiedBy = x.ModifiedBy
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(discounts);
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

            var discountCode = payload.DiscountCode.Trim();
            var discountName = payload.DiscountName.Trim();

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

            var nextId = (await context.Discounts
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.DiscountId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var entity = new Discount
            {
                DiscountId = nextId,
                AccountId = accountId,
                DiscountCode = discountCode,
                DiscountName = discountName,
                Priority = payload.Priority,
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
                Enabled = payload.Enabled,
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

            context.Discounts.Add(entity);
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToDto(entity));
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

            var discountCode = payload.DiscountCode.Trim();
            var discountName = payload.DiscountName.Trim();

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var entity = await context.Discounts
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.DiscountId == discountId,
                    HttpContext.RequestAborted);

            if (entity == null)
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

            entity.DiscountCode = discountCode;
            entity.DiscountName = discountName;
            entity.IsFixedAmount = payload.IsFixedAmount;
            entity.DiscountPercent = payload.DiscountPercent;
            entity.DiscountAmount = payload.DiscountAmount;
            entity.Priority = payload.Priority;
            entity.Enabled = payload.Enabled;
            entity.StartDate = payload.StartDate;
            entity.EndDate = payload.EndDate;
            entity.StartTime = payload.StartTime;
            entity.EndTime = payload.EndTime;
            entity.IsDateSpecific = payload.StartDate.HasValue
                                    || payload.EndDate.HasValue
                                    || payload.StartTime.HasValue
                                    || payload.EndTime.HasValue;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return Ok(ToDto(entity));
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
            var entity = await context.Discounts
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.DiscountId == discountId,
                    HttpContext.RequestAborted);

            if (entity == null)
            {
                return NotFound(new { message = "Discount not found." });
            }

            if (entity.Enabled)
            {
                entity.Enabled = false;
                entity.ModifiedDate = DateTime.UtcNow;
                entity.ModifiedBy = GetCurrentUserIdentifier();
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
            _logger.LogError(ex, "Error deactivating discount {DiscountId} for brand {BrandId}", discountId, brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the discount." });
        }
    }
}
