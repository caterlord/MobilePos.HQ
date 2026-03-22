using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
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
[Route("api/bundle-promo-overviews")]
[Authorize]
public class BundlePromoOverviewsController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<BundlePromoOverviewsController> _logger;

    public BundlePromoOverviewsController(IPOSDbContextService posContextService, ILogger<BundlePromoOverviewsController> logger)
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

    private static bool IsSupportedHeaderType(int typeId) =>
        BundlePromoHeaderTypes.PromotionTypes.Contains(typeId)
        || BundlePromoHeaderTypes.DiscountTypes.Contains(typeId)
        || BundlePromoHeaderTypes.MealSetTypes.Contains(typeId);

    private static BundlePromoOverviewLifecycleDto ToLifecycleDto(BundlePromoOverview overview) =>
        new()
        {
            BundlePromoOverviewId = overview.BundlePromoOverviewId,
            BundlePromoHeaderTypeId = overview.BundlePromoHeaderTypeId,
            BundlePromoRefId = overview.BundlePromoRefId,
            IsAvailable = overview.IsAvailable,
            Enabled = overview.Enabled,
            Priority = overview.Priority,
            ModifiedDate = overview.ModifiedDate,
            ModifiedBy = overview.ModifiedBy
        };

    [HttpPut("brand/{brandId:int}/batch")]
    [RequireBrandModify]
    public async Task<ActionResult<IReadOnlyList<BundlePromoOverviewLifecycleDto>>> UpdateBatch(
        int brandId,
        UpdateBundlePromoOverviewsDto payload)
    {
        try
        {
            var entries = (payload.Entries ?? Array.Empty<UpdateBundlePromoOverviewEntryDto>())
                .Where(entry => entry != null)
                .ToList();

            if (entries.Count == 0)
            {
                return BadRequest(new { message = "At least one overview entry is required." });
            }

            if (entries.GroupBy(entry => entry.BundlePromoOverviewId).Any(group => group.Count() > 1))
            {
                return BadRequest(new { message = "Duplicate bundle promo overview IDs are not allowed." });
            }

            if (entries.Any(entry => !IsSupportedHeaderType(entry.BundlePromoHeaderTypeId)))
            {
                return BadRequest(new { message = "One or more bundle promo header types are invalid." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var overviewIds = entries.Select(entry => entry.BundlePromoOverviewId).ToList();
            var overviews = await context.BundlePromoOverviews
                .Where(overview => overview.AccountId == accountId && overviewIds.Contains(overview.BundlePromoOverviewId))
                .ToListAsync(HttpContext.RequestAborted);

            if (overviews.Count != overviewIds.Count)
            {
                return BadRequest(new { message = "One or more bundle promo overviews were not found for this brand." });
            }

            var promoRefIds = entries
                .Where(entry => BundlePromoHeaderTypes.PromotionTypes.Contains(entry.BundlePromoHeaderTypeId))
                .Select(entry => entry.BundlePromoRefId)
                .Distinct()
                .ToList();

            var discountRefIds = entries
                .Where(entry => BundlePromoHeaderTypes.DiscountTypes.Contains(entry.BundlePromoHeaderTypeId))
                .Select(entry => entry.BundlePromoRefId)
                .Distinct()
                .ToList();

            var promos = promoRefIds.Count == 0
                ? new Dictionary<int, PromoHeader>()
                : await context.PromoHeaders
                    .Where(header => header.AccountId == accountId && promoRefIds.Contains(header.PromoHeaderId))
                    .ToDictionaryAsync(header => header.PromoHeaderId, HttpContext.RequestAborted);

            if (promos.Count != promoRefIds.Count)
            {
                return BadRequest(new { message = "One or more referenced promotions are invalid for this brand." });
            }

            var discounts = discountRefIds.Count == 0
                ? new Dictionary<int, Discount>()
                : await context.Discounts
                    .Where(discount => discount.AccountId == accountId && discountRefIds.Contains(discount.DiscountId))
                    .ToDictionaryAsync(discount => discount.DiscountId, HttpContext.RequestAborted);

            if (discounts.Count != discountRefIds.Count)
            {
                return BadRequest(new { message = "One or more referenced discounts are invalid for this brand." });
            }

            var overviewMap = overviews.ToDictionary(overview => overview.BundlePromoOverviewId);
            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            for (var index = 0; index < entries.Count; index++)
            {
                var entry = entries[index];
                var priority = index + 1;
                var overview = overviewMap[entry.BundlePromoOverviewId];

                overview.BundlePromoHeaderTypeId = entry.BundlePromoHeaderTypeId;
                overview.BundlePromoRefId = entry.BundlePromoRefId;
                overview.Priority = priority;
                overview.IsAvailable = entry.IsAvailable;
                overview.Enabled = true;
                overview.ModifiedDate = now;
                overview.ModifiedBy = currentUser;

                if (BundlePromoHeaderTypes.PromotionTypes.Contains(entry.BundlePromoHeaderTypeId))
                {
                    var promo = promos[entry.BundlePromoRefId];
                    promo.Priority = priority;
                    promo.Enabled = entry.IsAvailable;
                    promo.ModifiedDate = now;
                    promo.ModifiedBy = currentUser;
                }
                else if (BundlePromoHeaderTypes.DiscountTypes.Contains(entry.BundlePromoHeaderTypeId))
                {
                    var discount = discounts[entry.BundlePromoRefId];
                    discount.Priority = priority;
                    discount.Enabled = entry.IsAvailable;
                    discount.ModifiedDate = now;
                    discount.ModifiedBy = currentUser;
                }
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var response = entries
                .Select(entry => ToLifecycleDto(overviewMap[entry.BundlePromoOverviewId]))
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
            _logger.LogError(ex, "Error updating bundle promo overviews for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while updating bundle promo overviews." });
        }
    }

    [HttpDelete("brand/{brandId:int}/batch")]
    [RequireBrandModify]
    public async Task<IActionResult> DeleteBatch(int brandId, DeleteBundlePromoOverviewsDto payload)
    {
        try
        {
            var overviewIds = (payload.BundlePromoOverviewIds ?? Array.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            if (overviewIds.Count == 0)
            {
                return BadRequest(new { message = "At least one valid bundle promo overview ID is required." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var overviews = await context.BundlePromoOverviews
                .Where(overview => overview.AccountId == accountId && overviewIds.Contains(overview.BundlePromoOverviewId))
                .ToListAsync(HttpContext.RequestAborted);

            if (overviews.Count != overviewIds.Count)
            {
                return BadRequest(new { message = "One or more bundle promo overviews were not found for this brand." });
            }

            var promoRefIds = overviews
                .Where(overview => BundlePromoHeaderTypes.PromotionTypes.Contains(overview.BundlePromoHeaderTypeId))
                .Select(overview => overview.BundlePromoRefId)
                .Distinct()
                .ToList();

            var discountRefIds = overviews
                .Where(overview => BundlePromoHeaderTypes.DiscountTypes.Contains(overview.BundlePromoHeaderTypeId))
                .Select(overview => overview.BundlePromoRefId)
                .Distinct()
                .ToList();

            var promos = promoRefIds.Count == 0
                ? new Dictionary<int, PromoHeader>()
                : await context.PromoHeaders
                    .Where(header => header.AccountId == accountId && promoRefIds.Contains(header.PromoHeaderId))
                    .ToDictionaryAsync(header => header.PromoHeaderId, HttpContext.RequestAborted);

            var discounts = discountRefIds.Count == 0
                ? new Dictionary<int, Discount>()
                : await context.Discounts
                    .Where(discount => discount.AccountId == accountId && discountRefIds.Contains(discount.DiscountId))
                    .ToDictionaryAsync(discount => discount.DiscountId, HttpContext.RequestAborted);

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            foreach (var overview in overviews)
            {
                if (BundlePromoHeaderTypes.PromotionTypes.Contains(overview.BundlePromoHeaderTypeId)
                    && promos.TryGetValue(overview.BundlePromoRefId, out var promo))
                {
                    promo.Enabled = false;
                    promo.ModifiedDate = now;
                    promo.ModifiedBy = currentUser;
                }
                else if (BundlePromoHeaderTypes.DiscountTypes.Contains(overview.BundlePromoHeaderTypeId)
                         && discounts.TryGetValue(overview.BundlePromoRefId, out var discount))
                {
                    discount.Enabled = false;
                    discount.ModifiedDate = now;
                    discount.ModifiedBy = currentUser;
                }
            }

            context.BundlePromoOverviews.RemoveRange(overviews);
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
            _logger.LogError(ex, "Error deleting bundle promo overviews for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while deleting bundle promo overviews." });
        }
    }
}
