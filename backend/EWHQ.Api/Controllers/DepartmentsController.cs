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
[Route("api/departments")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<DepartmentsController> _logger;

    public DepartmentsController(IPOSDbContextService posContextService, ILogger<DepartmentsController> logger)
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
    public async Task<ActionResult<IReadOnlyList<DepartmentSummaryDto>>> GetDepartments(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var items = await context.Departments
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.DepartmentCode)
                .ThenBy(x => x.DepartmentName)
                .Select(x => new DepartmentSummaryDto
                {
                    DepartmentId = x.DepartmentId,
                    AccountId = x.AccountId,
                    DepartmentCode = x.DepartmentCode,
                    DepartmentName = x.DepartmentName ?? string.Empty,
                    Description = x.Description,
                    RevenueCenterCode = x.RevenueCenterCode,
                    IsSubDepartment = x.IsSubDepartment,
                    ParentDepartmentId = x.ParentDepartmentId,
                    Enabled = x.Enabled,
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
            _logger.LogError(ex, "Error fetching departments for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching departments." });
        }
    }

    [HttpPost("brand/{brandId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<DepartmentSummaryDto>> CreateDepartment(int brandId, UpsertDepartmentDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.DepartmentName))
                return BadRequest(new { message = "Department name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var nextId = (await context.Departments
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.DepartmentId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var entity = new Department
            {
                DepartmentId = nextId,
                AccountId = accountId,
                DepartmentCode = payload.DepartmentCode?.Trim(),
                DepartmentName = Clip(payload.DepartmentName, 100),
                Description = payload.Description?.Trim(),
                RevenueCenterCode = payload.RevenueCenterCode?.Trim(),
                IsSubDepartment = payload.IsSubDepartment,
                ParentDepartmentId = payload.ParentDepartmentId,
                Enabled = true,
                CreatedDate = now,
                CreatedBy = user,
                ModifiedDate = now,
                ModifiedBy = user
            };

            context.Departments.Add(entity);
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new DepartmentSummaryDto
            {
                DepartmentId = entity.DepartmentId,
                AccountId = entity.AccountId,
                DepartmentCode = entity.DepartmentCode,
                DepartmentName = entity.DepartmentName,
                Description = entity.Description,
                RevenueCenterCode = entity.RevenueCenterCode,
                IsSubDepartment = entity.IsSubDepartment,
                ParentDepartmentId = entity.ParentDepartmentId,
                Enabled = entity.Enabled,
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
            _logger.LogError(ex, "Error creating department for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the department." });
        }
    }

    [HttpPut("brand/{brandId:int}/{departmentId:int}")]
    [RequireBrandModify]
    public async Task<ActionResult<DepartmentSummaryDto>> UpdateDepartment(int brandId, int departmentId, UpsertDepartmentDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.DepartmentName))
                return BadRequest(new { message = "Department name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var entity = await context.Departments
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.DepartmentId == departmentId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Department not found." });

            entity.DepartmentCode = payload.DepartmentCode?.Trim();
            entity.DepartmentName = Clip(payload.DepartmentName, 100);
            entity.Description = payload.Description?.Trim();
            entity.RevenueCenterCode = payload.RevenueCenterCode?.Trim();
            entity.IsSubDepartment = payload.IsSubDepartment;
            entity.ParentDepartmentId = payload.ParentDepartmentId;
            entity.ModifiedDate = now;
            entity.ModifiedBy = user;

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new DepartmentSummaryDto
            {
                DepartmentId = entity.DepartmentId,
                AccountId = entity.AccountId,
                DepartmentCode = entity.DepartmentCode,
                DepartmentName = entity.DepartmentName,
                Description = entity.Description,
                RevenueCenterCode = entity.RevenueCenterCode,
                IsSubDepartment = entity.IsSubDepartment,
                ParentDepartmentId = entity.ParentDepartmentId,
                Enabled = entity.Enabled,
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
            _logger.LogError(ex, "Error updating department for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while updating the department." });
        }
    }

    [HttpDelete("brand/{brandId:int}/{departmentId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeactivateDepartment(int brandId, int departmentId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var entity = await context.Departments
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.DepartmentId == departmentId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Department not found." });

            entity.Enabled = false;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new { message = "Department deactivated." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating department for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the department." });
        }
    }
}
