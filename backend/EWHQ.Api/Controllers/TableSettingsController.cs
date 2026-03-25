using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EWHQ.Api.Authorization;
using EWHQ.Api.Data;
using EWHQ.Api.DTOs;
using EWHQ.Api.Models.Entities;
using EWHQ.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/table-settings")]
[Authorize]
public class TableSettingsController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ISettingsAuditService _settingsAuditService;
    private readonly ILogger<TableSettingsController> _logger;

    public TableSettingsController(
        IPOSDbContextService posContextService,
        ISettingsAuditService settingsAuditService,
        ILogger<TableSettingsController> logger)
    {
        _posContextService = posContextService;
        _settingsAuditService = settingsAuditService;
        _logger = logger;
    }

    private async Task SyncSectionShopRules(
        EWHQDbContext context, int accountId, int sectionId,
        List<SectionShopRuleDto> shopRules, string actor, DateTime now)
    {
        var existing = await context.TableSectionShopDetails
            .Where(x => x.AccountId == accountId && x.SectionId == sectionId)
            .ToListAsync(HttpContext.RequestAborted);

        var existingMap = existing.ToDictionary(x => x.ShopId);

        foreach (var rule in shopRules)
        {
            if (existingMap.TryGetValue(rule.ShopId, out var link))
            {
                // Update existing
                link.Enabled = rule.Linked;
                link.TableMapBackgroundImagePath = rule.TableMapBackgroundImagePath;
                link.TableMapBackgroundImageWidth = rule.TableMapBackgroundImageWidth;
                link.TableMapBackgroundImageHeight = rule.TableMapBackgroundImageHeight;
                link.ModifiedBy = actor;
                link.ModifiedDate = now;
            }
            else if (rule.Linked)
            {
                // Create new link
                context.TableSectionShopDetails.Add(new TableSectionShopDetail
                {
                    AccountId = accountId,
                    SectionId = sectionId,
                    ShopId = rule.ShopId,
                    Enabled = true,
                    TableMapBackgroundImagePath = rule.TableMapBackgroundImagePath,
                    TableMapBackgroundImageWidth = rule.TableMapBackgroundImageWidth,
                    TableMapBackgroundImageHeight = rule.TableMapBackgroundImageHeight,
                    CreatedBy = actor,
                    CreatedDate = now,
                    ModifiedBy = actor,
                    ModifiedDate = now,
                });
            }
        }
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

    private async Task<(EWHQDbContext context, int accountId)> GetContextAndAccountAsync(int brandId)
    {
        return await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
    }

    private async Task<(EWHQDbContext context, int accountId)> GetContextAndValidateShopAsync(int brandId, int shopId)
    {
        var (context, accountId) = await GetContextAndAccountAsync(brandId);

        var shopExists = await context.Shops
            .AsNoTracking()
            .AnyAsync(
                s => s.AccountId == accountId && s.ShopId == shopId,
                HttpContext.RequestAborted);

        if (!shopExists)
        {
            throw new KeyNotFoundException("Shop not found.");
        }

        return (context, accountId);
    }

    private async Task<int> GetNextSectionIdAsync(EWHQDbContext context, int accountId)
    {
        return (await context.TableSections
            .Where(x => x.AccountId == accountId)
            .Select(x => (int?)x.SectionId)
            .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;
    }

    private async Task<int> GetNextTableIdAsync(EWHQDbContext context, int accountId, int shopId)
    {
        return (await context.TableMasters
            .Where(x => x.AccountId == accountId && x.ShopId == shopId)
            .Select(x => (int?)x.TableId)
            .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;
    }

    private async Task<TableMasterDto?> BuildTableDtoAsync(EWHQDbContext context, int accountId, int shopId, int tableId)
    {
        return await (
            from table in context.TableMasters.AsNoTracking()
            join section in context.TableSections.AsNoTracking()
                on new { table.AccountId, table.SectionId } equals new { section.AccountId, section.SectionId }
                into sectionJoin
            from section in sectionJoin.DefaultIfEmpty()
            join tableType in context.TableTypes.AsNoTracking()
                on new { table.AccountId, table.TableTypeId } equals new { tableType.AccountId, tableType.TableTypeId }
                into tableTypeJoin
            from tableType in tableTypeJoin.DefaultIfEmpty()
            join printer in context.ShopPrinterMasters.AsNoTracking()
                on new
                {
                    table.AccountId,
                    table.ShopId,
                    ShopPrinterMasterId = table.ShopPrinterMasterId ?? 0
                }
                equals new
                {
                    printer.AccountId,
                    printer.ShopId,
                    printer.ShopPrinterMasterId
                }
                into printerJoin
            from printer in printerJoin.DefaultIfEmpty()
            where table.AccountId == accountId
                  && table.ShopId == shopId
                  && table.TableId == tableId
                  && table.Enabled
            select new TableMasterDto
            {
                TableId = table.TableId,
                ShopId = table.ShopId,
                TableCode = table.TableCode ?? string.Empty,
                SectionId = table.SectionId,
                SectionName = section != null ? (section.SectionName ?? string.Empty) : string.Empty,
                TableTypeId = table.TableTypeId,
                TableTypeName = tableType != null ? (tableType.TypeName ?? string.Empty) : string.Empty,
                DisplayIndex = table.DisplayIndex,
                IsTakeAway = table.IsTakeAway,
                SeatNum = table.SeatNum,
                ShopPrinterMasterId = table.ShopPrinterMasterId,
                ShopPrinterName = printer != null ? (printer.PrinterName ?? string.Empty) : string.Empty,
                PositionX = table.PositionX,
                PositionY = table.PositionY,
                IsAppearOnFloorPlan = table.IsAppearOnFloorPlan ?? false,
                ShapeType = table.ShapeType ?? string.Empty,
                IconWidth = table.IconWidth,
                IconHeight = table.IconHeight,
                Rotation = table.Rotation,
                Enabled = table.Enabled
            })
            .FirstOrDefaultAsync(HttpContext.RequestAborted);
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/metadata")]
    [RequireBrandView]
    public async Task<ActionResult<TableSettingsMetadataDto>> GetMetadata(int brandId, int shopId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var tableTypes = await context.TableTypes
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.TypeName)
                .Select(x => new TableTypeOptionDto
                {
                    TableTypeId = x.TableTypeId,
                    TypeName = x.TypeName ?? string.Empty
                })
                .ToListAsync(HttpContext.RequestAborted);

            var tableStatuses = await context.TableStatuses
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.TableStatusId)
                .Select(x => new TableStatusOptionDto
                {
                    TableStatusId = x.TableStatusId,
                    StatusName = x.StatusName ?? string.Empty
                })
                .ToListAsync(HttpContext.RequestAborted);

            var printers = await context.ShopPrinterMasters
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId && x.Enabled)
                .OrderBy(x => x.PrinterName)
                .ThenBy(x => x.ShopPrinterMasterId)
                .Select(x => new TablePrinterOptionDto
                {
                    ShopPrinterMasterId = x.ShopPrinterMasterId,
                    PrinterName = x.PrinterName ?? string.Empty
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(new TableSettingsMetadataDto
            {
                TableTypes = tableTypes,
                TableStatuses = tableStatuses,
                Printers = printers
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading table settings metadata for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading table settings metadata." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/sections")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<TableSectionDto>>> GetSections(int brandId, int shopId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var sectionIds = await context.TableSectionShopDetails
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId && x.Enabled)
                .OrderBy(x => x.SectionId)
                .Select(x => x.SectionId)
                .ToListAsync(HttpContext.RequestAborted);

            var sections = await context.TableSections
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && sectionIds.Contains(x.SectionId))
                .OrderBy(x => x.SectionName)
                .Select(x => new TableSectionDto
                {
                    SectionId = x.SectionId,
                    SectionName = x.SectionName ?? string.Empty,
                    Description = x.Desc ?? string.Empty,
                    Enabled = x.Enabled,
                    TableCount = 0
                })
                .ToListAsync(HttpContext.RequestAborted);

            var tableCounts = await context.TableMasters
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId && x.Enabled && x.ParentTableId == null)
                .GroupBy(x => x.SectionId)
                .Select(g => new { SectionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SectionId, x => x.Count, HttpContext.RequestAborted);

            foreach (var section in sections)
            {
                section.TableCount = tableCounts.TryGetValue(section.SectionId, out var count) ? count : 0;
            }

            return Ok(sections);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading table sections for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading table sections." });
        }
    }

    [HttpGet("brand/{brandId:int}/sections/library")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<TableSectionLibraryDto>>> GetSectionLibrary(int brandId)
    {
        try
        {
            var (context, accountId) = await GetContextAndAccountAsync(brandId);

            var shopCounts = await context.TableSectionShopDetails
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .GroupBy(x => x.SectionId)
                .Select(g => new { SectionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SectionId, x => x.Count, HttpContext.RequestAborted);

            var sections = await context.TableSections
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.SectionName)
                .Select(x => new TableSectionLibraryDto
                {
                    SectionId = x.SectionId,
                    SectionName = x.SectionName ?? string.Empty,
                    Description = x.Desc ?? string.Empty,
                    Enabled = x.Enabled,
                    ShopCount = 0
                })
                .ToListAsync(HttpContext.RequestAborted);

            foreach (var section in sections)
            {
                section.ShopCount = shopCounts.TryGetValue(section.SectionId, out var count) ? count : 0;
            }

            return Ok(sections);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading section library for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while loading the table section library." });
        }
    }

    [HttpPost("brand/{brandId:int}/sections")]
    [RequireBrandAdmin]
    public async Task<ActionResult<TableSectionLibraryDto>> CreateSectionLibraryEntry(int brandId, UpsertTableSectionRequestDto payload)
    {
        try
        {
            var sectionName = Clip(payload.SectionName, 50);
            if (string.IsNullOrWhiteSpace(sectionName))
            {
                return BadRequest(new { message = "Section name is required." });
            }

            var description = Clip(payload.Description, 200);
            var normalizedName = sectionName.ToUpperInvariant();
            var (context, accountId) = await GetContextAndAccountAsync(brandId);

            var duplicateExists = await context.TableSections
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.Enabled
                         && (x.SectionName ?? string.Empty).ToUpper() == normalizedName,
                    HttpContext.RequestAborted);

            if (duplicateExists)
            {
                return Conflict(new { message = "A section with the same name already exists." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var sectionId = await GetNextSectionIdAsync(context, accountId);

            var sectionEntity = new TableSection
            {
                AccountId = accountId,
                SectionId = sectionId,
                SectionName = sectionName,
                Desc = description,
                SectionNameAlt = string.Empty,
                DescAlt = string.Empty,
                TableMapBackgroundImagePath = string.Empty,
                Enabled = true,
                CreatedBy = currentUser,
                CreatedDate = now,
                ModifiedBy = currentUser,
                ModifiedDate = now
            };

            context.TableSections.Add(sectionEntity);

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "TABLE_SETTINGS",
                    ActionType = "CREATE_SECTION_LIBRARY",
                    ActionRefId = sectionEntity.SectionId.ToString(),
                    ActionRefDescription = sectionEntity.SectionName ?? string.Empty,
                    Details = "Created section master record.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            // Sync shop rules if provided
            if (payload.ShopRules is { Count: > 0 })
            {
                await SyncSectionShopRules(context, accountId, sectionEntity.SectionId, payload.ShopRules, currentUser, now);
                await context.SaveChangesAsync(HttpContext.RequestAborted);
            }

            var shopCount = await context.TableSectionShopDetails
                .CountAsync(x => x.AccountId == accountId && x.SectionId == sectionEntity.SectionId && x.Enabled, HttpContext.RequestAborted);

            return Ok(new TableSectionLibraryDto
            {
                SectionId = sectionEntity.SectionId,
                SectionName = sectionEntity.SectionName ?? string.Empty,
                Description = sectionEntity.Desc ?? string.Empty,
                Enabled = sectionEntity.Enabled,
                ShopCount = shopCount
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating section library entry for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the table section." });
        }
    }

    [HttpPut("brand/{brandId:int}/sections/{sectionId:int}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<TableSectionLibraryDto>> UpdateSectionLibraryEntry(int brandId, int sectionId, UpsertTableSectionRequestDto payload)
    {
        try
        {
            var sectionName = Clip(payload.SectionName, 50);
            if (string.IsNullOrWhiteSpace(sectionName))
            {
                return BadRequest(new { message = "Section name is required." });
            }

            var description = Clip(payload.Description, 200);
            var normalizedName = sectionName.ToUpperInvariant();
            var (context, accountId) = await GetContextAndAccountAsync(brandId);

            var section = await context.TableSections
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (section == null)
            {
                return NotFound(new { message = "Section not found." });
            }

            var duplicateExists = await context.TableSections
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.Enabled
                         && x.SectionId != sectionId
                         && (x.SectionName ?? string.Empty).ToUpper() == normalizedName,
                    HttpContext.RequestAborted);

            if (duplicateExists)
            {
                return Conflict(new { message = "A section with the same name already exists." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            section.SectionName = sectionName;
            section.Desc = description;
            section.ModifiedBy = currentUser;
            section.ModifiedDate = now;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "TABLE_SETTINGS",
                    ActionType = "UPDATE_SECTION_LIBRARY",
                    ActionRefId = section.SectionId.ToString(),
                    ActionRefDescription = section.SectionName ?? string.Empty,
                    Details = "Updated section master record.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            // Sync shop rules if provided
            if (payload.ShopRules != null)
            {
                await SyncSectionShopRules(context, accountId, sectionId, payload.ShopRules, currentUser, now);
                await context.SaveChangesAsync(HttpContext.RequestAborted);
            }

            var shopCount = await context.TableSectionShopDetails
                .AsNoTracking()
                .CountAsync(
                    x => x.AccountId == accountId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            return Ok(new TableSectionLibraryDto
            {
                SectionId = section.SectionId,
                SectionName = section.SectionName ?? string.Empty,
                Description = section.Desc ?? string.Empty,
                Enabled = section.Enabled,
                ShopCount = shopCount
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating section library entry {SectionId} for brand {BrandId}", sectionId, brandId);
            return StatusCode(500, new { message = "An error occurred while updating the table section." });
        }
    }

    [HttpDelete("brand/{brandId:int}/sections/{sectionId:int}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> DeleteSectionLibraryEntry(int brandId, int sectionId)
    {
        try
        {
            var (context, accountId) = await GetContextAndAccountAsync(brandId);

            var section = await context.TableSections
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (section == null)
            {
                return NotFound(new { message = "Section not found." });
            }

            var hasEnabledMappings = await context.TableSectionShopDetails
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (hasEnabledMappings)
            {
                return Conflict(new { message = "Section cannot be removed while it is still linked to shops." });
            }

            var hasTables = await context.TableMasters
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (hasTables)
            {
                return Conflict(new { message = "Section cannot be removed while tables still reference it." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            section.Enabled = false;
            section.ModifiedBy = currentUser;
            section.ModifiedDate = now;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = 0,
                    Category = "TABLE_SETTINGS",
                    ActionType = "DELETE_SECTION_LIBRARY",
                    ActionRefId = section.SectionId.ToString(),
                    ActionRefDescription = section.SectionName ?? string.Empty,
                    Details = "Disabled section master record.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

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
            _logger.LogError(ex, "Error deleting section library entry {SectionId} for brand {BrandId}", sectionId, brandId);
            return StatusCode(500, new { message = "An error occurred while deleting the table section." });
        }
    }

    [HttpGet("brand/{brandId:int}/sections/{sectionId:int}/shop-rules")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<SectionShopRuleDto>>> GetSectionShopRules(int brandId, int sectionId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var allShops = await context.Shops
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .Select(x => new { x.ShopId, x.Name })
                .OrderBy(x => x.Name)
                .ToListAsync(HttpContext.RequestAborted);

            var linkedShops = await context.TableSectionShopDetails
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.SectionId == sectionId && x.Enabled)
                .ToDictionaryAsync(x => x.ShopId, HttpContext.RequestAborted);

            var result = allShops.Select(shop =>
            {
                linkedShops.TryGetValue(shop.ShopId, out var link);
                return new SectionShopRuleDto
                {
                    ShopId = shop.ShopId,
                    ShopName = shop.Name ?? $"Shop {shop.ShopId}",
                    Linked = link != null,
                    TableMapBackgroundImagePath = link?.TableMapBackgroundImagePath ?? string.Empty,
                    TableMapBackgroundImageWidth = link?.TableMapBackgroundImageWidth,
                    TableMapBackgroundImageHeight = link?.TableMapBackgroundImageHeight,
                };
            }).ToList();

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching shop rules for section {SectionId} brand {BrandId}", sectionId, brandId);
            return StatusCode(500, new { message = "An error occurred." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/section-links")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<TableSectionShopLinkDto>>> GetShopSectionLinks(int brandId, int shopId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var links = await context.TableSectionShopDetails
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId && x.Enabled)
                .OrderBy(x => x.SectionId)
                .ToListAsync(HttpContext.RequestAborted);

            var sectionIds = links.Select(x => x.SectionId).ToList();
            var sections = await context.TableSections
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && sectionIds.Contains(x.SectionId))
                .ToDictionaryAsync(x => x.SectionId, HttpContext.RequestAborted);

            var tableCounts = await context.TableMasters
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId && x.Enabled && x.ParentTableId == null)
                .GroupBy(x => x.SectionId)
                .Select(g => new { SectionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SectionId, x => x.Count, HttpContext.RequestAborted);

            var response = links
                .Where(link => sections.ContainsKey(link.SectionId))
                .Select(link =>
                {
                    var section = sections[link.SectionId];
                    return new TableSectionShopLinkDto
                    {
                        SectionId = link.SectionId,
                        ShopId = link.ShopId,
                        SectionName = section.SectionName ?? string.Empty,
                        Description = section.Desc ?? string.Empty,
                        Enabled = link.Enabled,
                        TableCount = tableCounts.TryGetValue(link.SectionId, out var count) ? count : 0,
                        TableMapBackgroundImagePath = link.TableMapBackgroundImagePath ?? string.Empty,
                        TableMapBackgroundImageWidth = link.TableMapBackgroundImageWidth,
                        TableMapBackgroundImageHeight = link.TableMapBackgroundImageHeight
                    };
                })
                .OrderBy(x => x.SectionName)
                .ToList();

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading section links for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading table section shop relationships." });
        }
    }

    [HttpPost("brand/{brandId:int}/shops/{shopId:int}/section-links")]
    [RequireBrandAdmin]
    public async Task<ActionResult<TableSectionShopLinkDto>> CreateShopSectionLink(int brandId, int shopId, LinkTableSectionToShopRequestDto payload)
    {
        try
        {
            if (payload.SectionId <= 0)
            {
                return BadRequest(new { message = "A valid section is required." });
            }

            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var section = await context.TableSections
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.SectionId == payload.SectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (section == null)
            {
                return NotFound(new { message = "Section not found." });
            }

            var existing = await context.TableSectionShopDetails
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId && x.SectionId == payload.SectionId,
                    HttpContext.RequestAborted);

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            if (existing == null)
            {
                existing = new TableSectionShopDetail
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    SectionId = payload.SectionId,
                    TableMapBackgroundImagePath = Clip(payload.TableMapBackgroundImagePath, 200),
                    Enabled = true,
                    CreatedBy = currentUser,
                    CreatedDate = now,
                    ModifiedBy = currentUser,
                    ModifiedDate = now,
                    TableMapBackgroundImageWidth = payload.TableMapBackgroundImageWidth,
                    TableMapBackgroundImageHeight = payload.TableMapBackgroundImageHeight
                };

                context.TableSectionShopDetails.Add(existing);
            }
            else
            {
                existing.Enabled = true;
                existing.TableMapBackgroundImagePath = Clip(payload.TableMapBackgroundImagePath, 200);
                existing.TableMapBackgroundImageWidth = payload.TableMapBackgroundImageWidth;
                existing.TableMapBackgroundImageHeight = payload.TableMapBackgroundImageHeight;
                existing.ModifiedBy = currentUser;
                existing.ModifiedDate = now;
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "TABLE_SETTINGS",
                    ActionType = "CREATE_SECTION_LINK",
                    ActionRefId = payload.SectionId.ToString(),
                    ActionRefDescription = section.SectionName ?? string.Empty,
                    Details = "Linked table section to shop.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new TableSectionShopLinkDto
            {
                SectionId = existing.SectionId,
                ShopId = existing.ShopId,
                SectionName = section.SectionName ?? string.Empty,
                Description = section.Desc ?? string.Empty,
                Enabled = existing.Enabled,
                TableCount = 0,
                TableMapBackgroundImagePath = existing.TableMapBackgroundImagePath ?? string.Empty,
                TableMapBackgroundImageWidth = existing.TableMapBackgroundImageWidth,
                TableMapBackgroundImageHeight = existing.TableMapBackgroundImageHeight
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error linking section to shop for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while linking the table section to the shop." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/section-links/{sectionId:int}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<TableSectionShopLinkDto>> UpdateShopSectionLink(
        int brandId,
        int shopId,
        int sectionId,
        UpdateTableSectionShopLinkRequestDto payload)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var section = await context.TableSections
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (section == null)
            {
                return NotFound(new { message = "Section not found." });
            }

            var link = await context.TableSectionShopDetails
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (link == null)
            {
                return NotFound(new { message = "Section relationship not found for this shop." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            link.TableMapBackgroundImagePath = Clip(payload.TableMapBackgroundImagePath, 200);
            link.TableMapBackgroundImageWidth = payload.TableMapBackgroundImageWidth;
            link.TableMapBackgroundImageHeight = payload.TableMapBackgroundImageHeight;
            link.ModifiedBy = currentUser;
            link.ModifiedDate = now;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "TABLE_SETTINGS",
                    ActionType = "UPDATE_SECTION_LINK",
                    ActionRefId = sectionId.ToString(),
                    ActionRefDescription = section.SectionName ?? string.Empty,
                    Details = "Updated table section to shop relationship.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var tableCount = await context.TableMasters
                .AsNoTracking()
                .CountAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.SectionId == sectionId
                         && x.Enabled
                         && x.ParentTableId == null,
                    HttpContext.RequestAborted);

            return Ok(new TableSectionShopLinkDto
            {
                SectionId = link.SectionId,
                ShopId = link.ShopId,
                SectionName = section.SectionName ?? string.Empty,
                Description = section.Desc ?? string.Empty,
                Enabled = link.Enabled,
                TableCount = tableCount,
                TableMapBackgroundImagePath = link.TableMapBackgroundImagePath ?? string.Empty,
                TableMapBackgroundImageWidth = link.TableMapBackgroundImageWidth,
                TableMapBackgroundImageHeight = link.TableMapBackgroundImageHeight
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating section link for brand {BrandId}, shop {ShopId}, section {SectionId}", brandId, shopId, sectionId);
            return StatusCode(500, new { message = "An error occurred while updating the table section shop relationship." });
        }
    }

    [HttpDelete("brand/{brandId:int}/shops/{shopId:int}/section-links/{sectionId:int}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> DeleteShopSectionLink(int brandId, int shopId, int sectionId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var link = await context.TableSectionShopDetails
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (link == null)
            {
                return NotFound(new { message = "Section relationship not found for this shop." });
            }

            var hasTables = await context.TableMasters
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (hasTables)
            {
                return Conflict(new { message = "Section relationship cannot be removed while tables still use this section in the shop." });
            }

            var currentUser = GetCurrentUserIdentifier();
            var now = DateTime.UtcNow;
            link.Enabled = false;
            link.ModifiedBy = currentUser;
            link.ModifiedDate = now;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "TABLE_SETTINGS",
                    ActionType = "DELETE_SECTION_LINK",
                    ActionRefId = sectionId.ToString(),
                    ActionRefDescription = $"Section {sectionId}",
                    Details = "Disabled table section to shop relationship.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting section link for brand {BrandId}, shop {ShopId}, section {SectionId}", brandId, shopId, sectionId);
            return StatusCode(500, new { message = "An error occurred while deleting the table section shop relationship." });
        }
    }

    [HttpPost("brand/{brandId:int}/shops/{shopId:int}/sections")]
    [RequireBrandAdmin]
    public async Task<ActionResult<TableSectionDto>> CreateSection(int brandId, int shopId, UpsertTableSectionRequestDto payload)
    {
        try
        {
            var sectionName = Clip(payload.SectionName, 50);
            if (string.IsNullOrWhiteSpace(sectionName))
            {
                return BadRequest(new { message = "Section name is required." });
            }

            var description = Clip(payload.Description, 200);
            var normalizedName = sectionName.ToUpperInvariant();

            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var duplicateExists = await (
                from sectionMap in context.TableSectionShopDetails
                join sectionRow in context.TableSections
                    on new { sectionMap.AccountId, sectionMap.SectionId } equals new { sectionRow.AccountId, sectionRow.SectionId }
                where sectionMap.AccountId == accountId
                      && sectionMap.ShopId == shopId
                      && sectionMap.Enabled
                      && sectionRow.Enabled
                      && (sectionRow.SectionName ?? string.Empty).ToUpper() == normalizedName
                select sectionRow.SectionId)
                .AnyAsync(HttpContext.RequestAborted);

            if (duplicateExists)
            {
                return Conflict(new { message = "A section with the same name already exists in this shop." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var sectionId = await GetNextSectionIdAsync(context, accountId);

            var sectionEntity = new TableSection
            {
                AccountId = accountId,
                SectionId = sectionId,
                SectionName = sectionName,
                Desc = description,
                SectionNameAlt = string.Empty,
                DescAlt = string.Empty,
                TableMapBackgroundImagePath = string.Empty,
                Enabled = true,
                CreatedBy = currentUser,
                CreatedDate = now,
                ModifiedBy = currentUser,
                ModifiedDate = now
            };

            var shopSectionEntity = new TableSectionShopDetail
            {
                AccountId = accountId,
                ShopId = shopId,
                SectionId = sectionId,
                TableMapBackgroundImagePath = string.Empty,
                Enabled = true,
                CreatedBy = currentUser,
                CreatedDate = now,
                ModifiedBy = currentUser,
                ModifiedDate = now,
                TableMapBackgroundImageWidth = null,
                TableMapBackgroundImageHeight = null
            };

            context.TableSections.Add(sectionEntity);
            context.TableSectionShopDetails.Add(shopSectionEntity);

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "TABLE_SETTINGS",
                    ActionType = "CREATE_SECTION",
                    ActionRefId = sectionEntity.SectionId.ToString(),
                    ActionRefDescription = sectionEntity.SectionName ?? string.Empty,
                    Details = "Created table section.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new TableSectionDto
            {
                SectionId = sectionEntity.SectionId,
                SectionName = sectionEntity.SectionName ?? string.Empty,
                Description = sectionEntity.Desc ?? string.Empty,
                Enabled = sectionEntity.Enabled,
                TableCount = 0
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating table section for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while creating table section." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/sections/{sectionId:int}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<TableSectionDto>> UpdateSection(
        int brandId,
        int shopId,
        int sectionId,
        UpsertTableSectionRequestDto payload)
    {
        try
        {
            var sectionName = Clip(payload.SectionName, 50);
            if (string.IsNullOrWhiteSpace(sectionName))
            {
                return BadRequest(new { message = "Section name is required." });
            }

            var description = Clip(payload.Description, 200);
            var normalizedName = sectionName.ToUpperInvariant();

            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var sectionMapping = await context.TableSectionShopDetails
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.SectionId == sectionId
                         && x.Enabled,
                    HttpContext.RequestAborted);

            if (sectionMapping == null)
            {
                return NotFound(new { message = "Section not found in this shop." });
            }

            var section = await context.TableSections
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.SectionId == sectionId && x.Enabled,
                    HttpContext.RequestAborted);

            if (section == null)
            {
                return NotFound(new { message = "Section not found." });
            }

            var duplicateExists = await (
                from shopSection in context.TableSectionShopDetails
                join tableSection in context.TableSections
                    on new { shopSection.AccountId, shopSection.SectionId } equals new { tableSection.AccountId, tableSection.SectionId }
                where shopSection.AccountId == accountId
                      && shopSection.ShopId == shopId
                      && shopSection.Enabled
                      && tableSection.Enabled
                      && tableSection.SectionId != sectionId
                      && (tableSection.SectionName ?? string.Empty).ToUpper() == normalizedName
                select tableSection.SectionId)
                .AnyAsync(HttpContext.RequestAborted);

            if (duplicateExists)
            {
                return Conflict(new { message = "A section with the same name already exists in this shop." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            section.SectionName = sectionName;
            section.Desc = description;
            section.ModifiedBy = currentUser;
            section.ModifiedDate = now;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "TABLE_SETTINGS",
                    ActionType = "UPDATE_SECTION",
                    ActionRefId = sectionId.ToString(),
                    ActionRefDescription = sectionName,
                    Details = "Updated table section.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var tableCount = await context.TableMasters
                .AsNoTracking()
                .CountAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.SectionId == sectionId
                         && x.Enabled
                         && x.ParentTableId == null,
                    HttpContext.RequestAborted);

            return Ok(new TableSectionDto
            {
                SectionId = section.SectionId,
                SectionName = section.SectionName ?? string.Empty,
                Description = section.Desc ?? string.Empty,
                Enabled = section.Enabled,
                TableCount = tableCount
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating table section {SectionId} for brand {BrandId}, shop {ShopId}", sectionId, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while updating table section." });
        }
    }

    [HttpDelete("brand/{brandId:int}/shops/{shopId:int}/sections/{sectionId:int}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> DeleteSection(int brandId, int shopId, int sectionId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var sectionMapping = await context.TableSectionShopDetails
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.SectionId == sectionId
                         && x.Enabled,
                    HttpContext.RequestAborted);

            if (sectionMapping == null)
            {
                return NotFound(new { message = "Section not found in this shop." });
            }

            var hasTables = await context.TableMasters
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.SectionId == sectionId
                         && x.Enabled,
                    HttpContext.RequestAborted);

            if (hasTables)
            {
                return Conflict(new { message = "Section cannot be removed while tables still exist in this section." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            sectionMapping.Enabled = false;
            sectionMapping.ModifiedBy = currentUser;
            sectionMapping.ModifiedDate = now;

            var hasOtherEnabledMappings = await context.TableSectionShopDetails
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.SectionId == sectionId
                         && x.Enabled
                         && x.ShopId != shopId,
                    HttpContext.RequestAborted);

            if (!hasOtherEnabledMappings)
            {
                var section = await context.TableSections
                    .FirstOrDefaultAsync(
                        x => x.AccountId == accountId && x.SectionId == sectionId && x.Enabled,
                        HttpContext.RequestAborted);

                if (section != null)
                {
                    section.Enabled = false;
                    section.ModifiedBy = currentUser;
                    section.ModifiedDate = now;
                }
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "TABLE_SETTINGS",
                    ActionType = "DELETE_SECTION",
                    ActionRefId = sectionId.ToString(),
                    ActionRefDescription = $"Section {sectionId}",
                    Details = "Disabled section mapping for shop.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting table section {SectionId} for brand {BrandId}, shop {ShopId}", sectionId, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while deleting table section." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/tables")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<TableMasterDto>>> GetTables(int brandId, int shopId, [FromQuery] int? sectionId = null)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var query = (
                from table in context.TableMasters.AsNoTracking()
                join section in context.TableSections.AsNoTracking()
                    on new { table.AccountId, table.SectionId } equals new { section.AccountId, section.SectionId }
                    into sectionJoin
                from section in sectionJoin.DefaultIfEmpty()
                join tableType in context.TableTypes.AsNoTracking()
                    on new { table.AccountId, table.TableTypeId } equals new { tableType.AccountId, tableType.TableTypeId }
                    into tableTypeJoin
                from tableType in tableTypeJoin.DefaultIfEmpty()
                join printer in context.ShopPrinterMasters.AsNoTracking()
                    on new
                    {
                        table.AccountId,
                        table.ShopId,
                        ShopPrinterMasterId = table.ShopPrinterMasterId ?? 0
                    }
                    equals new
                    {
                        printer.AccountId,
                        printer.ShopId,
                        printer.ShopPrinterMasterId
                    }
                    into printerJoin
                from printer in printerJoin.DefaultIfEmpty()
                where table.AccountId == accountId
                      && table.ShopId == shopId
                      && table.Enabled
                      && table.ParentTableId == null
                select new TableMasterDto
                {
                    TableId = table.TableId,
                    ShopId = table.ShopId,
                    TableCode = table.TableCode ?? string.Empty,
                    SectionId = table.SectionId,
                    SectionName = section != null ? (section.SectionName ?? string.Empty) : string.Empty,
                    TableTypeId = table.TableTypeId,
                    TableTypeName = tableType != null ? (tableType.TypeName ?? string.Empty) : string.Empty,
                    DisplayIndex = table.DisplayIndex,
                    IsTakeAway = table.IsTakeAway,
                    SeatNum = table.SeatNum,
                    ShopPrinterMasterId = table.ShopPrinterMasterId,
                    ShopPrinterName = printer != null ? (printer.PrinterName ?? string.Empty) : string.Empty,
                    PositionX = table.PositionX,
                    PositionY = table.PositionY,
                    IsAppearOnFloorPlan = table.IsAppearOnFloorPlan ?? false,
                    ShapeType = table.ShapeType ?? string.Empty,
                    IconWidth = table.IconWidth,
                    IconHeight = table.IconHeight,
                    Rotation = table.Rotation,
                    Enabled = table.Enabled
                });

            if (sectionId.HasValue && sectionId.Value > 0)
            {
                query = query.Where(x => x.SectionId == sectionId.Value);
            }

            var tables = await query
                .OrderBy(x => x.DisplayIndex == null ? 1 : 0)
                .ThenBy(x => x.DisplayIndex)
                .ThenBy(x => x.TableCode)
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(tables);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading tables for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading tables." });
        }
    }

    [HttpPost("brand/{brandId:int}/shops/{shopId:int}/tables")]
    [RequireBrandAdmin]
    public async Task<ActionResult<TableMasterDto>> CreateTable(int brandId, int shopId, UpsertTableMasterRequestDto payload)
    {
        try
        {
            var tableCode = Clip(payload.TableCode, 10).ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(tableCode))
            {
                return BadRequest(new { message = "Table code is required." });
            }

            if (payload.SeatNum.HasValue && payload.SeatNum.Value < 0)
            {
                return BadRequest(new { message = "Seat number cannot be negative." });
            }

            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var sectionAvailable = await context.TableSectionShopDetails
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.SectionId == payload.SectionId
                         && x.Enabled,
                    HttpContext.RequestAborted);

            if (!sectionAvailable)
            {
                return BadRequest(new { message = "A valid section is required for this shop." });
            }

            var tableTypeExists = await context.TableTypes
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.TableTypeId == payload.TableTypeId
                         && x.Enabled,
                    HttpContext.RequestAborted);

            if (!tableTypeExists)
            {
                return BadRequest(new { message = "A valid table type is required." });
            }

            if (payload.ShopPrinterMasterId.HasValue && payload.ShopPrinterMasterId.Value > 0)
            {
                var printerExists = await context.ShopPrinterMasters
                    .AsNoTracking()
                    .AnyAsync(
                        x => x.AccountId == accountId
                             && x.ShopId == shopId
                             && x.ShopPrinterMasterId == payload.ShopPrinterMasterId.Value
                             && x.Enabled,
                        HttpContext.RequestAborted);

                if (!printerExists)
                {
                    return BadRequest(new { message = "Selected printer does not exist for this shop." });
                }
            }

            var duplicateCode = await context.TableMasters
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.Enabled
                         && (x.TableCode ?? string.Empty).ToUpper() == tableCode,
                    HttpContext.RequestAborted);

            if (duplicateCode)
            {
                return Conflict(new { message = "A table with the same code already exists in this shop." });
            }

            var tableStatusId = await context.TableStatuses
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.TableStatusId)
                .Select(x => (int?)x.TableStatusId)
                .FirstOrDefaultAsync(HttpContext.RequestAborted);

            if (!tableStatusId.HasValue)
            {
                return BadRequest(new { message = "No enabled table status is available for this account." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var tableId = await GetNextTableIdAsync(context, accountId, shopId);

            var table = new TableMaster
            {
                TableId = tableId,
                AccountId = accountId,
                ShopId = shopId,
                TableCode = tableCode,
                SectionId = payload.SectionId,
                TableTypeId = payload.TableTypeId,
                TableStatusId = tableStatusId.Value,
                PosCode = string.Empty,
                ShowPosCode = false,
                IsTakeAway = payload.IsTakeAway,
                IsTempTable = false,
                Enabled = true,
                CreatedBy = currentUser,
                CreatedDate = now,
                ModifiedBy = currentUser,
                ModifiedDate = now,
                Description = string.Empty,
                DescriptionAlt = string.Empty,
                DisplayIndex = payload.DisplayIndex,
                ParentTableId = null,
                TableIconTypeId = null,
                PositionX = null,
                PositionY = null,
                IsAppearOnFloorPlan = payload.IsAppearOnFloorPlan,
                AutoAssignDayCount = null,
                ShopPrinterMasterId = payload.ShopPrinterMasterId.HasValue && payload.ShopPrinterMasterId.Value > 0
                    ? payload.ShopPrinterMasterId.Value
                    : null,
                ShapeType = Clip(payload.ShapeType, 50),
                IconWidth = payload.IconWidth,
                IconHeight = payload.IconHeight,
                Rotation = payload.Rotation,
                SeatNum = payload.SeatNum
            };

            table.PositionX = payload.PositionX;
            table.PositionY = payload.PositionY;

            context.TableMasters.Add(table);

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "TABLE_SETTINGS",
                    ActionType = "CREATE_TABLE",
                    ActionRefId = table.TableId.ToString(),
                    ActionRefDescription = table.TableCode ?? string.Empty,
                    Details = $"Created table; sectionId={table.SectionId}; tableTypeId={table.TableTypeId}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var response = await BuildTableDtoAsync(context, accountId, shopId, tableId);
            if (response == null)
            {
                return StatusCode(500, new { message = "Table created but response mapping failed." });
            }

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating table for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while creating table." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/tables/{tableId:int}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<TableMasterDto>> UpdateTable(
        int brandId,
        int shopId,
        int tableId,
        UpsertTableMasterRequestDto payload)
    {
        try
        {
            var tableCode = Clip(payload.TableCode, 10).ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(tableCode))
            {
                return BadRequest(new { message = "Table code is required." });
            }

            if (payload.SeatNum.HasValue && payload.SeatNum.Value < 0)
            {
                return BadRequest(new { message = "Seat number cannot be negative." });
            }

            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var table = await context.TableMasters
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.TableId == tableId
                         && x.Enabled,
                    HttpContext.RequestAborted);

            if (table == null)
            {
                return NotFound(new { message = "Table not found." });
            }

            var sectionAvailable = await context.TableSectionShopDetails
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.SectionId == payload.SectionId
                         && x.Enabled,
                    HttpContext.RequestAborted);

            if (!sectionAvailable)
            {
                return BadRequest(new { message = "A valid section is required for this shop." });
            }

            var tableTypeExists = await context.TableTypes
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.TableTypeId == payload.TableTypeId
                         && x.Enabled,
                    HttpContext.RequestAborted);

            if (!tableTypeExists)
            {
                return BadRequest(new { message = "A valid table type is required." });
            }

            if (payload.ShopPrinterMasterId.HasValue && payload.ShopPrinterMasterId.Value > 0)
            {
                var printerExists = await context.ShopPrinterMasters
                    .AsNoTracking()
                    .AnyAsync(
                        x => x.AccountId == accountId
                             && x.ShopId == shopId
                             && x.ShopPrinterMasterId == payload.ShopPrinterMasterId.Value
                             && x.Enabled,
                        HttpContext.RequestAborted);

                if (!printerExists)
                {
                    return BadRequest(new { message = "Selected printer does not exist for this shop." });
                }
            }

            var duplicateCode = await context.TableMasters
                .AsNoTracking()
                .AnyAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && x.TableId != tableId
                         && x.Enabled
                         && (x.TableCode ?? string.Empty).ToUpper() == tableCode,
                    HttpContext.RequestAborted);

            if (duplicateCode)
            {
                return Conflict(new { message = "A table with the same code already exists in this shop." });
            }

            var currentUser = GetCurrentUserIdentifier();
            var now = DateTime.UtcNow;

            table.TableCode = tableCode;
            table.SectionId = payload.SectionId;
            table.TableTypeId = payload.TableTypeId;
            table.DisplayIndex = payload.DisplayIndex;
            table.IsTakeAway = payload.IsTakeAway;
            table.SeatNum = payload.SeatNum;
            table.PositionX = payload.PositionX;
            table.PositionY = payload.PositionY;
            table.IsAppearOnFloorPlan = payload.IsAppearOnFloorPlan;
            table.ShapeType = Clip(payload.ShapeType, 50);
            table.IconWidth = payload.IconWidth;
            table.IconHeight = payload.IconHeight;
            table.Rotation = payload.Rotation;
            table.ShopPrinterMasterId = payload.ShopPrinterMasterId.HasValue && payload.ShopPrinterMasterId.Value > 0
                ? payload.ShopPrinterMasterId.Value
                : null;
            table.ModifiedBy = currentUser;
            table.ModifiedDate = now;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "TABLE_SETTINGS",
                    ActionType = "UPDATE_TABLE",
                    ActionRefId = tableId.ToString(),
                    ActionRefDescription = table.TableCode ?? string.Empty,
                    Details = $"Updated table; sectionId={table.SectionId}; tableTypeId={table.TableTypeId}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var response = await BuildTableDtoAsync(context, accountId, shopId, tableId);
            if (response == null)
            {
                return StatusCode(500, new { message = "Table updated but response mapping failed." });
            }

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating table {TableId} for brand {BrandId}, shop {ShopId}", tableId, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while updating table." });
        }
    }

    [HttpDelete("brand/{brandId:int}/shops/{shopId:int}/tables/{tableId:int}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> DeleteTable(int brandId, int shopId, int tableId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var tables = await context.TableMasters
                .Where(x => x.AccountId == accountId
                            && x.ShopId == shopId
                            && x.Enabled
                            && (x.TableId == tableId || x.ParentTableId == tableId))
                .ToListAsync(HttpContext.RequestAborted);

            if (tables.Count == 0)
            {
                return NotFound(new { message = "Table not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            foreach (var table in tables)
            {
                table.Enabled = false;
                table.ModifiedBy = currentUser;
                table.ModifiedDate = now;
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "TABLE_SETTINGS",
                    ActionType = "DELETE_TABLE",
                    ActionRefId = tableId.ToString(),
                    ActionRefDescription = $"Table {tableId}",
                    Details = $"Disabled {tables.Count} table row(s) including child mappings.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting table {TableId} for brand {BrandId}, shop {ShopId}", tableId, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while deleting table." });
        }
    }
}
