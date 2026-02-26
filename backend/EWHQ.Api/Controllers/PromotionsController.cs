using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
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
[Route("api/promotions")]
[Authorize]
public class PromotionsController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<PromotionsController> _logger;

    public PromotionsController(IPOSDbContextService posContextService, ILogger<PromotionsController> logger)
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

    private static PromotionSummaryDto ToDto(PromoHeader header, BundlePromoOverview? overview)
    {
        var priority = overview?.Priority ?? header.Priority;

        return new PromotionSummaryDto
        {
            PromoHeaderId = header.PromoHeaderId,
            AccountId = header.AccountId,
            BundlePromoOverviewId = overview?.BundlePromoOverviewId,
            BundlePromoHeaderTypeId = overview?.BundlePromoHeaderTypeId ?? BundlePromoHeaderTypes.DefaultPromotionType,
            PromoCode = header.PromoCode,
            PromoName = header.PromoName,
            BundlePromoDesc = overview?.BundlePromoDesc,
            PromoSaveAmount = header.PromoSaveAmount,
            Priority = priority,
            Enabled = header.Enabled,
            IsAvailable = overview?.IsAvailable ?? header.Enabled,
            StartDate = header.StartDate,
            EndDate = header.EndDate,
            StartTime = header.StartTime,
            EndTime = header.EndTime,
            ModifiedDate = header.ModifiedDate,
            ModifiedBy = header.ModifiedBy
        };
    }

    private static ActionResult? ValidatePayload(UpsertPromotionDto payload)
    {
        var promoCode = payload.PromoCode?.Trim();
        var promoName = payload.PromoName?.Trim();
        var requestedType = payload.BundlePromoHeaderTypeId == 0
            ? BundlePromoHeaderTypes.DefaultPromotionType
            : payload.BundlePromoHeaderTypeId;

        if (!BundlePromoHeaderTypes.PromotionTypes.Contains(requestedType))
        {
            return new BadRequestObjectResult(new { message = "Invalid promotion header type." });
        }

        if (string.IsNullOrWhiteSpace(promoCode))
        {
            return new BadRequestObjectResult(new { message = "Promotion code is required." });
        }

        if (string.IsNullOrWhiteSpace(promoName))
        {
            return new BadRequestObjectResult(new { message = "Promotion name is required." });
        }

        if (payload.StartDate.HasValue && payload.EndDate.HasValue && payload.StartDate > payload.EndDate)
        {
            return new BadRequestObjectResult(new { message = "Start date must be earlier than or equal to end date." });
        }

        if (payload.Priority.HasValue && payload.Priority.Value < 0)
        {
            return new BadRequestObjectResult(new { message = "Priority must be 0 or greater." });
        }

        if (payload.PromoSaveAmount < 0)
        {
            return new BadRequestObjectResult(new { message = "Save amount must be 0 or greater." });
        }

        return null;
    }

    private static int ResolveRequestedType(UpsertPromotionDto payload) =>
        payload.BundlePromoHeaderTypeId == 0
            ? BundlePromoHeaderTypes.DefaultPromotionType
            : payload.BundlePromoHeaderTypeId;

    private static bool ResolveAvailability(UpsertPromotionDto payload) => payload.Enabled && payload.IsAvailable;

    [HttpGet("brand/{brandId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<PromotionSummaryDto>>> GetPromotions(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var headers = await context.PromoHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId)
                .Select(x => new PromotionSummaryDto
                {
                    PromoHeaderId = x.PromoHeaderId,
                    AccountId = x.AccountId,
                    BundlePromoOverviewId = null,
                    BundlePromoHeaderTypeId = BundlePromoHeaderTypes.DefaultPromotionType,
                    PromoCode = x.PromoCode ?? string.Empty,
                    PromoName = x.PromoName ?? string.Empty,
                    BundlePromoDesc = null,
                    PromoSaveAmount = x.PromoSaveAmount,
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

            var overviews = await context.BundlePromoOverviews
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && BundlePromoHeaderTypes.PromotionTypes.Contains(x.BundlePromoHeaderTypeId))
                .Select(x => new
                {
                    x.BundlePromoOverviewId,
                    x.BundlePromoHeaderTypeId,
                    x.BundlePromoRefId,
                    BundlePromoDesc = x.BundlePromoDesc ?? string.Empty,
                    x.Priority,
                    x.IsAvailable,
                    x.Enabled
                })
                .ToListAsync(HttpContext.RequestAborted);

            var overviewByRef = overviews
                .GroupBy(x => x.BundlePromoRefId)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.Enabled).ThenBy(x => x.Priority).First());

            var response = headers
                .Select(header =>
                {
                    if (overviewByRef.TryGetValue(header.PromoHeaderId, out var overview))
                    {
                        header.BundlePromoOverviewId = overview.BundlePromoOverviewId;
                        header.BundlePromoHeaderTypeId = overview.BundlePromoHeaderTypeId;
                        header.BundlePromoDesc = string.IsNullOrWhiteSpace(overview.BundlePromoDesc) ? null : overview.BundlePromoDesc;
                        header.Priority = overview.Priority;
                        header.IsAvailable = overview.IsAvailable;
                    }

                    return header;
                })
                .OrderByDescending(x => x.Enabled)
                .ThenBy(x => x.Priority ?? int.MaxValue)
                .ThenBy(x => x.PromoName)
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
            _logger.LogError(ex, "Error fetching promotions for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching promotions." });
        }
    }

    [HttpPost("brand/{brandId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<PromotionSummaryDto>> CreatePromotion(int brandId, UpsertPromotionDto payload)
    {
        try
        {
            var validationError = ValidatePayload(payload);
            if (validationError != null)
            {
                return validationError;
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var promoCode = Clip(payload.PromoCode, 50);
            var promoName = Clip(payload.PromoName, 50);
            var promoNameForOverview = Clip(payload.PromoName, 500);
            var promoDesc = Clip(payload.BundlePromoDesc, 4000);
            var requestedType = ResolveRequestedType(payload);
            var isAvailable = ResolveAvailability(payload);

            var normalizedCode = promoCode.ToUpperInvariant();
            var duplicateCode = await context.PromoHeaders
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId && x.PromoCode.ToUpper() == normalizedCode,
                    HttpContext.RequestAborted);

            if (duplicateCode)
            {
                return Conflict(new { message = "A promotion with the same code already exists." });
            }

            var nextPromoHeaderId = (await context.PromoHeaders
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.PromoHeaderId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var nextOverviewId = (await context.BundlePromoOverviews
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.BundlePromoOverviewId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var nextPriority = (await context.BundlePromoOverviews
                .Where(x => x.AccountId == accountId && x.Enabled && BundlePromoHeaderTypes.PromotionTypes.Contains(x.BundlePromoHeaderTypeId))
                .Select(x => (int?)x.Priority)
                .MaxAsync(HttpContext.RequestAborted) ?? -1) + 1;

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var effectivePriority = payload.Priority ?? nextPriority;

            var header = new PromoHeader
            {
                PromoHeaderId = nextPromoHeaderId,
                AccountId = accountId,
                PromoCode = promoCode,
                PromoName = promoName,
                PromoSaveAmount = payload.PromoSaveAmount,
                Priority = effectivePriority,
                Enabled = isAvailable,
                StartDate = payload.StartDate,
                EndDate = payload.EndDate,
                StartTime = payload.StartTime,
                EndTime = payload.EndTime,
                DayOfWeeks = string.Empty,
                Months = string.Empty,
                Dates = string.Empty,
                CreatedDate = now,
                CreatedBy = currentUser,
                ModifiedDate = now,
                ModifiedBy = currentUser,
                IsCoexistPromo = false,
                IsAmountDeductEvenly = false,
                IsPromoDetailMatchMustExist = false,
                FlatPrice = null
            };

            var overview = new BundlePromoOverview
            {
                AccountId = accountId,
                BundlePromoOverviewId = nextOverviewId,
                BundlePromoCode = promoCode,
                BundlePromoName = promoNameForOverview,
                BundlePromoDesc = promoDesc,
                BundlePromoHeaderTypeId = requestedType,
                BundlePromoRefId = nextPromoHeaderId,
                Priority = effectivePriority,
                IsAvailable = isAvailable,
                Enabled = true,
                CreatedDate = now,
                CreatedBy = currentUser,
                ModifiedDate = now,
                ModifiedBy = currentUser
            };

            context.PromoHeaders.Add(header);
            context.BundlePromoOverviews.Add(overview);
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToDto(header, overview));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating promotion for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the promotion." });
        }
    }

    [HttpPut("brand/{brandId:int}/{promoHeaderId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<PromotionSummaryDto>> UpdatePromotion(
        int brandId,
        int promoHeaderId,
        UpsertPromotionDto payload)
    {
        try
        {
            var validationError = ValidatePayload(payload);
            if (validationError != null)
            {
                return validationError;
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var header = await context.PromoHeaders
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.PromoHeaderId == promoHeaderId,
                    HttpContext.RequestAborted);

            if (header == null)
            {
                return NotFound(new { message = "Promotion not found." });
            }

            var promoCode = Clip(payload.PromoCode, 50);
            var promoName = Clip(payload.PromoName, 50);
            var promoNameForOverview = Clip(payload.PromoName, 500);
            var promoDesc = Clip(payload.BundlePromoDesc, 4000);
            var requestedType = ResolveRequestedType(payload);
            var isAvailable = ResolveAvailability(payload);

            var normalizedCode = promoCode.ToUpperInvariant();
            var duplicateCode = await context.PromoHeaders
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.PromoHeaderId != promoHeaderId
                         && x.PromoCode.ToUpper() == normalizedCode,
                    HttpContext.RequestAborted);

            if (duplicateCode)
            {
                return Conflict(new { message = "A promotion with the same code already exists." });
            }

            var overview = await context.BundlePromoOverviews
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId
                         && x.BundlePromoRefId == promoHeaderId
                         && BundlePromoHeaderTypes.PromotionTypes.Contains(x.BundlePromoHeaderTypeId),
                    HttpContext.RequestAborted);

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var fallbackPriority = payload.Priority
                ?? overview?.Priority
                ?? header.Priority
                ?? ((await context.BundlePromoOverviews
                    .Where(x => x.AccountId == accountId && x.Enabled && BundlePromoHeaderTypes.PromotionTypes.Contains(x.BundlePromoHeaderTypeId))
                    .Select(x => (int?)x.Priority)
                    .MaxAsync(HttpContext.RequestAborted) ?? -1) + 1);

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
                    BundlePromoRefId = promoHeaderId,
                    Enabled = true,
                    CreatedDate = now,
                    CreatedBy = currentUser
                };
                context.BundlePromoOverviews.Add(overview);
            }

            overview.BundlePromoHeaderTypeId = requestedType;
            overview.BundlePromoCode = promoCode;
            overview.BundlePromoName = promoNameForOverview;
            overview.BundlePromoDesc = promoDesc;
            overview.Priority = fallbackPriority;
            overview.IsAvailable = isAvailable;
            overview.Enabled = true;
            overview.ModifiedDate = now;
            overview.ModifiedBy = currentUser;

            header.PromoCode = promoCode;
            header.PromoName = promoName;
            header.PromoSaveAmount = payload.PromoSaveAmount;
            header.Priority = fallbackPriority;
            header.Enabled = isAvailable;
            header.StartDate = payload.StartDate;
            header.EndDate = payload.EndDate;
            header.StartTime = payload.StartTime;
            header.EndTime = payload.EndTime;
            header.ModifiedDate = now;
            header.ModifiedBy = currentUser;

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToDto(header, overview));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating promotion {PromoHeaderId} for brand {BrandId}", promoHeaderId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating the promotion." });
        }
    }

    [HttpDelete("brand/{brandId:int}/{promoHeaderId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivatePromotion(int brandId, int promoHeaderId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var header = await context.PromoHeaders
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.PromoHeaderId == promoHeaderId,
                    HttpContext.RequestAborted);

            if (header == null)
            {
                return NotFound(new { message = "Promotion not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            header.Enabled = false;
            header.ModifiedDate = now;
            header.ModifiedBy = currentUser;

            var overviews = await context.BundlePromoOverviews
                .Where(
                    x => x.AccountId == accountId
                         && x.BundlePromoRefId == promoHeaderId
                         && BundlePromoHeaderTypes.PromotionTypes.Contains(x.BundlePromoHeaderTypeId))
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
            _logger.LogError(ex, "Error deactivating promotion {PromoHeaderId} for brand {BrandId}", promoHeaderId, brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the promotion." });
        }
    }
}
