using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
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

    private static int ResolvePromotionDetailType(PromoDetail detail)
    {
        if (detail.PriceSpecific.HasValue)
        {
            return BundlePromoRuleTypes.DetailByPrice;
        }

        if (detail.ParentItemId.HasValue)
        {
            return BundlePromoRuleTypes.DetailByItem;
        }

        return BundlePromoRuleTypes.DetailByCategory;
    }

    private static ActionResult? ValidateRuleDetail(PromotionRuleDetailDto detail, string prefix)
    {
        if (!BundlePromoRuleTypes.DetailTypes.Contains(detail.BundlePromoDetailTypeId))
        {
            return new BadRequestObjectResult(new { message = $"{prefix}: invalid detail type." });
        }

        if (detail.BundleDeductRuleTypeId != 0 && !BundlePromoRuleTypes.DeductTypes.Contains(detail.BundleDeductRuleTypeId))
        {
            return new BadRequestObjectResult(new { message = $"{prefix}: invalid deduct rule type." });
        }

        if (detail.BundlePromoDetailTypeId == BundlePromoRuleTypes.DetailByCategory
            && (!detail.SelectedCategoryId.HasValue || detail.SelectedCategoryId.Value <= 0))
        {
            return new BadRequestObjectResult(new { message = $"{prefix}: category is required for detail type BY_CAT." });
        }

        if (detail.BundlePromoDetailTypeId == BundlePromoRuleTypes.DetailByItem
            && (!detail.SelectedItemId.HasValue || detail.SelectedItemId.Value <= 0))
        {
            return new BadRequestObjectResult(new { message = $"{prefix}: item is required for detail type BY_ITEM." });
        }

        if (detail.BundlePromoDetailTypeId == BundlePromoRuleTypes.DetailByPrice
            && (!detail.SpecificPrice.HasValue || detail.SpecificPrice.Value < 0))
        {
            return new BadRequestObjectResult(new { message = $"{prefix}: specific price is required for detail type BY_PRICE." });
        }

        if (detail.BundlePromoDetailTypeId == BundlePromoRuleTypes.DetailByPrice
            && (!detail.SelectedCategoryId.HasValue || detail.SelectedCategoryId.Value <= 0))
        {
            return new BadRequestObjectResult(new { message = $"{prefix}: category is required for detail type BY_PRICE." });
        }

        if (detail.PriceReplace.HasValue && detail.PriceReplace.Value < 0)
        {
            return new BadRequestObjectResult(new { message = $"{prefix}: replacement price cannot be negative." });
        }

        if (detail.DepartmentRevenue.HasValue && detail.DepartmentRevenue.Value < 0)
        {
            return new BadRequestObjectResult(new { message = $"{prefix}: department revenue cannot be negative." });
        }

        return null;
    }

    private async Task<PromotionRuleEditorDto?> BuildPromotionRuleEditorAsync(
        EWHQDbContext context,
        int accountId,
        int promoHeaderId,
        CancellationToken cancellationToken)
    {
        var header = await context.PromoHeaders
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && x.PromoHeaderId == promoHeaderId)
            .Select(x => new
            {
                x.PromoHeaderId,
                x.AccountId,
                PromoCode = x.PromoCode ?? string.Empty,
                PromoName = x.PromoName ?? string.Empty,
                x.PromoSaveAmount,
                x.Priority,
                x.Enabled,
                x.StartDate,
                x.EndDate,
                x.StartTime,
                x.EndTime,
                x.IsCoexistPromo,
                IsAmountDeductEvenly = x.IsAmountDeductEvenly ?? false,
                IsPromoDetailMatchMustExist = x.IsPromoDetailMatchMustExist ?? false,
                x.FlatPrice,
                DayOfWeeks = x.DayOfWeeks ?? string.Empty,
                Months = x.Months ?? string.Empty,
                Dates = x.Dates ?? string.Empty
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (header == null)
        {
            return null;
        }

        var overview = await context.BundlePromoOverviews
            .AsNoTracking()
            .Where(
                x => x.AccountId == accountId
                     && x.BundlePromoRefId == promoHeaderId
                     && BundlePromoHeaderTypes.PromotionTypes.Contains(x.BundlePromoHeaderTypeId))
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

        var details = await context.PromoDetails
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && x.PromoHeaderId == promoHeaderId)
            .OrderBy(x => x.GroupIndex ?? 0)
            .ThenByDescending(x => x.IsReplaceItem ?? false)
            .ThenBy(x => x.PromoDetailId)
            .Select(x => new PromoDetail
            {
                PromoDetailId = x.PromoDetailId,
                AccountId = x.AccountId,
                PromoHeaderId = x.PromoHeaderId,
                PromoItemId = x.PromoItemId,
                ParentItemId = x.ParentItemId,
                ParentCategoryId = x.ParentCategoryId,
                PriceSpecific = x.PriceSpecific,
                Enabled = x.Enabled,
                IsOptionalItem = x.IsOptionalItem,
                IsReplaceItem = x.IsReplaceItem,
                IsItemCanReplace = x.IsItemCanReplace,
                PriceReplace = x.PriceReplace,
                GroupIndex = x.GroupIndex,
                RuleDeductTypeId = x.RuleDeductTypeId,
                IsDepartmentRevenue = x.IsDepartmentRevenue,
                DepartmentRevenue = x.DepartmentRevenue
            })
            .ToListAsync(cancellationToken);

        var mappedDetails = details
            .Select(detail => new PromotionRuleDetailDto
            {
                PromoDetailId = detail.PromoDetailId,
                BundlePromoDetailTypeId = ResolvePromotionDetailType(detail),
                SelectedCategoryId = detail.ParentCategoryId > 0 ? detail.ParentCategoryId : null,
                SelectedItemId = detail.ParentItemId,
                SpecificPrice = detail.PriceSpecific,
                BundleDeductRuleTypeId = detail.RuleDeductTypeId ?? 0,
                Enabled = detail.Enabled,
                IsOptionalItem = detail.IsOptionalItem ?? false,
                IsReplaceItem = detail.IsReplaceItem ?? false,
                IsItemCanReplace = detail.IsItemCanReplace ?? false,
                PriceReplace = detail.PriceReplace,
                GroupIndex = detail.GroupIndex,
                IsDepartmentRevenue = detail.IsDepartmentRevenue ?? false,
                DepartmentRevenue = detail.DepartmentRevenue
            })
            .ToList();

        var mandatoryDetails = mappedDetails
            .Where(detail => !detail.IsOptionalItem)
            .ToList();

        var optionalGroups = mappedDetails
            .Where(detail => detail.IsOptionalItem)
            .GroupBy(detail => detail.GroupIndex ?? 1)
            .OrderBy(group => group.Key)
            .Select(group => new PromotionRuleDetailGroupDto
            {
                GroupIndex = group.Key,
                Details = group.ToList()
            })
            .ToList();

        var shopOverrides = await context.PromoShopDetails
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && x.PromoHeaderId == promoHeaderId)
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
                ShopId = x.ShopId,
                ShopName = x.Name
            })
            .ToListAsync(cancellationToken))
            .Select(shop => new PromotionShopRuleDto
            {
                ShopId = shop.ShopId,
                ShopName = shop.ShopName,
                Enabled = hasOverrides
                    ? overrideMap.TryGetValue(shop.ShopId, out var enabled) && enabled
                    : true
            })
            .ToList();

        return new PromotionRuleEditorDto
        {
            PromoHeaderId = header.PromoHeaderId,
            AccountId = header.AccountId,
            BundlePromoOverviewId = overview?.BundlePromoOverviewId,
            BundlePromoHeaderTypeId = overview?.BundlePromoHeaderTypeId ?? BundlePromoHeaderTypes.DefaultPromotionType,
            PromoCode = header.PromoCode,
            PromoName = header.PromoName,
            BundlePromoDesc = string.IsNullOrWhiteSpace(overview?.BundlePromoDesc) ? null : overview!.BundlePromoDesc,
            PromoSaveAmount = header.PromoSaveAmount,
            Priority = header.Priority,
            Enabled = header.Enabled,
            IsAvailable = overview?.IsAvailable ?? header.Enabled,
            StartDate = header.StartDate,
            EndDate = header.EndDate,
            StartTime = header.StartTime,
            EndTime = header.EndTime,
            IsCoexistPromo = header.IsCoexistPromo,
            IsAmountDeductEvenly = header.IsAmountDeductEvenly,
            IsPromoDetailMatchMustExist = header.IsPromoDetailMatchMustExist,
            FlatPrice = header.FlatPrice,
            DayOfWeeks = header.DayOfWeeks,
            Months = header.Months,
            Dates = header.Dates,
            MandatoryDetails = mandatoryDetails,
            OptionalDetailGroups = optionalGroups,
            ShopRules = shops
        };
    }

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

    [HttpGet("brand/{brandId:int}/{promoHeaderId:int}/rule-editor")]
    [RequireBrandView]
    public async Task<ActionResult<PromotionRuleEditorDto>> GetPromotionRuleEditor(
        int brandId,
        int promoHeaderId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var response = await BuildPromotionRuleEditorAsync(context, accountId, promoHeaderId, HttpContext.RequestAborted);
            if (response == null)
            {
                return NotFound(new { message = "Promotion not found." });
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
            _logger.LogError(ex, "Error fetching promotion rule editor for promotion {PromoHeaderId} and brand {BrandId}", promoHeaderId, brandId);
            return StatusCode(500, new { message = "An error occurred while loading the promotion rule editor." });
        }
    }

    [HttpPut("brand/{brandId:int}/{promoHeaderId:int}/rule-editor")]
    [RequireBrandModify]
    public async Task<ActionResult<PromotionRuleEditorDto>> UpdatePromotionRuleEditor(
        int brandId,
        int promoHeaderId,
        UpdatePromotionRuleEditorDto payload)
    {
        try
        {
            var requestedType = payload.BundlePromoHeaderTypeId == 0
                ? BundlePromoHeaderTypes.DefaultPromotionType
                : payload.BundlePromoHeaderTypeId;

            if (!BundlePromoHeaderTypes.PromotionTypes.Contains(requestedType))
            {
                return BadRequest(new { message = "Invalid promotion header type." });
            }

            var promoCode = Clip(payload.PromoCode, 50);
            var promoName = Clip(payload.PromoName, 50);
            var promoNameForOverview = Clip(payload.PromoName, 500);
            var promoDesc = Clip(payload.BundlePromoDesc, 4000);
            var dayOfWeeks = Clip(payload.DayOfWeeks, 100);
            var months = Clip(payload.Months, 100);
            var dates = Clip(payload.Dates, 150);

            if (string.IsNullOrWhiteSpace(promoCode))
            {
                return BadRequest(new { message = "Promotion code is required." });
            }

            if (string.IsNullOrWhiteSpace(promoName))
            {
                return BadRequest(new { message = "Promotion name is required." });
            }

            if (payload.PromoSaveAmount < 0)
            {
                return BadRequest(new { message = "Save amount must be 0 or greater." });
            }

            if (payload.StartDate.HasValue && payload.EndDate.HasValue && payload.StartDate > payload.EndDate)
            {
                return BadRequest(new { message = "Start date must be earlier than or equal to end date." });
            }

            if (payload.Priority.HasValue && payload.Priority.Value < 0)
            {
                return BadRequest(new { message = "Priority must be 0 or greater." });
            }

            var mandatoryDetails = (payload.MandatoryDetails ?? Array.Empty<PromotionRuleDetailDto>())
                .Where(detail => detail != null)
                .ToList();

            var optionalGroups = (payload.OptionalDetailGroups ?? Array.Empty<PromotionRuleDetailGroupDto>())
                .Where(group => group != null)
                .ToList();

            for (var index = 0; index < mandatoryDetails.Count; index++)
            {
                var validation = ValidateRuleDetail(mandatoryDetails[index], $"Mandatory detail #{index + 1}");
                if (validation != null)
                {
                    return validation;
                }
            }

            for (var groupIndex = 0; groupIndex < optionalGroups.Count; groupIndex++)
            {
                var group = optionalGroups[groupIndex];
                if (group.GroupIndex < 0)
                {
                    return BadRequest(new { message = $"Optional group #{groupIndex + 1} has an invalid group index." });
                }

                var optionalDetails = (group.Details ?? Array.Empty<PromotionRuleDetailDto>())
                    .Where(detail => detail != null)
                    .ToList();

                if (optionalDetails.Count == 0)
                {
                    return BadRequest(new { message = $"Optional group {group.GroupIndex} must contain at least one rule detail." });
                }

                for (var detailIndex = 0; detailIndex < optionalDetails.Count; detailIndex++)
                {
                    var validation = ValidateRuleDetail(optionalDetails[detailIndex], $"Optional group {group.GroupIndex} detail #{detailIndex + 1}");
                    if (validation != null)
                    {
                        return validation;
                    }
                }
            }

            var flattenedDetails = new List<PromotionRuleDetailDto>();
            flattenedDetails.AddRange(mandatoryDetails.Select(detail =>
            {
                return new PromotionRuleDetailDto
                {
                    PromoDetailId = detail.PromoDetailId,
                    BundlePromoDetailTypeId = detail.BundlePromoDetailTypeId,
                    SelectedCategoryId = detail.SelectedCategoryId,
                    SelectedItemId = detail.SelectedItemId,
                    SpecificPrice = detail.SpecificPrice,
                    BundleDeductRuleTypeId = detail.BundleDeductRuleTypeId,
                    Enabled = detail.Enabled,
                    IsOptionalItem = false,
                    IsReplaceItem = false,
                    IsItemCanReplace = false,
                    PriceReplace = detail.PriceReplace,
                    GroupIndex = null,
                    IsDepartmentRevenue = detail.IsDepartmentRevenue,
                    DepartmentRevenue = detail.DepartmentRevenue
                };
            }));
            flattenedDetails.AddRange(optionalGroups
                .SelectMany(group => (group.Details ?? Array.Empty<PromotionRuleDetailDto>())
                    .Where(detail => detail != null)
                    .Select(detail =>
                    {
                        return new PromotionRuleDetailDto
                        {
                            PromoDetailId = detail.PromoDetailId,
                            BundlePromoDetailTypeId = detail.BundlePromoDetailTypeId,
                            SelectedCategoryId = detail.SelectedCategoryId,
                            SelectedItemId = detail.SelectedItemId,
                            SpecificPrice = detail.SpecificPrice,
                            BundleDeductRuleTypeId = detail.BundleDeductRuleTypeId,
                            Enabled = detail.Enabled,
                            IsOptionalItem = true,
                            IsReplaceItem = detail.IsReplaceItem,
                            IsItemCanReplace = detail.IsItemCanReplace,
                            PriceReplace = detail.PriceReplace,
                            GroupIndex = group.GroupIndex,
                            IsDepartmentRevenue = detail.IsDepartmentRevenue,
                            DepartmentRevenue = detail.DepartmentRevenue
                        };
                    })));

            var categoryIds = flattenedDetails
                .Where(detail => detail.BundlePromoDetailTypeId == BundlePromoRuleTypes.DetailByCategory && detail.SelectedCategoryId.HasValue)
                .Select(detail => detail.SelectedCategoryId!.Value)
                .Distinct()
                .ToList();

            var itemIds = flattenedDetails
                .Where(detail => detail.BundlePromoDetailTypeId == BundlePromoRuleTypes.DetailByItem && detail.SelectedItemId.HasValue)
                .Select(detail => detail.SelectedItemId!.Value)
                .Distinct()
                .ToList();

            var shopRules = (payload.ShopRules ?? Array.Empty<PromotionShopRuleDto>())
                .Where(shop => shop != null)
                .ToList();

            var normalizedShopRules = shopRules
                .GroupBy(shop => shop.ShopId)
                .Select(group => group.Last())
                .ToList();

            var requestedShopIds = normalizedShopRules.Select(shop => shop.ShopId).Distinct().ToList();

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var header = await context.PromoHeaders
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.PromoHeaderId == promoHeaderId,
                    HttpContext.RequestAborted);

            if (header == null)
            {
                return NotFound(new { message = "Promotion not found." });
            }

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

            if (categoryIds.Count > 0)
            {
                var validCategoryCount = await context.ItemCategories
                    .AsNoTracking()
                    .CountAsync(
                        category => category.AccountId == accountId && categoryIds.Contains(category.CategoryId),
                        HttpContext.RequestAborted);
                if (validCategoryCount != categoryIds.Count)
                {
                    return BadRequest(new { message = "One or more category IDs are invalid for this brand." });
                }
            }

            Dictionary<int, int> itemCategoryMap = new();
            if (itemIds.Count > 0)
            {
                itemCategoryMap = await context.ItemMasters
                    .AsNoTracking()
                    .Where(item => item.AccountId == accountId && itemIds.Contains(item.ItemId))
                    .Select(item => new { item.ItemId, item.CategoryId })
                    .ToDictionaryAsync(item => item.ItemId, item => item.CategoryId, HttpContext.RequestAborted);

                if (itemCategoryMap.Count != itemIds.Count)
                {
                    return BadRequest(new { message = "One or more item IDs are invalid for this brand." });
                }
            }

            var requiresPromoItem = flattenedDetails.Any(detail => detail.BundleDeductRuleTypeId != 0);
            int? promoItemId = null;
            if (requiresPromoItem)
            {
                promoItemId = await context.ItemMasters
                    .AsNoTracking()
                    .Where(item => item.AccountId == accountId && item.Enabled && item.IsPromoItem)
                    .OrderBy(item => item.ItemId)
                    .Select(item => (int?)item.ItemId)
                    .FirstOrDefaultAsync(HttpContext.RequestAborted);

                if (!promoItemId.HasValue)
                {
                    return BadRequest(new { message = "No active promo item is configured for this brand. Please configure one menu item as promo item first." });
                }
            }

            if (requestedShopIds.Count > 0)
            {
                var validShopCount = await context.Shops
                    .AsNoTracking()
                    .CountAsync(shop => shop.AccountId == accountId && shop.Enabled && requestedShopIds.Contains(shop.ShopId), HttpContext.RequestAborted);
                if (validShopCount != requestedShopIds.Count)
                {
                    return BadRequest(new { message = "One or more shop IDs are invalid for this brand." });
                }
            }

            var overview = await context.BundlePromoOverviews
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId
                         && x.BundlePromoRefId == promoHeaderId
                         && BundlePromoHeaderTypes.PromotionTypes.Contains(x.BundlePromoHeaderTypeId),
                    HttpContext.RequestAborted);

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var nextPriority = (await context.BundlePromoOverviews
                .Where(x => x.AccountId == accountId && x.Enabled && BundlePromoHeaderTypes.PromotionTypes.Contains(x.BundlePromoHeaderTypeId))
                .Select(x => (int?)x.Priority)
                .MaxAsync(HttpContext.RequestAborted) ?? -1) + 1;
            var effectivePriority = payload.Priority ?? overview?.Priority ?? header.Priority ?? nextPriority;
            var isAvailable = payload.Enabled && payload.IsAvailable;

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
            overview.Priority = effectivePriority;
            overview.IsAvailable = isAvailable;
            overview.Enabled = true;
            overview.ModifiedDate = now;
            overview.ModifiedBy = currentUser;

            header.PromoCode = promoCode;
            header.PromoName = promoName;
            header.PromoSaveAmount = payload.PromoSaveAmount;
            header.Priority = effectivePriority;
            header.Enabled = isAvailable;
            header.StartDate = payload.StartDate;
            header.EndDate = payload.EndDate;
            header.StartTime = payload.StartTime;
            header.EndTime = payload.EndTime;
            header.IsCoexistPromo = payload.IsCoexistPromo;
            header.IsAmountDeductEvenly = payload.IsAmountDeductEvenly;
            header.IsPromoDetailMatchMustExist = payload.IsPromoDetailMatchMustExist;
            header.FlatPrice = payload.FlatPrice;
            header.DayOfWeeks = dayOfWeeks;
            header.Months = months;
            header.Dates = dates;
            header.ModifiedDate = now;
            header.ModifiedBy = currentUser;

            await context.PromoDetails
                .Where(detail => detail.AccountId == accountId && detail.PromoHeaderId == promoHeaderId)
                .ExecuteDeleteAsync(HttpContext.RequestAborted);

            await context.PromoShopDetails
                .Where(detail => detail.AccountId == accountId && detail.PromoHeaderId == promoHeaderId)
                .ExecuteDeleteAsync(HttpContext.RequestAborted);

            if (flattenedDetails.Count > 0)
            {
                var nextPromoDetailId = (await context.PromoDetails
                    .Where(detail => detail.AccountId == accountId)
                    .Select(detail => (int?)detail.PromoDetailId)
                    .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

                var optionalRuleIndexByGroup = new Dictionary<int, int>();

                foreach (var detail in flattenedDetails)
                {
                    int? parentItemId = null;
                    int parentCategoryId = 0;
                    decimal? priceSpecific = null;
                    var isOptionalItem = detail.IsOptionalItem;
                    var isReplaceItem = detail.IsReplaceItem;
                    var isItemCanReplace = detail.IsItemCanReplace;
                    var groupIndex = detail.GroupIndex;

                    if (detail.BundlePromoDetailTypeId == BundlePromoRuleTypes.DetailByCategory)
                    {
                        parentCategoryId = detail.SelectedCategoryId ?? 0;
                    }
                    else if (detail.BundlePromoDetailTypeId == BundlePromoRuleTypes.DetailByItem)
                    {
                        parentItemId = detail.SelectedItemId;
                        if (detail.SelectedCategoryId.HasValue && detail.SelectedCategoryId.Value > 0)
                        {
                            parentCategoryId = detail.SelectedCategoryId.Value;
                        }
                        else
                        {
                            parentCategoryId = parentItemId.HasValue && itemCategoryMap.TryGetValue(parentItemId.Value, out var categoryId)
                                ? categoryId
                                : 0;
                        }
                    }
                    else
                    {
                        parentCategoryId = detail.SelectedCategoryId ?? 0;
                        priceSpecific = detail.SpecificPrice;
                    }

                    if (isOptionalItem)
                    {
                        var normalizedGroupIndex = groupIndex ?? 0;
                        var position = optionalRuleIndexByGroup.TryGetValue(normalizedGroupIndex, out var current)
                            ? current
                            : 0;

                        if (!isReplaceItem && !isItemCanReplace)
                        {
                            isItemCanReplace = position == 0;
                            isReplaceItem = position > 0;
                        }

                        optionalRuleIndexByGroup[normalizedGroupIndex] = position + 1;
                        groupIndex = normalizedGroupIndex;
                    }
                    else
                    {
                        isReplaceItem = false;
                        isItemCanReplace = false;
                        groupIndex = null;
                    }

                    context.PromoDetails.Add(new PromoDetail
                    {
                        PromoDetailId = nextPromoDetailId++,
                        AccountId = accountId,
                        PromoHeaderId = promoHeaderId,
                        PromoItemId = detail.BundleDeductRuleTypeId == 0 ? null : promoItemId,
                        ParentItemId = parentItemId,
                        ParentCategoryId = parentCategoryId,
                        PriceSpecific = priceSpecific,
                        Enabled = detail.Enabled,
                        IsOptionalItem = isOptionalItem,
                        IsReplaceItem = isReplaceItem,
                        IsItemCanReplace = isItemCanReplace,
                        PriceReplace = detail.PriceReplace,
                        GroupIndex = groupIndex,
                        RuleDeductTypeId = detail.BundleDeductRuleTypeId == 0 ? null : detail.BundleDeductRuleTypeId,
                        IsDepartmentRevenue = detail.IsDepartmentRevenue,
                        DepartmentRevenue = detail.DepartmentRevenue,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    });
                }
            }

            foreach (var shop in normalizedShopRules)
            {
                context.PromoShopDetails.Add(new PromoShopDetail
                {
                    PromoHeaderId = promoHeaderId,
                    ShopId = shop.ShopId,
                    AccountId = accountId,
                    Enabled = shop.Enabled,
                    CreatedDate = now,
                    CreatedBy = currentUser,
                    ModifiedDate = now,
                    ModifiedBy = currentUser
                });
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            var response = await BuildPromotionRuleEditorAsync(context, accountId, promoHeaderId, HttpContext.RequestAborted);
            if (response == null)
            {
                return NotFound(new { message = "Promotion not found." });
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
            _logger.LogError(ex, "Error updating promotion rule editor for promotion {PromoHeaderId} and brand {BrandId}", promoHeaderId, brandId);
            return StatusCode(500, new { message = "An error occurred while saving promotion rule editor settings." });
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
