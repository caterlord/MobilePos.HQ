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
[Route("api/tax-surcharge")]
[Authorize]
public class TaxSurchargeController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<TaxSurchargeController> _logger;

    public TaxSurchargeController(IPOSDbContextService posContextService, ILogger<TaxSurchargeController> logger)
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

    private async Task<IReadOnlyList<TaxShopRuleDto>> BuildShopRules<TDetail>(
        Data.EWHQDbContext context,
        int accountId,
        IQueryable<TDetail> shopDetailsQuery,
        Func<TDetail, int> getShopId,
        Func<TDetail, bool> getEnabled)
    {
        var shopDetails = await shopDetailsQuery.ToListAsync(HttpContext.RequestAborted);
        var shops = await context.Shops
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && x.Enabled)
            .Select(x => new { x.ShopId, x.Name })
            .ToListAsync(HttpContext.RequestAborted);

        var detailMap = shopDetails.ToDictionary(getShopId);

        return shops
            .OrderBy(x => x.Name)
            .Select(s =>
            {
                detailMap.TryGetValue(s.ShopId, out var detail);
                return new TaxShopRuleDto
                {
                    ShopId = s.ShopId,
                    ShopName = s.Name ?? string.Empty,
                    Enabled = detail != null ? getEnabled(detail) : true
                };
            })
            .ToList();
    }

    // ════════════════════════════════════════════════════════════════
    //  TAXATION
    // ════════════════════════════════════════════════════════════════

    [HttpGet("brand/{brandId:int}/taxation")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<TaxationSummaryDto>>> GetTaxations(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var items = await context.Taxations
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.Priority)
                .ThenBy(x => x.TaxationName)
                .Select(x => new TaxationSummaryDto
                {
                    TaxationId = x.TaxationId,
                    AccountId = x.AccountId,
                    TaxationCode = x.TaxationCode ?? string.Empty,
                    TaxationName = x.TaxationName ?? string.Empty,
                    Priority = x.Priority,
                    TaxationPercent = x.TaxationPercent,
                    IsFixedAmount = x.IsFixedAmount,
                    TaxationAmount = x.TaxationAmount,
                    Enabled = x.Enabled,
                    IsAutoCalculate = x.IsAutoCalculate,
                    IsOpenAmount = x.IsOpenAmount,
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
            _logger.LogError(ex, "Error fetching taxations for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching taxations." });
        }
    }

    [HttpGet("brand/{brandId:int}/taxation/{taxationId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<TaxationDetailDto>> GetTaxationDetail(int brandId, int taxationId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var entity = await context.Taxations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.TaxationId == taxationId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Taxation not found." });

            var shopRules = await BuildShopRules(
                context, accountId,
                context.TaxationShopDetails.AsNoTracking()
                    .Where(x => x.AccountId == accountId && x.TaxationId == taxationId),
                d => d.ShopId, d => d.Enabled);

            return Ok(new TaxationDetailDto
            {
                TaxationId = entity.TaxationId,
                AccountId = entity.AccountId,
                TaxationCode = entity.TaxationCode ?? string.Empty,
                TaxationName = entity.TaxationName ?? string.Empty,
                Priority = entity.Priority,
                TaxationPercent = entity.TaxationPercent,
                IsFixedAmount = entity.IsFixedAmount,
                TaxationAmount = entity.TaxationAmount,
                IsDateSpecific = entity.IsDateSpecific,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                StartTime = entity.StartTime,
                EndTime = entity.EndTime,
                Enabled = entity.Enabled,
                IsAutoCalculate = entity.IsAutoCalculate,
                IsOpenAmount = entity.IsOpenAmount,
                ModifiedDate = entity.ModifiedDate,
                ModifiedBy = entity.ModifiedBy ?? string.Empty,
                ShopRules = shopRules
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching taxation detail for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching taxation detail." });
        }
    }

    [HttpPost("brand/{brandId:int}/taxation")]
    [RequireBrandModify]
    public async Task<ActionResult<TaxationSummaryDto>> CreateTaxation(int brandId, UpsertTaxationDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.TaxationCode))
                return BadRequest(new { message = "Tax code is required." });
            if (string.IsNullOrWhiteSpace(payload.TaxationName))
                return BadRequest(new { message = "Tax name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var nextId = (await context.Taxations
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.TaxationId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var entity = new Taxation
            {
                TaxationId = nextId,
                AccountId = accountId,
                TaxationCode = Clip(payload.TaxationCode, 50),
                TaxationName = Clip(payload.TaxationName, 200),
                Priority = payload.Priority,
                TaxationPercent = payload.TaxationPercent,
                IsFixedAmount = payload.IsFixedAmount,
                TaxationAmount = payload.TaxationAmount,
                IsDateSpecific = payload.IsDateSpecific,
                StartDate = payload.StartDate,
                EndDate = payload.EndDate,
                StartTime = payload.StartTime,
                EndTime = payload.EndTime,
                Enabled = true,
                IsAutoCalculate = payload.IsAutoCalculate,
                IsOpenAmount = payload.IsOpenAmount,
                CreatedDate = now,
                CreatedBy = user,
                ModifiedDate = now,
                ModifiedBy = user
            };

            context.Taxations.Add(entity);

            var shopIds = await context.Shops.AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .Select(x => x.ShopId)
                .ToListAsync(HttpContext.RequestAborted);

            foreach (var shopId in shopIds)
            {
                context.TaxationShopDetails.Add(new TaxationShopDetail
                {
                    TaxationId = nextId,
                    ShopId = shopId,
                    AccountId = accountId,
                    Enabled = true,
                    CreatedDate = now,
                    CreatedBy = user,
                    ModifiedDate = now,
                    ModifiedBy = user
                });
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new TaxationSummaryDto
            {
                TaxationId = entity.TaxationId,
                AccountId = entity.AccountId,
                TaxationCode = entity.TaxationCode,
                TaxationName = entity.TaxationName,
                Priority = entity.Priority,
                TaxationPercent = entity.TaxationPercent,
                IsFixedAmount = entity.IsFixedAmount,
                TaxationAmount = entity.TaxationAmount,
                Enabled = entity.Enabled,
                IsAutoCalculate = entity.IsAutoCalculate,
                IsOpenAmount = entity.IsOpenAmount,
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
            _logger.LogError(ex, "Error creating taxation for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the taxation." });
        }
    }

    [HttpPut("brand/{brandId:int}/taxation/{taxationId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<TaxationSummaryDto>> UpdateTaxation(int brandId, int taxationId, UpsertTaxationDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.TaxationCode))
                return BadRequest(new { message = "Tax code is required." });
            if (string.IsNullOrWhiteSpace(payload.TaxationName))
                return BadRequest(new { message = "Tax name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var entity = await context.Taxations
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.TaxationId == taxationId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Taxation not found." });

            entity.TaxationCode = Clip(payload.TaxationCode, 50);
            entity.TaxationName = Clip(payload.TaxationName, 200);
            entity.Priority = payload.Priority;
            entity.TaxationPercent = payload.TaxationPercent;
            entity.IsFixedAmount = payload.IsFixedAmount;
            entity.TaxationAmount = payload.TaxationAmount;
            entity.IsDateSpecific = payload.IsDateSpecific;
            entity.StartDate = payload.StartDate;
            entity.EndDate = payload.EndDate;
            entity.StartTime = payload.StartTime;
            entity.EndTime = payload.EndTime;
            entity.IsAutoCalculate = payload.IsAutoCalculate;
            entity.IsOpenAmount = payload.IsOpenAmount;
            entity.ModifiedDate = now;
            entity.ModifiedBy = user;

            if (payload.ShopRules != null)
            {
                var existing = await context.TaxationShopDetails
                    .Where(x => x.AccountId == accountId && x.TaxationId == taxationId)
                    .ToListAsync(HttpContext.RequestAborted);

                var map = existing.ToDictionary(x => x.ShopId);

                foreach (var rule in payload.ShopRules)
                {
                    if (map.TryGetValue(rule.ShopId, out var detail))
                    {
                        detail.Enabled = rule.Enabled;
                        detail.ModifiedDate = now;
                        detail.ModifiedBy = user;
                    }
                    else
                    {
                        context.TaxationShopDetails.Add(new TaxationShopDetail
                        {
                            TaxationId = taxationId,
                            ShopId = rule.ShopId,
                            AccountId = accountId,
                            Enabled = rule.Enabled,
                            CreatedDate = now,
                            CreatedBy = user,
                            ModifiedDate = now,
                            ModifiedBy = user
                        });
                    }
                }
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new TaxationSummaryDto
            {
                TaxationId = entity.TaxationId,
                AccountId = entity.AccountId,
                TaxationCode = entity.TaxationCode,
                TaxationName = entity.TaxationName,
                Priority = entity.Priority,
                TaxationPercent = entity.TaxationPercent,
                IsFixedAmount = entity.IsFixedAmount,
                TaxationAmount = entity.TaxationAmount,
                Enabled = entity.Enabled,
                IsAutoCalculate = entity.IsAutoCalculate,
                IsOpenAmount = entity.IsOpenAmount,
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
            _logger.LogError(ex, "Error updating taxation for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while updating the taxation." });
        }
    }

    [HttpDelete("brand/{brandId:int}/taxation/{taxationId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivateTaxation(int brandId, int taxationId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var entity = await context.Taxations
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.TaxationId == taxationId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Taxation not found." });

            entity.Enabled = false;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new { message = "Taxation deactivated." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating taxation for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the taxation." });
        }
    }

    // ════════════════════════════════════════════════════════════════
    //  SURCHARGE (ServiceCharge)
    // ════════════════════════════════════════════════════════════════

    [HttpGet("brand/{brandId:int}/surcharge")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<SurchargeSummaryDto>>> GetSurcharges(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var items = await context.ServiceCharges
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.Priority)
                .ThenBy(x => x.ServiceChargeName)
                .Select(x => new SurchargeSummaryDto
                {
                    ServiceChargeId = x.ServiceChargeId,
                    AccountId = x.AccountId,
                    ServiceChargeCode = x.ServiceChargeCode ?? string.Empty,
                    ServiceChargeName = x.ServiceChargeName ?? string.Empty,
                    Priority = x.Priority,
                    ServiceChargePercent = x.ServiceChargePercent,
                    IsFixedAmount = x.IsFixedAmount,
                    ServiceChargeAmount = x.ServiceChargeAmount,
                    Enabled = x.Enabled,
                    IsAutoCalculate = x.IsAutoCalculate,
                    IsOpenAmount = x.IsOpenAmount,
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
            _logger.LogError(ex, "Error fetching surcharges for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching surcharges." });
        }
    }

    [HttpGet("brand/{brandId:int}/surcharge/{serviceChargeId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<SurchargeDetailDto>> GetSurchargeDetail(int brandId, int serviceChargeId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var entity = await context.ServiceCharges
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ServiceChargeId == serviceChargeId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Surcharge not found." });

            var shopRules = await BuildShopRules(
                context, accountId,
                context.ServiceChargeShopDetails.AsNoTracking()
                    .Where(x => x.AccountId == accountId && x.ServiceChargeId == serviceChargeId),
                d => d.ShopId, d => d.Enabled);

            return Ok(new SurchargeDetailDto
            {
                ServiceChargeId = entity.ServiceChargeId,
                AccountId = entity.AccountId,
                ServiceChargeCode = entity.ServiceChargeCode ?? string.Empty,
                ServiceChargeName = entity.ServiceChargeName ?? string.Empty,
                Priority = entity.Priority,
                ServiceChargePercent = entity.ServiceChargePercent,
                IsFixedAmount = entity.IsFixedAmount,
                ServiceChargeAmount = entity.ServiceChargeAmount,
                IsDateSpecific = entity.IsDateSpecific,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                StartTime = entity.StartTime,
                EndTime = entity.EndTime,
                Enabled = entity.Enabled,
                IsAutoCalculate = entity.IsAutoCalculate,
                IsOpenAmount = entity.IsOpenAmount,
                ModifiedDate = entity.ModifiedDate,
                ModifiedBy = entity.ModifiedBy ?? string.Empty,
                ShopRules = shopRules
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching surcharge detail for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching surcharge detail." });
        }
    }

    [HttpPost("brand/{brandId:int}/surcharge")]
    [RequireBrandModify]
    public async Task<ActionResult<SurchargeSummaryDto>> CreateSurcharge(int brandId, UpsertSurchargeDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.ServiceChargeCode))
                return BadRequest(new { message = "Surcharge code is required." });
            if (string.IsNullOrWhiteSpace(payload.ServiceChargeName))
                return BadRequest(new { message = "Surcharge name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var nextId = (await context.ServiceCharges
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.ServiceChargeId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var entity = new ServiceCharge
            {
                ServiceChargeId = nextId,
                AccountId = accountId,
                ServiceChargeCode = Clip(payload.ServiceChargeCode, 50),
                ServiceChargeName = Clip(payload.ServiceChargeName, 200),
                Priority = payload.Priority,
                ServiceChargePercent = payload.ServiceChargePercent,
                IsFixedAmount = payload.IsFixedAmount,
                ServiceChargeAmount = payload.ServiceChargeAmount,
                IsDateSpecific = payload.IsDateSpecific,
                StartDate = payload.StartDate,
                EndDate = payload.EndDate,
                StartTime = payload.StartTime,
                EndTime = payload.EndTime,
                Enabled = true,
                IsAutoCalculate = payload.IsAutoCalculate,
                IsOpenAmount = payload.IsOpenAmount,
                CreatedDate = now,
                CreatedBy = user,
                ModifiedDate = now,
                ModifiedBy = user
            };

            context.ServiceCharges.Add(entity);

            var shopIds = await context.Shops.AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .Select(x => x.ShopId)
                .ToListAsync(HttpContext.RequestAborted);

            foreach (var shopId in shopIds)
            {
                context.ServiceChargeShopDetails.Add(new ServiceChargeShopDetail
                {
                    ServiceChargeId = nextId,
                    ShopId = shopId,
                    AccountId = accountId,
                    Enabled = true,
                    CreatedDate = now,
                    CreatedBy = user,
                    ModifiedDate = now,
                    ModifiedBy = user
                });
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new SurchargeSummaryDto
            {
                ServiceChargeId = entity.ServiceChargeId,
                AccountId = entity.AccountId,
                ServiceChargeCode = entity.ServiceChargeCode,
                ServiceChargeName = entity.ServiceChargeName,
                Priority = entity.Priority,
                ServiceChargePercent = entity.ServiceChargePercent,
                IsFixedAmount = entity.IsFixedAmount,
                ServiceChargeAmount = entity.ServiceChargeAmount,
                Enabled = entity.Enabled,
                IsAutoCalculate = entity.IsAutoCalculate,
                IsOpenAmount = entity.IsOpenAmount,
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
            _logger.LogError(ex, "Error creating surcharge for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the surcharge." });
        }
    }

    [HttpPut("brand/{brandId:int}/surcharge/{serviceChargeId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<SurchargeSummaryDto>> UpdateSurcharge(int brandId, int serviceChargeId, UpsertSurchargeDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.ServiceChargeCode))
                return BadRequest(new { message = "Surcharge code is required." });
            if (string.IsNullOrWhiteSpace(payload.ServiceChargeName))
                return BadRequest(new { message = "Surcharge name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var entity = await context.ServiceCharges
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ServiceChargeId == serviceChargeId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Surcharge not found." });

            entity.ServiceChargeCode = Clip(payload.ServiceChargeCode, 50);
            entity.ServiceChargeName = Clip(payload.ServiceChargeName, 200);
            entity.Priority = payload.Priority;
            entity.ServiceChargePercent = payload.ServiceChargePercent;
            entity.IsFixedAmount = payload.IsFixedAmount;
            entity.ServiceChargeAmount = payload.ServiceChargeAmount;
            entity.IsDateSpecific = payload.IsDateSpecific;
            entity.StartDate = payload.StartDate;
            entity.EndDate = payload.EndDate;
            entity.StartTime = payload.StartTime;
            entity.EndTime = payload.EndTime;
            entity.IsAutoCalculate = payload.IsAutoCalculate;
            entity.IsOpenAmount = payload.IsOpenAmount;
            entity.ModifiedDate = now;
            entity.ModifiedBy = user;

            if (payload.ShopRules != null)
            {
                var existing = await context.ServiceChargeShopDetails
                    .Where(x => x.AccountId == accountId && x.ServiceChargeId == serviceChargeId)
                    .ToListAsync(HttpContext.RequestAborted);

                var map = existing.ToDictionary(x => x.ShopId);

                foreach (var rule in payload.ShopRules)
                {
                    if (map.TryGetValue(rule.ShopId, out var detail))
                    {
                        detail.Enabled = rule.Enabled;
                        detail.ModifiedDate = now;
                        detail.ModifiedBy = user;
                    }
                    else
                    {
                        context.ServiceChargeShopDetails.Add(new ServiceChargeShopDetail
                        {
                            ServiceChargeId = serviceChargeId,
                            ShopId = rule.ShopId,
                            AccountId = accountId,
                            Enabled = rule.Enabled,
                            CreatedDate = now,
                            CreatedBy = user,
                            ModifiedDate = now,
                            ModifiedBy = user
                        });
                    }
                }
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new SurchargeSummaryDto
            {
                ServiceChargeId = entity.ServiceChargeId,
                AccountId = entity.AccountId,
                ServiceChargeCode = entity.ServiceChargeCode,
                ServiceChargeName = entity.ServiceChargeName,
                Priority = entity.Priority,
                ServiceChargePercent = entity.ServiceChargePercent,
                IsFixedAmount = entity.IsFixedAmount,
                ServiceChargeAmount = entity.ServiceChargeAmount,
                Enabled = entity.Enabled,
                IsAutoCalculate = entity.IsAutoCalculate,
                IsOpenAmount = entity.IsOpenAmount,
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
            _logger.LogError(ex, "Error updating surcharge for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while updating the surcharge." });
        }
    }

    [HttpDelete("brand/{brandId:int}/surcharge/{serviceChargeId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivateSurcharge(int brandId, int serviceChargeId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var entity = await context.ServiceCharges
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ServiceChargeId == serviceChargeId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Surcharge not found." });

            entity.Enabled = false;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new { message = "Surcharge deactivated." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating surcharge for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the surcharge." });
        }
    }
}
