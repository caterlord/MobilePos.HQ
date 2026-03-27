using System.Security.Claims;
using EWHQ.Api.Authorization;
using EWHQ.Api.Models.Entities;
using EWHQ.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/pos-menus")]
[Authorize]
public class PosMenuController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<PosMenuController> _logger;

    public PosMenuController(IPOSDbContextService posContextService, ILogger<PosMenuController> logger)
    {
        _posContextService = posContextService;
        _logger = logger;
    }

    private string GetCurrentUserIdentifier()
    {
        const int maxLength = 50;
        var id = User?.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(id)) return "System";
        id = id.Trim();
        return id.Length <= maxLength ? id : id[..maxLength];
    }

    // ── List Menus ──

    [HttpGet("brand/{brandId:int}")]
    [RequireBrandView]
    public async Task<IActionResult> GetMenus(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var menus = await context.MenuHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && !(x.IsOdoDisplay ?? false))
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.MenuName)
                .Select(x => new
                {
                    x.MenuId,
                    x.MenuName,
                    menuNameAlt = x.MenuNameAlt ?? "",
                    x.MenuCode,
                    x.DisplayOrder,
                    x.IsBuiltIn,
                    x.IsPublished,
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(menus);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching POS menus for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    // ── Create Menu ──

    [HttpPost("brand/{brandId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> CreateMenu(int brandId, [FromBody] UpsertPosMenuRequest payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.MenuName))
                return BadRequest(new { message = "Menu name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var actor = GetCurrentUserIdentifier();

            var nextId = (await context.MenuHeaders
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.MenuId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var maxOrder = await context.MenuHeaders
                .Where(x => x.AccountId == accountId && x.Enabled)
                .Select(x => (int?)x.DisplayOrder)
                .MaxAsync(HttpContext.RequestAborted) ?? -1;

            var entity = new MenuHeader
            {
                MenuId = nextId,
                AccountId = accountId,
                MenuName = payload.MenuName.Trim(),
                MenuNameAlt = payload.MenuNameAlt?.Trim() ?? "",
                MenuCode = payload.MenuCode?.Trim() ?? "",
                DisplayOrder = maxOrder + 1,
                IsBuiltIn = false,
                IsPublished = payload.IsPublished,
                Enabled = true,
                CreatedDate = now,
                CreatedBy = actor,
                ModifiedDate = now,
                ModifiedBy = actor,
            };

            context.MenuHeaders.Add(entity);
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new
            {
                entity.MenuId,
                entity.MenuName,
                menuNameAlt = entity.MenuNameAlt ?? "",
                entity.MenuCode,
                entity.DisplayOrder,
                entity.IsBuiltIn,
                entity.IsPublished,
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating POS menu for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    // ── Update Menu ──

    [HttpPut("brand/{brandId:int}/{menuId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> UpdateMenu(int brandId, int menuId, [FromBody] UpsertPosMenuRequest payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.MenuName))
                return BadRequest(new { message = "Menu name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var entity = await context.MenuHeaders
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.MenuId == menuId, HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Menu not found." });

            entity.MenuName = payload.MenuName.Trim();
            entity.MenuNameAlt = payload.MenuNameAlt?.Trim() ?? "";
            entity.MenuCode = payload.MenuCode?.Trim() ?? "";
            entity.IsPublished = payload.IsPublished;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return Ok(new { message = "Menu updated." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating POS menu {MenuId} for brand {BrandId}", menuId, brandId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    // ── Delete (Soft) Menu ──

    [HttpDelete("brand/{brandId:int}/{menuId:int}")]
    [RequireBrandModify]
    public async Task<IActionResult> DeleteMenu(int brandId, int menuId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var entity = await context.MenuHeaders
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.MenuId == menuId, HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Menu not found." });

            if (entity.IsBuiltIn)
                return BadRequest(new { message = "Built-in menus cannot be deleted." });

            entity.Enabled = false;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return Ok(new { message = "Menu deleted." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting POS menu {MenuId} for brand {BrandId}", menuId, brandId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    // ── Reorder Menus ──

    [HttpPut("brand/{brandId:int}/reorder")]
    [RequireBrandModify]
    public async Task<IActionResult> ReorderMenus(int brandId, [FromBody] List<ReorderEntry> entries)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var actor = GetCurrentUserIdentifier();
            var now = DateTime.UtcNow;

            var menus = await context.MenuHeaders
                .Where(x => x.AccountId == accountId && x.Enabled)
                .ToListAsync(HttpContext.RequestAborted);

            var menuMap = menus.ToDictionary(x => x.MenuId);

            foreach (var entry in entries)
            {
                if (menuMap.TryGetValue(entry.Id, out var menu))
                {
                    menu.DisplayOrder = entry.DisplayOrder;
                    menu.ModifiedDate = now;
                    menu.ModifiedBy = actor;
                }
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return Ok(new { message = "Menus reordered." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reordering POS menus for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    // ── Get Menu Categories (assigned to a menu) ──

    [HttpGet("brand/{brandId:int}/{menuId:int}/categories")]
    [RequireBrandView]
    public async Task<IActionResult> GetMenuCategories(int brandId, int menuId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var details = await context.MenuDetails
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.MenuId == menuId)
                .ToListAsync(HttpContext.RequestAborted);

            // Resolve names for regular categories
            var regularIds = details.Where(d => !d.IsSmartCategory).Select(d => d.CategoryId).Distinct().ToList();
            var regularNames = new Dictionary<int, (string Name, string NameAlt, int DisplayIndex)>();
            if (regularIds.Count > 0)
            {
                var cats = await context.ItemCategories.AsNoTracking()
                    .Where(x => x.AccountId == accountId && regularIds.Contains(x.CategoryId))
                    .Select(x => new { x.CategoryId, x.CategoryName, x.CategoryNameAlt, x.DisplayIndex })
                    .ToListAsync(HttpContext.RequestAborted);
                foreach (var c in cats)
                    regularNames[c.CategoryId] = (c.CategoryName ?? "", c.CategoryNameAlt ?? "", c.DisplayIndex);
            }

            // Resolve names for smart categories
            var smartIds = details.Where(d => d.IsSmartCategory).Select(d => d.CategoryId).Distinct().ToList();
            var smartNames = new Dictionary<int, (string Name, string NameAlt, int DisplayIndex)>();
            if (smartIds.Count > 0)
            {
                var scs = await context.SmartCategories.AsNoTracking()
                    .Where(x => x.AccountId == accountId && smartIds.Contains(x.SmartCategoryId))
                    .Select(x => new { x.SmartCategoryId, x.Name, x.NameAlt, x.DisplayIndex })
                    .ToListAsync(HttpContext.RequestAborted);
                foreach (var s in scs)
                    smartNames[s.SmartCategoryId] = (s.Name ?? "", s.NameAlt ?? "", s.DisplayIndex);
            }

            var result = details.Select(d =>
            {
                string name = "", nameAlt = "";
                int displayIndex = 0;
                if (d.IsSmartCategory && smartNames.TryGetValue(d.CategoryId, out var sc))
                {
                    name = sc.Name; nameAlt = sc.NameAlt; displayIndex = sc.DisplayIndex;
                }
                else if (!d.IsSmartCategory && regularNames.TryGetValue(d.CategoryId, out var rc))
                {
                    name = rc.Name; nameAlt = rc.NameAlt; displayIndex = rc.DisplayIndex;
                }

                return new
                {
                    d.CategoryId,
                    d.IsSmartCategory,
                    categoryName = name,
                    categoryNameAlt = nameAlt,
                    displayIndex,
                    type = d.IsSmartCategory ? "Smart Category" : "Category",
                };
            })
            .OrderBy(x => x.displayIndex)
            .ToList();

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching menu categories for brand {BrandId} menu {MenuId}", brandId, menuId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    // ── Update Menu Categories (full replace) ──

    [HttpPut("brand/{brandId:int}/{menuId:int}/categories")]
    [RequireBrandModify]
    public async Task<IActionResult> UpdateMenuCategories(int brandId, int menuId, [FromBody] List<MenuCategoryEntry> entries)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var actor = GetCurrentUserIdentifier();

            // Remove all existing
            var existing = await context.MenuDetails
                .Where(x => x.AccountId == accountId && x.MenuId == menuId)
                .ToListAsync(HttpContext.RequestAborted);
            context.MenuDetails.RemoveRange(existing);

            // Add new
            foreach (var entry in entries)
            {
                context.MenuDetails.Add(new MenuDetail
                {
                    AccountId = accountId,
                    MenuId = menuId,
                    CategoryId = entry.CategoryId,
                    IsSmartCategory = entry.IsSmartCategory,
                    CreatedDate = now,
                    CreatedBy = actor,
                    ModifiedDate = now,
                    ModifiedBy = actor,
                });
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return Ok(new { message = "Menu categories updated.", count = entries.Count });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating menu categories for brand {BrandId} menu {MenuId}", brandId, menuId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    // ── Get All Available Categories (for selection) ──

    [HttpGet("brand/{brandId:int}/available-categories")]
    [RequireBrandView]
    public async Task<IActionResult> GetAvailableCategories(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var regularCategories = await context.ItemCategories
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && x.ParentCategoryId == null)
                .OrderBy(x => x.DisplayIndex)
                .Select(x => new
                {
                    categoryId = x.CategoryId,
                    isSmartCategory = false,
                    categoryName = x.CategoryName ?? "",
                    categoryNameAlt = x.CategoryNameAlt ?? "",
                    type = "Category",
                })
                .ToListAsync(HttpContext.RequestAborted);

            var smartCategories = await context.SmartCategories
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && x.ParentSmartCategoryId == null)
                .OrderBy(x => x.DisplayIndex)
                .Select(x => new
                {
                    categoryId = x.SmartCategoryId,
                    isSmartCategory = true,
                    categoryName = x.Name ?? "",
                    categoryNameAlt = x.NameAlt ?? "",
                    type = "Smart Category",
                })
                .ToListAsync(HttpContext.RequestAborted);

            var result = regularCategories.Cast<object>().Concat(smartCategories.Cast<object>()).ToList();
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching available categories for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }
}

// ── Request DTOs ──

public class UpsertPosMenuRequest
{
    public string MenuName { get; set; } = string.Empty;
    public string? MenuNameAlt { get; set; }
    public string? MenuCode { get; set; }
    public bool IsPublished { get; set; } = true;
}

public class ReorderEntry
{
    public int Id { get; set; }
    public int DisplayOrder { get; set; }
}

public class MenuCategoryEntry
{
    public int CategoryId { get; set; }
    public bool IsSmartCategory { get; set; }
}
