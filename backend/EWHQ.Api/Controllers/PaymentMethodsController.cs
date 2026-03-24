using System;
using System.Collections.Generic;
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
[Route("api/payment-methods")]
[Authorize]
public class PaymentMethodsController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<PaymentMethodsController> _logger;

    public PaymentMethodsController(IPOSDbContextService posContextService, ILogger<PaymentMethodsController> logger)
    {
        _posContextService = posContextService;
        _logger = logger;
    }

    private string GetCurrentUserIdentifier()
    {
        const int maxLength = 50;
        var identifier = User?.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(identifier)) return "System";
        identifier = identifier.Trim();
        return identifier.Length <= maxLength ? identifier : identifier[..maxLength];
    }

    private static string Clip(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static ActionResult? ValidatePayload(UpsertPaymentMethodDto payload)
    {
        if (string.IsNullOrWhiteSpace(payload.PaymentMethodCode))
            return new BadRequestObjectResult(new { message = "Payment method code is required." });

        if (string.IsNullOrWhiteSpace(payload.PaymentMethodName))
            return new BadRequestObjectResult(new { message = "Payment method name is required." });

        if (payload.PaymentMethodSurchargeRate.HasValue && payload.PaymentMethodSurchargeRate.Value < 0)
            return new BadRequestObjectResult(new { message = "Surcharge rate must be 0 or greater." });

        if (payload.FixedAmount.HasValue && payload.FixedAmount.Value < 0)
            return new BadRequestObjectResult(new { message = "Fixed amount must be 0 or greater." });

        return null;
    }

    [HttpGet("brand/{brandId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<PaymentMethodSummaryDto>>> GetPaymentMethods(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var items = await context.PaymentMethods
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.DisplayIndex)
                .ThenBy(x => x.PaymentMethodName)
                .Select(x => new PaymentMethodSummaryDto
                {
                    PaymentMethodId = x.PaymentMethodId,
                    AccountId = x.AccountId,
                    PaymentMethodCode = x.PaymentMethodCode ?? string.Empty,
                    PaymentMethodName = x.PaymentMethodName ?? string.Empty,
                    DisplayIndex = x.DisplayIndex,
                    Enabled = x.Enabled,
                    IsDrawerKick = x.IsDrawerKick,
                    IsTipEnabled = x.IsTipEnabled,
                    IsNonSalesPayment = x.IsNonSalesPayment,
                    IsCashPayment = x.IsCashPayment,
                    PaymentMethodSurchargeRate = x.PaymentMethodSurchargeRate,
                    LinkedGateway = x.LinkedGateway ?? string.Empty,
                    ModifiedDate = x.ModifiedDate,
                    ModifiedBy = x.ModifiedBy ?? string.Empty
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(items);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching payment methods for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching payment methods." });
        }
    }

    [HttpGet("brand/{brandId:int}/{paymentMethodId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<PaymentMethodDetailDto>> GetPaymentMethodDetail(int brandId, int paymentMethodId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var entity = await context.PaymentMethods
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.PaymentMethodId == paymentMethodId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Payment method not found." });

            var shopDetails = await context.PaymentMethodShopDetails
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.PaymentMethodId == paymentMethodId)
                .ToListAsync(HttpContext.RequestAborted);

            var shops = await context.Shops
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .Select(x => new { x.ShopId, x.Name })
                .ToListAsync(HttpContext.RequestAborted);

            var shopDetailMap = shopDetails.ToDictionary(x => x.ShopId);

            var shopRules = shops
                .OrderBy(x => x.Name)
                .Select(s =>
                {
                    shopDetailMap.TryGetValue(s.ShopId, out var detail);
                    return new PaymentMethodShopRuleDto
                    {
                        ShopId = s.ShopId,
                        ShopName = s.Name ?? string.Empty,
                        Enabled = detail?.Enabled ?? true,
                        PaymentFxRate = detail?.PaymentFxRate
                    };
                })
                .ToList();

            var dto = new PaymentMethodDetailDto
            {
                PaymentMethodId = entity.PaymentMethodId,
                AccountId = entity.AccountId,
                PaymentMethodCode = entity.PaymentMethodCode ?? string.Empty,
                PaymentMethodName = entity.PaymentMethodName ?? string.Empty,
                DisplayIndex = entity.DisplayIndex,
                Enabled = entity.Enabled,
                IsDrawerKick = entity.IsDrawerKick,
                IsTipEnabled = entity.IsTipEnabled,
                IsNonSalesPayment = entity.IsNonSalesPayment,
                IsCashPayment = entity.IsCashPayment,
                IsFixedAmount = entity.IsFixedAmount,
                FixedAmount = entity.FixedAmount,
                IsOverPaymentEnabled = entity.IsOverPaymentEnabled,
                IsFxPayment = entity.IsFxPayment,
                IsAutoRemarkEnabled = entity.IsAutoRemarkEnabled,
                PaymentMethodSurchargeRate = entity.PaymentMethodSurchargeRate,
                TxChargesRate = entity.TxChargesRate,
                LinkedGateway = entity.LinkedGateway,
                RemarkFormats = entity.RemarkFormats,
                MaxUseCount = entity.MaxUseCount,
                ModifiedDate = entity.ModifiedDate,
                ModifiedBy = entity.ModifiedBy ?? string.Empty,
                ShopRules = shopRules
            };

            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching payment method detail for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching payment method detail." });
        }
    }

    [HttpPost("brand/{brandId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<PaymentMethodSummaryDto>> CreatePaymentMethod(int brandId, UpsertPaymentMethodDto payload)
    {
        try
        {
            var validationError = ValidatePayload(payload);
            if (validationError != null) return validationError;

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var code = Clip(payload.PaymentMethodCode, 10);

            var existingCode = await context.PaymentMethods
                .AsNoTracking()
                .AnyAsync(x => x.AccountId == accountId && x.PaymentMethodCode == code && x.Enabled,
                    HttpContext.RequestAborted);

            if (existingCode)
                return BadRequest(new { message = $"Payment method code '{code}' already exists." });

            var nextId = (await context.PaymentMethods
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.PaymentMethodId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var entity = new PaymentMethod
            {
                PaymentMethodId = nextId,
                AccountId = accountId,
                PaymentMethodCode = code,
                PaymentMethodName = Clip(payload.PaymentMethodName, 50),
                DisplayIndex = payload.DisplayIndex,
                Enabled = true,
                IsDrawerKick = payload.IsDrawerKick,
                IsTipEnabled = payload.IsTipEnabled,
                IsNonSalesPayment = payload.IsNonSalesPayment,
                IsCashPayment = payload.IsCashPayment,
                IsFixedAmount = payload.IsFixedAmount,
                FixedAmount = payload.FixedAmount,
                IsOverPaymentEnabled = payload.IsOverPaymentEnabled,
                IsFxPayment = payload.IsFxPayment,
                IsAutoRemarkEnabled = payload.IsAutoRemarkEnabled,
                PaymentMethodSurchargeRate = payload.PaymentMethodSurchargeRate,
                TxChargesRate = payload.TxChargesRate,
                LinkedGateway = payload.LinkedGateway,
                RemarkFormats = payload.RemarkFormats,
                MaxUseCount = payload.MaxUseCount,
                CreatedDate = now,
                CreatedBy = user,
                ModifiedDate = now,
                ModifiedBy = user
            };

            context.PaymentMethods.Add(entity);

            // Auto-create shop details for all enabled shops
            var shopIds = await context.Shops
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .Select(x => x.ShopId)
                .ToListAsync(HttpContext.RequestAborted);

            foreach (var shopId in shopIds)
            {
                context.PaymentMethodShopDetails.Add(new PaymentMethodShopDetail
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    PaymentMethodId = nextId,
                    Enabled = true,
                    CreatedDate = now,
                    CreatedBy = user,
                    ModifiedDate = now,
                    ModifiedBy = user
                });
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new PaymentMethodSummaryDto
            {
                PaymentMethodId = entity.PaymentMethodId,
                AccountId = entity.AccountId,
                PaymentMethodCode = entity.PaymentMethodCode,
                PaymentMethodName = entity.PaymentMethodName,
                DisplayIndex = entity.DisplayIndex,
                Enabled = entity.Enabled,
                IsDrawerKick = entity.IsDrawerKick,
                IsTipEnabled = entity.IsTipEnabled,
                IsNonSalesPayment = entity.IsNonSalesPayment,
                IsCashPayment = entity.IsCashPayment,
                PaymentMethodSurchargeRate = entity.PaymentMethodSurchargeRate,
                LinkedGateway = entity.LinkedGateway,
                ModifiedDate = entity.ModifiedDate,
                ModifiedBy = entity.ModifiedBy
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating payment method for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the payment method." });
        }
    }

    [HttpPut("brand/{brandId:int}/{paymentMethodId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<PaymentMethodSummaryDto>> UpdatePaymentMethod(int brandId, int paymentMethodId, UpsertPaymentMethodDto payload)
    {
        try
        {
            var validationError = ValidatePayload(payload);
            if (validationError != null) return validationError;

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var entity = await context.PaymentMethods
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.PaymentMethodId == paymentMethodId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Payment method not found." });

            entity.PaymentMethodCode = Clip(payload.PaymentMethodCode, 10);
            entity.PaymentMethodName = Clip(payload.PaymentMethodName, 50);
            entity.DisplayIndex = payload.DisplayIndex;
            entity.IsDrawerKick = payload.IsDrawerKick;
            entity.IsTipEnabled = payload.IsTipEnabled;
            entity.IsNonSalesPayment = payload.IsNonSalesPayment;
            entity.IsCashPayment = payload.IsCashPayment;
            entity.IsFixedAmount = payload.IsFixedAmount;
            entity.FixedAmount = payload.FixedAmount;
            entity.IsOverPaymentEnabled = payload.IsOverPaymentEnabled;
            entity.IsFxPayment = payload.IsFxPayment;
            entity.IsAutoRemarkEnabled = payload.IsAutoRemarkEnabled;
            entity.PaymentMethodSurchargeRate = payload.PaymentMethodSurchargeRate;
            entity.TxChargesRate = payload.TxChargesRate;
            entity.LinkedGateway = payload.LinkedGateway;
            entity.RemarkFormats = payload.RemarkFormats;
            entity.MaxUseCount = payload.MaxUseCount;
            entity.ModifiedDate = now;
            entity.ModifiedBy = user;

            // Update shop rules if provided
            if (payload.ShopRules != null)
            {
                var existingDetails = await context.PaymentMethodShopDetails
                    .Where(x => x.AccountId == accountId && x.PaymentMethodId == paymentMethodId)
                    .ToListAsync(HttpContext.RequestAborted);

                var existingMap = existingDetails.ToDictionary(x => x.ShopId);

                foreach (var rule in payload.ShopRules)
                {
                    if (existingMap.TryGetValue(rule.ShopId, out var existing))
                    {
                        existing.Enabled = rule.Enabled;
                        existing.PaymentFxRate = rule.PaymentFxRate;
                        existing.ModifiedDate = now;
                        existing.ModifiedBy = user;
                    }
                    else
                    {
                        context.PaymentMethodShopDetails.Add(new PaymentMethodShopDetail
                        {
                            AccountId = accountId,
                            ShopId = rule.ShopId,
                            PaymentMethodId = paymentMethodId,
                            Enabled = rule.Enabled,
                            PaymentFxRate = rule.PaymentFxRate,
                            CreatedDate = now,
                            CreatedBy = user,
                            ModifiedDate = now,
                            ModifiedBy = user
                        });
                    }
                }
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new PaymentMethodSummaryDto
            {
                PaymentMethodId = entity.PaymentMethodId,
                AccountId = entity.AccountId,
                PaymentMethodCode = entity.PaymentMethodCode,
                PaymentMethodName = entity.PaymentMethodName,
                DisplayIndex = entity.DisplayIndex,
                Enabled = entity.Enabled,
                IsDrawerKick = entity.IsDrawerKick,
                IsTipEnabled = entity.IsTipEnabled,
                IsNonSalesPayment = entity.IsNonSalesPayment,
                IsCashPayment = entity.IsCashPayment,
                PaymentMethodSurchargeRate = entity.PaymentMethodSurchargeRate,
                LinkedGateway = entity.LinkedGateway,
                ModifiedDate = entity.ModifiedDate,
                ModifiedBy = entity.ModifiedBy
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating payment method for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while updating the payment method." });
        }
    }

    [HttpDelete("brand/{brandId:int}/{paymentMethodId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivatePaymentMethod(int brandId, int paymentMethodId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var entity = await context.PaymentMethods
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.PaymentMethodId == paymentMethodId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Payment method not found." });

            entity.Enabled = false;
            entity.ModifiedDate = now;
            entity.ModifiedBy = user;

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new { message = "Payment method deactivated." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating payment method for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the payment method." });
        }
    }
}
