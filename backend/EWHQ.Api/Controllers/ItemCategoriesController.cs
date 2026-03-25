using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using EWHQ.Api.DTOs;
using EWHQ.Api.Models.Entities;
using EWHQ.Api.Services;
using EWHQ.Api.Authorization;
using System.Security.Claims;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/item-categories")]
[Authorize]
public class ItemCategoriesController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ILogger<ItemCategoriesController> _logger;

    public ItemCategoriesController(
        IPOSDbContextService posContextService,
        ILogger<ItemCategoriesController> logger)
    {
        _posContextService = posContextService;
        _logger = logger;
    }

    [HttpGet("brand/{brandId}")]
    [RequireBrandView] // Viewer role or higher can view categories
    public async Task<ActionResult<IEnumerable<ItemCategoryDto>>> GetItemCategories(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var categories = await context.ItemCategories
                .Where(c => c.AccountId == accountId)
                .OrderBy(c => c.DisplayIndex)
                .AsNoTracking()
                .Select(c => new ItemCategoryDto
                {
                    CategoryId = c.CategoryId,
                    AccountId = c.AccountId,
                    CategoryName = c.CategoryName ?? string.Empty,
                    CategoryNameAlt = c.CategoryNameAlt,
                    DisplayIndex = c.DisplayIndex,
                    ParentCategoryId = c.ParentCategoryId,
                    IsTerminal = c.IsTerminal,
                    IsPublicDisplay = c.IsPublicDisplay,
                    ButtonStyleId = c.ButtonStyleId,
                    PrinterName = c.PrinterName,
                    IsModifier = c.IsModifier,
                    Enabled = c.Enabled,
                    CreatedDate = c.CreatedDate,
                    CreatedBy = c.CreatedBy,
                    ModifiedDate = c.ModifiedDate,
                    ModifiedBy = c.ModifiedBy,
                    CategoryTypeId = c.CategoryTypeId,
                    ImageFileName = c.ImageFileName,
                    IsSelfOrderingDisplay = c.IsSelfOrderingDisplay,
                    IsOnlineStoreDisplay = c.IsOnlineStoreDisplay,
                    CategoryCode = c.CategoryCode
                })
                .ToListAsync();

            return Ok(categories);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching item categories for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching item categories" });
        }
    }

    [HttpGet("brand/{brandId}/{categoryId}")]
    [RequireBrandView] // Viewer role or higher can view categories
    public async Task<ActionResult<ItemCategoryDto>> GetItemCategory(int brandId, int categoryId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var category = await context.ItemCategories
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId && c.AccountId == accountId);

            if (category == null)
            {
                return NotFound(new { message = "Item category not found" });
            }

            var dto = new ItemCategoryDto
            {
                CategoryId = category.CategoryId,
                AccountId = category.AccountId,
                CategoryName = category.CategoryName ?? string.Empty,
                CategoryNameAlt = category.CategoryNameAlt,
                DisplayIndex = category.DisplayIndex,
                ParentCategoryId = category.ParentCategoryId,
                IsTerminal = category.IsTerminal,
                IsPublicDisplay = category.IsPublicDisplay,
                ButtonStyleId = category.ButtonStyleId,
                PrinterName = category.PrinterName,
                IsModifier = category.IsModifier,
                Enabled = category.Enabled,
                CreatedDate = category.CreatedDate,
                CreatedBy = category.CreatedBy,
                ModifiedDate = category.ModifiedDate,
                ModifiedBy = category.ModifiedBy,
                CategoryTypeId = category.CategoryTypeId,
                ImageFileName = category.ImageFileName,
                IsSelfOrderingDisplay = category.IsSelfOrderingDisplay,
                IsOnlineStoreDisplay = category.IsOnlineStoreDisplay,
                CategoryCode = category.CategoryCode
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
            _logger.LogError(ex, "Error fetching item category {CategoryId} for brand {BrandId}", categoryId, brandId);
            return StatusCode(500, new { message = "An error occurred while fetching the item category" });
        }
    }

    [HttpPost("brand/{brandId}")]
    [RequireBrandModify] // Only Brand Admin/Owner can create categories
    public async Task<ActionResult<ItemCategoryDto>> CreateItemCategory(int brandId, CreateItemCategoryDto createDto)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            // Get the next CategoryId for this account
            var maxCategoryId = await context.ItemCategories
                .Where(c => c.AccountId == accountId)
                .MaxAsync(c => (int?)c.CategoryId) ?? 0;

            var category = new ItemCategory
            {
                CategoryId = maxCategoryId + 1,
                AccountId = accountId,
                CategoryName = createDto.CategoryName,
                CategoryNameAlt = createDto.CategoryNameAlt,
                DisplayIndex = createDto.DisplayIndex,
                ParentCategoryId = createDto.ParentCategoryId,
                IsTerminal = createDto.IsTerminal,
                IsPublicDisplay = createDto.IsPublicDisplay,
                ButtonStyleId = createDto.ButtonStyleId,
                PrinterName = createDto.PrinterName,
                IsModifier = createDto.IsModifier,
                Enabled = createDto.Enabled,
                CategoryTypeId = createDto.CategoryTypeId,
                ImageFileName = createDto.ImageFileName,
                IsSelfOrderingDisplay = createDto.IsSelfOrderingDisplay,
                IsOnlineStoreDisplay = createDto.IsOnlineStoreDisplay,
                CategoryCode = createDto.CategoryCode,
                CreatedDate = DateTime.UtcNow,
                CreatedBy = User.FindFirst(ClaimTypes.Email)?.Value ?? "System",
                ModifiedDate = DateTime.UtcNow,
                ModifiedBy = User.FindFirst(ClaimTypes.Email)?.Value ?? "System"
            };

            context.ItemCategories.Add(category);
            await context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetItemCategory),
                new { brandId, categoryId = category.CategoryId },
                new ItemCategoryDto
                {
                    CategoryId = category.CategoryId,
                    AccountId = category.AccountId,
                    CategoryName = category.CategoryName,
                    CategoryNameAlt = category.CategoryNameAlt,
                    DisplayIndex = category.DisplayIndex,
                    ParentCategoryId = category.ParentCategoryId,
                    IsTerminal = category.IsTerminal,
                    IsPublicDisplay = category.IsPublicDisplay,
                    ButtonStyleId = category.ButtonStyleId,
                    PrinterName = category.PrinterName,
                    IsModifier = category.IsModifier,
                    Enabled = category.Enabled,
                    CreatedDate = category.CreatedDate,
                    CreatedBy = category.CreatedBy,
                    ModifiedDate = category.ModifiedDate,
                    ModifiedBy = category.ModifiedBy,
                    CategoryTypeId = category.CategoryTypeId,
                    ImageFileName = category.ImageFileName,
                    IsSelfOrderingDisplay = category.IsSelfOrderingDisplay,
                    IsOnlineStoreDisplay = category.IsOnlineStoreDisplay,
                    CategoryCode = category.CategoryCode
                });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating item category for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the item category" });
        }
    }

    [HttpPut("brand/{brandId}/{categoryId}")]
    [RequireBrandModify] // Only Brand Admin/Owner can update categories
    public async Task<ActionResult> UpdateItemCategory(int brandId, int categoryId, UpdateItemCategoryDto updateDto)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var category = await context.ItemCategories
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId && c.AccountId == accountId);

            if (category == null)
            {
                return NotFound(new { message = "Item category not found" });
            }

            // Only update fields that are provided (not null/default in DTO)
            if (!string.IsNullOrEmpty(updateDto.CategoryName))
                category.CategoryName = updateDto.CategoryName;

            if (updateDto.CategoryNameAlt != null)
                category.CategoryNameAlt = updateDto.CategoryNameAlt;

            category.DisplayIndex = updateDto.DisplayIndex;

            if (updateDto.ParentCategoryId.HasValue || updateDto.ParentCategoryId == null)
                category.ParentCategoryId = updateDto.ParentCategoryId;

            category.IsTerminal = updateDto.IsTerminal;
            category.IsPublicDisplay = updateDto.IsPublicDisplay;

            if (updateDto.ButtonStyleId.HasValue || updateDto.ButtonStyleId == null)
                category.ButtonStyleId = updateDto.ButtonStyleId;

            if (updateDto.PrinterName != null)
                category.PrinterName = updateDto.PrinterName;

            category.IsModifier = updateDto.IsModifier;
            category.Enabled = updateDto.Enabled;

            if (updateDto.CategoryTypeId.HasValue || updateDto.CategoryTypeId == null)
                category.CategoryTypeId = updateDto.CategoryTypeId;

            if (updateDto.ImageFileName != null)
                category.ImageFileName = updateDto.ImageFileName;

            if (updateDto.IsSelfOrderingDisplay.HasValue)
                category.IsSelfOrderingDisplay = updateDto.IsSelfOrderingDisplay;

            if (updateDto.IsOnlineStoreDisplay.HasValue)
                category.IsOnlineStoreDisplay = updateDto.IsOnlineStoreDisplay;

            if (updateDto.CategoryCode != null)
                category.CategoryCode = updateDto.CategoryCode;

            // Ensure required fields have values (handle legacy data with NULLs)
            if (string.IsNullOrEmpty(category.CategoryName))
                category.CategoryName = "Unnamed Category";

            if (!category.CreatedDate.HasValue)
                category.CreatedDate = DateTime.UtcNow;

            if (string.IsNullOrEmpty(category.CreatedBy))
                category.CreatedBy = "System";

            category.ModifiedDate = DateTime.UtcNow;
            category.ModifiedBy = User.FindFirst(ClaimTypes.Email)?.Value ?? "System";

            await context.SaveChangesAsync();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item category {CategoryId} for brand {BrandId}", categoryId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating the item category" });
        }
    }

    [HttpDelete("brand/{brandId}/{categoryId}")]
    [RequireBrandModify] // Only Brand Admin/Owner can delete categories
    public async Task<ActionResult> DeleteItemCategory(int brandId, int categoryId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var category = await context.ItemCategories
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId && c.AccountId == accountId);

            if (category == null)
            {
                return NotFound(new { message = "Item category not found" });
            }

            // Soft delete by setting Enabled to false
            category.Enabled = false;
            category.ModifiedDate = DateTime.UtcNow;
            category.ModifiedBy = User.FindFirst(ClaimTypes.Email)?.Value ?? "System";

            await context.SaveChangesAsync();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting item category {CategoryId} for brand {BrandId}", categoryId, brandId);
            return StatusCode(500, new { message = "An error occurred while deleting the item category" });
        }
    }
}
