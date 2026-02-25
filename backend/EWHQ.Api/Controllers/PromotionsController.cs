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

    private static PromotionSummaryDto ToDto(PromoHeader entity) =>
        new()
        {
            PromoHeaderId = entity.PromoHeaderId,
            AccountId = entity.AccountId,
            PromoCode = entity.PromoCode,
            PromoName = entity.PromoName,
            PromoSaveAmount = entity.PromoSaveAmount,
            Priority = entity.Priority,
            Enabled = entity.Enabled,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            StartTime = entity.StartTime,
            EndTime = entity.EndTime,
            ModifiedDate = entity.ModifiedDate,
            ModifiedBy = entity.ModifiedBy
        };

    [HttpGet("brand/{brandId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<PromotionSummaryDto>>> GetPromotions(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var promotions = await context.PromoHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId)
                .OrderByDescending(x => x.Enabled)
                .ThenBy(x => x.Priority ?? int.MaxValue)
                .ThenBy(x => x.PromoName)
                .Select(x => new PromotionSummaryDto
                {
                    PromoHeaderId = x.PromoHeaderId,
                    AccountId = x.AccountId,
                    PromoCode = x.PromoCode,
                    PromoName = x.PromoName,
                    PromoSaveAmount = x.PromoSaveAmount,
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

            return Ok(promotions);
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
            var promoCode = payload.PromoCode?.Trim();
            var promoName = payload.PromoName?.Trim();

            if (string.IsNullOrWhiteSpace(promoCode))
            {
                return BadRequest(new { message = "Promotion code is required." });
            }

            if (string.IsNullOrWhiteSpace(promoName))
            {
                return BadRequest(new { message = "Promotion name is required." });
            }

            if (payload.StartDate.HasValue && payload.EndDate.HasValue && payload.StartDate > payload.EndDate)
            {
                return BadRequest(new { message = "Start date must be earlier than or equal to end date." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
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

            var nextId = (await context.PromoHeaders
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.PromoHeaderId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var entity = new PromoHeader
            {
                PromoHeaderId = nextId,
                AccountId = accountId,
                PromoCode = promoCode,
                PromoName = promoName,
                PromoSaveAmount = payload.PromoSaveAmount,
                Priority = payload.Priority,
                Enabled = payload.Enabled,
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

            context.PromoHeaders.Add(entity);
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
            var promoCode = payload.PromoCode?.Trim();
            var promoName = payload.PromoName?.Trim();

            if (string.IsNullOrWhiteSpace(promoCode))
            {
                return BadRequest(new { message = "Promotion code is required." });
            }

            if (string.IsNullOrWhiteSpace(promoName))
            {
                return BadRequest(new { message = "Promotion name is required." });
            }

            if (payload.StartDate.HasValue && payload.EndDate.HasValue && payload.StartDate > payload.EndDate)
            {
                return BadRequest(new { message = "Start date must be earlier than or equal to end date." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var entity = await context.PromoHeaders
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.PromoHeaderId == promoHeaderId,
                    HttpContext.RequestAborted);

            if (entity == null)
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

            entity.PromoCode = promoCode;
            entity.PromoName = promoName;
            entity.PromoSaveAmount = payload.PromoSaveAmount;
            entity.Priority = payload.Priority;
            entity.Enabled = payload.Enabled;
            entity.StartDate = payload.StartDate;
            entity.EndDate = payload.EndDate;
            entity.StartTime = payload.StartTime;
            entity.EndTime = payload.EndTime;
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
            var entity = await context.PromoHeaders
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.PromoHeaderId == promoHeaderId,
                    HttpContext.RequestAborted);

            if (entity == null)
            {
                return NotFound(new { message = "Promotion not found." });
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
            _logger.LogError(ex, "Error deactivating promotion {PromoHeaderId} for brand {BrandId}", promoHeaderId, brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the promotion." });
        }
    }
}
