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
[Route("api/reasons")]
[Authorize]
public class ReasonsController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<ReasonsController> _logger;

    public ReasonsController(IPOSDbContextService posContextService, ILogger<ReasonsController> logger)
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

    [HttpGet("brand/{brandId:int}")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<ReasonSummaryDto>>> GetReasons(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var items = await context.Reasons
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.ReasonGroupCode)
                .ThenBy(x => x.ReasonCode)
                .Select(x => new ReasonSummaryDto
                {
                    ReasonId = x.ReasonId,
                    AccountId = x.AccountId,
                    ReasonGroupCode = x.ReasonGroupCode ?? string.Empty,
                    ReasonCode = x.ReasonCode ?? string.Empty,
                    ReasonDesc = x.ReasonDesc ?? string.Empty,
                    Enabled = x.Enabled,
                    IsSystemReason = x.IsSystemReason,
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
            _logger.LogError(ex, "Error fetching reasons for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching reasons." });
        }
    }

    [HttpPost("brand/{brandId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<ReasonSummaryDto>> CreateReason(int brandId, UpsertReasonDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.ReasonCode))
                return BadRequest(new { message = "Reason code is required." });
            if (string.IsNullOrWhiteSpace(payload.ReasonDesc))
                return BadRequest(new { message = "Reason description is required." });
            if (string.IsNullOrWhiteSpace(payload.ReasonGroupCode))
                return BadRequest(new { message = "Reason type is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var nextId = (await context.Reasons
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.ReasonId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var entity = new Reason
            {
                ReasonId = nextId,
                AccountId = accountId,
                ReasonGroupCode = Clip(payload.ReasonGroupCode, 10),
                ReasonCode = Clip(payload.ReasonCode, 10),
                ReasonDesc = Clip(payload.ReasonDesc, 500),
                Enabled = true,
                CreatedDate = now,
                CreatedBy = user,
                ModifiedDate = now,
                ModifiedBy = user
            };

            context.Reasons.Add(entity);
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new ReasonSummaryDto
            {
                ReasonId = entity.ReasonId,
                AccountId = entity.AccountId,
                ReasonGroupCode = entity.ReasonGroupCode,
                ReasonCode = entity.ReasonCode,
                ReasonDesc = entity.ReasonDesc,
                Enabled = entity.Enabled,
                IsSystemReason = entity.IsSystemReason,
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
            _logger.LogError(ex, "Error creating reason for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the reason." });
        }
    }

    [HttpPut("brand/{brandId:int}/{reasonId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<ReasonSummaryDto>> UpdateReason(int brandId, int reasonId, UpsertReasonDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.ReasonCode))
                return BadRequest(new { message = "Reason code is required." });
            if (string.IsNullOrWhiteSpace(payload.ReasonDesc))
                return BadRequest(new { message = "Reason description is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var entity = await context.Reasons
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ReasonId == reasonId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Reason not found." });

            entity.ReasonGroupCode = Clip(payload.ReasonGroupCode, 10);
            entity.ReasonCode = Clip(payload.ReasonCode, 10);
            entity.ReasonDesc = Clip(payload.ReasonDesc, 500);
            entity.ModifiedDate = now;
            entity.ModifiedBy = user;

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new ReasonSummaryDto
            {
                ReasonId = entity.ReasonId,
                AccountId = entity.AccountId,
                ReasonGroupCode = entity.ReasonGroupCode,
                ReasonCode = entity.ReasonCode,
                ReasonDesc = entity.ReasonDesc,
                Enabled = entity.Enabled,
                IsSystemReason = entity.IsSystemReason,
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
            _logger.LogError(ex, "Error updating reason for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while updating the reason." });
        }
    }

    [HttpDelete("brand/{brandId:int}/{reasonId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivateReason(int brandId, int reasonId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var entity = await context.Reasons
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ReasonId == reasonId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Reason not found." });

            entity.Enabled = false;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new { message = "Reason deactivated." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating reason for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the reason." });
        }
    }
}
