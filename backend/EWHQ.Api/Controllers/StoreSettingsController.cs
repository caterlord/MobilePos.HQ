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
[Route("api/store-settings")]
[Authorize]
public class StoreSettingsController : ControllerBase
{
    private readonly IPOSDbContextService _posContextService;
    private readonly ISettingsAuditService _settingsAuditService;
    private readonly ILogger<StoreSettingsController> _logger;

    public StoreSettingsController(
        IPOSDbContextService posContextService,
        ISettingsAuditService settingsAuditService,
        ILogger<StoreSettingsController> logger)
    {
        _posContextService = posContextService;
        _settingsAuditService = settingsAuditService;
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

    private async Task<Shop?> GetShopAsync(EWHQDbContext context, int accountId, int shopId)
    {
        return await context.Shops
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ShopId == shopId, HttpContext.RequestAborted);
    }

    private const string IanaTimeZoneParamCode = "IANA_TIMEZONE";

    private static StoreInfoSettingsDto ToStoreInfoSettingsDto(Shop shop, string ianaTimeZone = "")
    {
        return new StoreInfoSettingsDto
        {
            ShopId = shop.ShopId,
            Name = shop.Name ?? string.Empty,
            AltName = shop.AltName ?? string.Empty,
            Description = shop.Desc ?? string.Empty,
            AltDesc = shop.AltDesc ?? string.Empty,
            AddressLine1 = shop.AddressLine1 ?? string.Empty,
            AddressLine2 = shop.AddressLine2 ?? string.Empty,
            AddressLine3 = shop.AddressLine3 ?? string.Empty,
            AddressLine4 = shop.AddressLine4 ?? string.Empty,
            AltAddressLine1 = shop.AltAddressLine1 ?? string.Empty,
            AltAddressLine2 = shop.AltAddressLine2 ?? string.Empty,
            AltAddressLine3 = shop.AltAddressLine3 ?? string.Empty,
            AltAddressLine4 = shop.AltAddressLine4 ?? string.Empty,
            District = shop.District ?? string.Empty,
            City = shop.City ?? string.Empty,
            Country = shop.Country ?? string.Empty,
            Telephone = shop.Telephone ?? string.Empty,
            Fax = shop.Fax ?? string.Empty,
            IntCallingCode = shop.IntCallingCode ?? string.Empty,
            Contact1 = shop.Contact1 ?? string.Empty,
            ContactTitle1 = shop.ContactTitle1 ?? string.Empty,
            Contact2 = shop.Contact2 ?? string.Empty,
            ContactTitle2 = shop.ContactTitle2 ?? string.Empty,
            ShopCode = shop.ShopCode ?? string.Empty,
            CurrencyCode = shop.CurrencyCode ?? string.Empty,
            CurrencySymbol = shop.CurrencySymbol ?? string.Empty,
            AddressForDelivery = shop.AddressForDelivery ?? string.Empty,
            AddressLat = shop.AddressLat,
            AddressLong = shop.AddressLong,
            IanaTimeZone = ianaTimeZone,
            TimeZoneId = shop.TimeZoneId,
            TimeZoneValue = shop.TimeZoneValue,
            TimeZoneUseDaylightTime = shop.TimeZoneUseDaylightTime,
            Enabled = shop.Enabled
        };
    }

    private static StoreSettingsAuditLogDto ToStoreSettingsAuditLogDto(AuditTrailLog log)
    {
        var actionName = log.ActionName ?? string.Empty;
        var separatorIndex = actionName.IndexOf(':');
        var normalizedAction = separatorIndex >= 0 && separatorIndex < actionName.Length - 1
            ? actionName[(separatorIndex + 1)..]
            : actionName;

        return new StoreSettingsAuditLogDto
        {
            LogId = log.LogId,
            ShopId = log.ShopId,
            Category = log.SourceRefId ?? string.Empty,
            ActionName = normalizedAction,
            ActionRefId = log.ActionRefId ?? string.Empty,
            ActionRefDescription = log.ActionRefDesc ?? string.Empty,
            Details = log.SourceRefDesc ?? string.Empty,
            ActionUserName = log.ActionUserName ?? string.Empty,
            LoggedAt = log.LogDatetime
        };
    }

    [HttpGet("brand/{brandId:int}/shops")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<StoreSettingsShopDto>>> GetShops(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var shops = await context.Shops
                .AsNoTracking()
                .Where(x => x.AccountId == accountId)
                .OrderBy(x => x.Name)
                .Select(x => new StoreSettingsShopDto
                {
                    ShopId = x.ShopId,
                    ShopName = x.Name ?? string.Empty,
                    Enabled = x.Enabled
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(shops);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading settings shops for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while loading store settings shops." });
        }
    }

    [HttpGet("brand/{brandId:int}/audit-logs")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<StoreSettingsAuditLogDto>>> GetAuditLogs(
        int brandId,
        [FromQuery] int? shopId = null,
        [FromQuery] int limit = 50)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            if (shopId.HasValue)
            {
                var shop = await GetShopAsync(context, accountId, shopId.Value);
                if (shop == null)
                {
                    return NotFound(new { message = "Shop not found." });
                }
            }

            var logs = await _settingsAuditService.GetRecentMutationsAsync(
                context,
                accountId,
                shopId,
                limit,
                HttpContext.RequestAborted);

            return Ok(logs.Select(ToStoreSettingsAuditLogDto).ToList());
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading settings audit logs for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading settings audit logs." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/info")]
    [RequireBrandView]
    public async Task<ActionResult<StoreInfoSettingsDto>> GetStoreInfoSettings(int brandId, int shopId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var shop = await GetShopAsync(context, accountId, shopId);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found." });
            }

            var ianaParam = await context.ShopSystemParameters
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ShopId == shopId
                    && x.ParamCode == IanaTimeZoneParamCode && x.Enabled,
                    HttpContext.RequestAborted);

            return Ok(ToStoreInfoSettingsDto(shop, ianaParam?.ParamValue ?? string.Empty));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading store info settings for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading store info settings." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/info")]
    [RequireBrandAdmin]
    public async Task<ActionResult<StoreInfoSettingsDto>> UpdateStoreInfoSettings(
        int brandId,
        int shopId,
        UpdateStoreInfoSettingsRequestDto payload)
    {
        try
        {
            var name = Clip(payload.Name, 100);
            var currencyCode = Clip(payload.CurrencyCode, 10).ToUpperInvariant();
            var currencySymbol = Clip(payload.CurrencySymbol, 10);

            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Shop name is required." });
            }

            if (string.IsNullOrWhiteSpace(currencyCode))
            {
                return BadRequest(new { message = "Currency code is required." });
            }

            if (string.IsNullOrWhiteSpace(currencySymbol))
            {
                return BadRequest(new { message = "Currency symbol is required." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var shop = await context.Shops
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ShopId == shopId, HttpContext.RequestAborted);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            shop.Name = name;
            shop.AltName = Clip(payload.AltName, 100);
            shop.Desc = Clip(payload.Description, 500);
            shop.AltDesc = Clip(payload.AltDesc, 500);
            shop.AddressLine1 = Clip(payload.AddressLine1, 500);
            shop.AddressLine2 = Clip(payload.AddressLine2, 200);
            shop.AddressLine3 = Clip(payload.AddressLine3, 200);
            shop.AddressLine4 = Clip(payload.AddressLine4, 200);
            shop.AltAddressLine1 = Clip(payload.AltAddressLine1, 500);
            shop.AltAddressLine2 = Clip(payload.AltAddressLine2, 200);
            shop.AltAddressLine3 = Clip(payload.AltAddressLine3, 200);
            shop.AltAddressLine4 = Clip(payload.AltAddressLine4, 200);
            shop.District = Clip(payload.District, 50);
            shop.City = Clip(payload.City, 50);
            shop.Country = Clip(payload.Country, 50);
            shop.Telephone = Clip(payload.Telephone, 20);
            shop.Fax = Clip(payload.Fax, 20);
            shop.IntCallingCode = Clip(payload.IntCallingCode, 10);
            shop.Contact1 = Clip(payload.Contact1, 50);
            shop.ContactTitle1 = Clip(payload.ContactTitle1, 50);
            shop.Contact2 = Clip(payload.Contact2, 50);
            shop.ContactTitle2 = Clip(payload.ContactTitle2, 50);
            shop.ShopCode = Clip(payload.ShopCode, 50);
            shop.CurrencyCode = currencyCode;
            shop.CurrencySymbol = currencySymbol;
            shop.AddressForDelivery = Clip(payload.AddressForDelivery, 1000);
            shop.AddressLat = payload.AddressLat;
            shop.AddressLong = payload.AddressLong;
            shop.TimeZoneId = payload.TimeZoneId;
            shop.TimeZoneValue = payload.TimeZoneValue;
            shop.TimeZoneUseDaylightTime = payload.TimeZoneUseDaylightTime;
            shop.Enabled = payload.Enabled;
            shop.ModifiedDate = now;
            shop.ModifiedBy = currentUser;

            // Dual-write: save IANA timezone name to ShopSystemParameter
            var ianaValue = (payload.IanaTimeZone ?? string.Empty).Trim();
            var existingIana = await context.ShopSystemParameters
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ShopId == shopId
                    && x.ParamCode == IanaTimeZoneParamCode,
                    HttpContext.RequestAborted);

            if (!string.IsNullOrEmpty(ianaValue))
            {
                if (existingIana != null)
                {
                    existingIana.ParamValue = ianaValue;
                    existingIana.Enabled = true;
                    existingIana.ModifiedDate = now;
                    existingIana.ModifiedBy = currentUser;
                }
                else
                {
                    var nextParamId = (await context.ShopSystemParameters
                        .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                        .Select(x => (int?)x.ParamId)
                        .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

                    context.ShopSystemParameters.Add(new ShopSystemParameter
                    {
                        ParamId = nextParamId,
                        AccountId = accountId,
                        ShopId = shopId,
                        ParamCode = IanaTimeZoneParamCode,
                        Description = "IANA timezone identifier",
                        ParamValue = ianaValue,
                        Enabled = true,
                        CreatedDate = now,
                        CreatedBy = currentUser,
                        ModifiedDate = now,
                        ModifiedBy = currentUser
                    });
                }
            }
            else if (existingIana != null)
            {
                existingIana.Enabled = false;
                existingIana.ModifiedDate = now;
                existingIana.ModifiedBy = currentUser;
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "STORE_SETTINGS",
                    ActionType = "UPDATE_INFO",
                    ActionRefId = shopId.ToString(),
                    ActionRefDescription = shop.Name ?? string.Empty,
                    Details = $"Updated store info; enabled={shop.Enabled}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToStoreInfoSettingsDto(shop, ianaValue));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating store info settings for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while saving store info settings." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/snapshot")]
    [RequireBrandView]
    public async Task<ActionResult<StoreSettingsSnapshotDto>> GetStoreSettingsSnapshot(int brandId, int shopId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var shop = await GetShopAsync(context, accountId, shopId);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found." });
            }

            var workday = await context.ShopWorkdayHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .OrderBy(x => x.Day)
                .Select(x => new StoreWorkdayEntryDto
                {
                    WorkdayHeaderId = x.WorkdayHeaderId,
                    Day = x.Day ?? string.Empty,
                    OpenTime = x.OpenTime,
                    CloseTime = x.CloseTime,
                    DayDelta = x.DayDelta,
                    Enabled = x.Enabled
                })
                .ToListAsync(HttpContext.RequestAborted);

            var serviceAreas = await context.ShopServiceAreaSettings
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .OrderBy(x => x.ZoneId)
                .Select(x => new StoreServiceAreaDto
                {
                    ZoneId = x.ZoneId,
                    ZoneName = x.ZoneName ?? string.Empty,
                    ZoneTypeId = x.ZoneTypeId,
                    DeliveryShopId = x.DeliveryShopId,
                    MinAmount = x.MinAmount,
                    DeliveryFee = x.DeliveryFee,
                    Shape = x.Shape ?? string.Empty,
                    Color = x.Color ?? string.Empty,
                    ShapeType = x.ShapeType ?? string.Empty,
                    Enabled = x.Enabled
                })
                .ToListAsync(HttpContext.RequestAborted);

            var systemParameters = await context.ShopSystemParameters
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .OrderBy(x => x.ParamCode)
                .Select(x => new StoreSystemParameterDto
                {
                    ParamId = x.ParamId,
                    ParamCode = x.ParamCode ?? string.Empty,
                    Description = x.Description ?? string.Empty,
                    ParamValue = x.ParamValue ?? string.Empty,
                    Enabled = x.Enabled
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(new StoreSettingsSnapshotDto
            {
                ShopId = shopId,
                WorkdayEntries = workday,
                ServiceAreas = serviceAreas,
                SystemParameters = systemParameters
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading store settings snapshot for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading store settings." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/workday")]
    [RequireBrandAdmin]
    public async Task<ActionResult<IReadOnlyList<StoreWorkdayEntryDto>>> UpdateStoreWorkday(
        int brandId,
        int shopId,
        UpdateStoreWorkdayRequestDto payload)
    {
        try
        {
            var entries = (payload.Entries ?? Array.Empty<StoreWorkdayEntryDto>())
                .Where(x => x != null)
                .Select(x => new StoreWorkdayEntryDto
                {
                    WorkdayHeaderId = x.WorkdayHeaderId,
                    Day = Clip(x.Day, 1),
                    OpenTime = x.OpenTime,
                    CloseTime = x.CloseTime,
                    DayDelta = x.DayDelta,
                    Enabled = x.Enabled
                })
                .ToList();

            if (entries.Any(x => string.IsNullOrWhiteSpace(x.Day)))
            {
                return BadRequest(new { message = "Each workday entry must include a valid day code." });
            }

            if (entries.GroupBy(x => x.Day, StringComparer.OrdinalIgnoreCase).Any(g => g.Count() > 1))
            {
                return BadRequest(new { message = "Duplicate day codes are not allowed." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var shop = await GetShopAsync(context, accountId, shopId);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found." });
            }

            var existing = await context.ShopWorkdayHeaders
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .ToListAsync(HttpContext.RequestAborted);

            var existingByDay = existing
                .Where(x => !string.IsNullOrWhiteSpace(x.Day))
                .ToDictionary(x => x.Day, StringComparer.OrdinalIgnoreCase);
            var incomingDays = entries.Select(x => x.Day).ToHashSet(StringComparer.OrdinalIgnoreCase);

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            foreach (var entry in entries)
            {
                if (existingByDay.TryGetValue(entry.Day, out var row))
                {
                    row.OpenTime = entry.OpenTime;
                    row.CloseTime = entry.CloseTime;
                    row.DayDelta = entry.DayDelta;
                    row.Enabled = entry.Enabled;
                    row.ModifiedDate = now;
                    row.ModifiedBy = currentUser;
                    continue;
                }

                var nextWorkdayHeaderId = (await context.ShopWorkdayHeaders
                    .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                    .Select(x => (int?)x.WorkdayHeaderId)
                    .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

                context.ShopWorkdayHeaders.Add(new ShopWorkdayHeader
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    WorkdayHeaderId = nextWorkdayHeaderId,
                    Day = entry.Day,
                    OpenTime = entry.OpenTime,
                    CloseTime = entry.CloseTime,
                    DayDelta = entry.DayDelta,
                    Enabled = entry.Enabled,
                    CreatedDate = now,
                    CreatedBy = currentUser,
                    ModifiedDate = now,
                    ModifiedBy = currentUser
                });
            }

            var rowsToRemove = existing
                .Where(x => !incomingDays.Contains(x.Day))
                .ToList();

            if (rowsToRemove.Count > 0)
            {
                context.ShopWorkdayHeaders.RemoveRange(rowsToRemove);
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "STORE_SETTINGS",
                    ActionType = "UPDATE_WORKDAY",
                    ActionRefId = shopId.ToString(),
                    ActionRefDescription = shop.Name ?? string.Empty,
                    Details = $"Updated workday schedule; entries={entries.Count}; removed={rowsToRemove.Count}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var response = await context.ShopWorkdayHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .OrderBy(x => x.Day)
                .Select(x => new StoreWorkdayEntryDto
                {
                    WorkdayHeaderId = x.WorkdayHeaderId,
                    Day = x.Day ?? string.Empty,
                    OpenTime = x.OpenTime,
                    CloseTime = x.CloseTime,
                    DayDelta = x.DayDelta,
                    Enabled = x.Enabled
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating workday settings for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while saving workday settings." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/workday-periods")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<StoreWorkdayPeriodDto>>> GetWorkdayPeriods(int brandId, int shopId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var shop = await GetShopAsync(context, accountId, shopId);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found." });
            }

            var periods = await context.ShopWorkdayPeriods
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .OrderBy(x => x.WorkdayHeaderId)
                .ThenBy(x => x.FromTime)
                .Select(x => new StoreWorkdayPeriodDto
                {
                    WorkdayPeriodId = x.WorkdayPeriodId,
                    WorkdayHeaderId = x.WorkdayHeaderId,
                    PeriodName = x.PeriodName ?? string.Empty,
                    FromTime = x.FromTime,
                    ToTime = x.ToTime,
                    DayDelta = x.DayDelta,
                    Enabled = x.Enabled,
                    WorkdayPeriodMasterId = x.WorkdayPeriodMasterId
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(periods);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading workday periods for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading workday period settings." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/workday-periods")]
    [RequireBrandAdmin]
    public async Task<ActionResult<IReadOnlyList<StoreWorkdayPeriodDto>>> ReplaceWorkdayPeriods(
        int brandId,
        int shopId,
        ReplaceStoreWorkdayPeriodsRequestDto payload)
    {
        try
        {
            var periods = (payload.Periods ?? Array.Empty<StoreWorkdayPeriodDto>())
                .Where(x => x != null)
                .Select(x => new StoreWorkdayPeriodDto
                {
                    WorkdayPeriodId = x.WorkdayPeriodId,
                    WorkdayHeaderId = x.WorkdayHeaderId,
                    PeriodName = Clip(x.PeriodName, 50),
                    FromTime = x.FromTime,
                    ToTime = x.ToTime,
                    DayDelta = x.DayDelta,
                    Enabled = x.Enabled,
                    WorkdayPeriodMasterId = x.WorkdayPeriodMasterId
                })
                .ToList();

            if (periods.Any(x => string.IsNullOrWhiteSpace(x.PeriodName)))
            {
                return BadRequest(new { message = "Each workday period must include a period name." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var shop = await GetShopAsync(context, accountId, shopId);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found." });
            }

            var shopWorkdayHeaderIds = await context.ShopWorkdayHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .Select(x => x.WorkdayHeaderId)
                .ToListAsync(HttpContext.RequestAborted);

            var allowedWorkdayHeaderIds = shopWorkdayHeaderIds.ToHashSet();
            var defaultWorkdayHeaderId = shopWorkdayHeaderIds.FirstOrDefault();

            if (periods.Count > 0 && defaultWorkdayHeaderId <= 0)
            {
                return BadRequest(new { message = "No workday schedule exists for this shop. Configure workday schedule first." });
            }

            foreach (var period in periods)
            {
                var resolvedWorkdayHeaderId = period.WorkdayHeaderId > 0 ? period.WorkdayHeaderId : defaultWorkdayHeaderId;
                if (!allowedWorkdayHeaderIds.Contains(resolvedWorkdayHeaderId))
                {
                    return BadRequest(new { message = $"Invalid workday header id: {period.WorkdayHeaderId}." });
                }
                period.WorkdayHeaderId = resolvedWorkdayHeaderId;
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var existing = await context.ShopWorkdayPeriods
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .ToListAsync(HttpContext.RequestAborted);

            if (existing.Count > 0)
            {
                context.ShopWorkdayPeriods.RemoveRange(existing);
            }

            var usedPeriodIds = new HashSet<int>();
            var nextPeriodId = (existing.Select(x => (int?)x.WorkdayPeriodId).Max() ?? 0) + 1;

            foreach (var period in periods)
            {
                var workdayPeriodId = period.WorkdayPeriodId > 0 && usedPeriodIds.Add(period.WorkdayPeriodId)
                    ? period.WorkdayPeriodId
                    : nextPeriodId++;

                if (!usedPeriodIds.Contains(workdayPeriodId))
                {
                    usedPeriodIds.Add(workdayPeriodId);
                }

                context.ShopWorkdayPeriods.Add(new ShopWorkdayPeriod
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    WorkdayPeriodId = workdayPeriodId,
                    WorkdayHeaderId = period.WorkdayHeaderId,
                    PeriodName = period.PeriodName,
                    FromTime = period.FromTime,
                    ToTime = period.ToTime,
                    DayDelta = period.DayDelta,
                    Enabled = period.Enabled,
                    WorkdayPeriodMasterId = period.WorkdayPeriodMasterId,
                    CreatedDate = now,
                    CreatedBy = currentUser,
                    ModifiedDate = now,
                    ModifiedBy = currentUser
                });
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "STORE_SETTINGS",
                    ActionType = "REPLACE_WORKDAY_PERIODS",
                    ActionRefId = shopId.ToString(),
                    ActionRefDescription = shop.Name ?? string.Empty,
                    Details = $"Replaced workday periods; periods={periods.Count}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var response = await context.ShopWorkdayPeriods
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .OrderBy(x => x.WorkdayHeaderId)
                .ThenBy(x => x.FromTime)
                .Select(x => new StoreWorkdayPeriodDto
                {
                    WorkdayPeriodId = x.WorkdayPeriodId,
                    WorkdayHeaderId = x.WorkdayHeaderId,
                    PeriodName = x.PeriodName ?? string.Empty,
                    FromTime = x.FromTime,
                    ToTime = x.ToTime,
                    DayDelta = x.DayDelta,
                    Enabled = x.Enabled,
                    WorkdayPeriodMasterId = x.WorkdayPeriodMasterId
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error replacing workday periods for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while saving workday period settings." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/service-areas")]
    [RequireBrandAdmin]
    public async Task<ActionResult<IReadOnlyList<StoreServiceAreaDto>>> ReplaceServiceAreas(
        int brandId,
        int shopId,
        ReplaceStoreServiceAreasRequestDto payload)
    {
        try
        {
            var areas = (payload.Areas ?? Array.Empty<StoreServiceAreaDto>())
                .Where(x => x != null)
                .Select(x => new StoreServiceAreaDto
                {
                    ZoneId = x.ZoneId,
                    ZoneName = Clip(x.ZoneName, 100),
                    ZoneTypeId = x.ZoneTypeId,
                    DeliveryShopId = x.DeliveryShopId,
                    MinAmount = x.MinAmount,
                    DeliveryFee = x.DeliveryFee,
                    Shape = Clip(x.Shape, 2000),
                    Color = Clip(x.Color, 50),
                    ShapeType = Clip(x.ShapeType, 50),
                    Enabled = x.Enabled
                })
                .ToList();

            if (areas.Any(x => string.IsNullOrWhiteSpace(x.ZoneName)))
            {
                return BadRequest(new { message = "Each service area must include a zone name." });
            }

            if (areas.Any(x => string.IsNullOrWhiteSpace(x.Shape) || string.IsNullOrWhiteSpace(x.Color) || string.IsNullOrWhiteSpace(x.ShapeType)))
            {
                return BadRequest(new { message = "Each service area must include shape, color, and shape type." });
            }

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var shop = await GetShopAsync(context, accountId, shopId);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var existing = await context.ShopServiceAreaSettings
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .ToListAsync(HttpContext.RequestAborted);

            if (existing.Count > 0)
            {
                context.ShopServiceAreaSettings.RemoveRange(existing);
            }

            var usedZoneIds = new HashSet<int>();
            var nextZoneId = (existing.Select(x => (int?)x.ZoneId).Max() ?? 0) + 1;

            foreach (var area in areas)
            {
                var zoneId = area.ZoneId > 0 && usedZoneIds.Add(area.ZoneId)
                    ? area.ZoneId
                    : nextZoneId++;

                if (!usedZoneIds.Contains(zoneId))
                {
                    usedZoneIds.Add(zoneId);
                }

                context.ShopServiceAreaSettings.Add(new ShopServiceAreaSetting
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    ZoneId = zoneId,
                    ZoneName = area.ZoneName,
                    ZoneTypeId = area.ZoneTypeId,
                    DeliveryShopId = area.DeliveryShopId,
                    MinAmount = area.MinAmount,
                    DeliveryFee = area.DeliveryFee,
                    Shape = area.Shape,
                    Color = area.Color,
                    ShapeType = area.ShapeType,
                    Enabled = area.Enabled,
                    CreatedDate = now,
                    CreatedBy = currentUser,
                    ModifiedDate = now,
                    ModifiedBy = currentUser
                });
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "STORE_SETTINGS",
                    ActionType = "REPLACE_SERVICE_AREAS",
                    ActionRefId = shopId.ToString(),
                    ActionRefDescription = shop.Name ?? string.Empty,
                    Details = $"Replaced service areas; areas={areas.Count}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var response = await context.ShopServiceAreaSettings
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                .OrderBy(x => x.ZoneId)
                .Select(x => new StoreServiceAreaDto
                {
                    ZoneId = x.ZoneId,
                    ZoneName = x.ZoneName ?? string.Empty,
                    ZoneTypeId = x.ZoneTypeId,
                    DeliveryShopId = x.DeliveryShopId,
                    MinAmount = x.MinAmount,
                    DeliveryFee = x.DeliveryFee,
                    Shape = x.Shape ?? string.Empty,
                    Color = x.Color ?? string.Empty,
                    ShapeType = x.ShapeType ?? string.Empty,
                    Enabled = x.Enabled
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error replacing service areas for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while saving service area settings." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/system-parameters/{paramCode}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<StoreSystemParameterDto>> UpsertSystemParameter(
        int brandId,
        int shopId,
        string paramCode,
        UpsertStoreSystemParameterDto payload)
    {
        try
        {
            var normalizedCode = Clip(paramCode, 200).ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(normalizedCode))
            {
                return BadRequest(new { message = "Parameter code is required." });
            }

            var description = Clip(payload.Description, 200);
            if (string.IsNullOrWhiteSpace(description))
            {
                return BadRequest(new { message = "Parameter description is required." });
            }

            var paramValue = payload.ParamValue?.Trim() ?? string.Empty;

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var shop = await GetShopAsync(context, accountId, shopId);
            if (shop == null)
            {
                return NotFound(new { message = "Shop not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var parameter = await context.ShopSystemParameters
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId && (x.ParamCode ?? string.Empty).ToUpper() == normalizedCode,
                    HttpContext.RequestAborted);

            if (parameter == null)
            {
                var nextParamId = (await context.ShopSystemParameters
                    .Where(x => x.AccountId == accountId && x.ShopId == shopId)
                    .Select(x => (int?)x.ParamId)
                    .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

                parameter = new ShopSystemParameter
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    ParamId = nextParamId,
                    ParamCode = normalizedCode,
                    CreatedDate = now,
                    CreatedBy = currentUser
                };

                context.ShopSystemParameters.Add(parameter);
            }

            parameter.Description = description;
            parameter.ParamValue = paramValue;
            parameter.Enabled = payload.Enabled;
            parameter.ModifiedDate = now;
            parameter.ModifiedBy = currentUser;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "STORE_SETTINGS",
                    ActionType = "UPSERT_SYSTEM_PARAMETER",
                    ActionRefId = normalizedCode,
                    ActionRefDescription = description,
                    Details = $"Upserted system parameter; enabled={payload.Enabled}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new StoreSystemParameterDto
            {
                ParamId = parameter.ParamId,
                ParamCode = parameter.ParamCode ?? string.Empty,
                Description = parameter.Description ?? string.Empty,
                ParamValue = parameter.ParamValue ?? string.Empty,
                Enabled = parameter.Enabled
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting system parameter {ParamCode} for brand {BrandId}, shop {ShopId}", paramCode, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while saving system parameter settings." });
        }
    }

    // ════════════════════════════════════════════════════════════════
    //  COPY WORKDAY SCHEDULE
    // ════════════════════════════════════════════════════════════════

    [HttpPost("brand/{brandId:int}/shops/{shopId:int}/workday-copy")]
    [RequireBrandAdmin]
    public async Task<IActionResult> CopyWorkdaySchedule(int brandId, int shopId, CopyWorkdayScheduleRequestDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.SourceDay))
                return BadRequest(new { message = "Source day is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            // Load source schedule + periods
            var sourceEntry = await context.ShopWorkdayHeaders
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ShopId == shopId
                    && x.Day == payload.SourceDay && x.Enabled, HttpContext.RequestAborted);

            if (sourceEntry == null)
                return NotFound(new { message = $"No schedule found for day '{payload.SourceDay}'." });

            var sourcePeriods = await context.ShopWorkdayPeriods
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId
                    && x.WorkdayHeaderId == sourceEntry.WorkdayHeaderId && x.Enabled)
                .ToListAsync(HttpContext.RequestAborted);

            // Determine target shops (current shop + any additional)
            var targetShopIds = new HashSet<int> { shopId };
            if (payload.TargetShopIds?.Count > 0)
            {
                foreach (var sid in payload.TargetShopIds)
                    targetShopIds.Add(sid);
            }

            // Determine target days
            var targetDays = payload.TargetDays?.Count > 0
                ? payload.TargetDays.ToList()
                : new List<string> { payload.SourceDay };

            var copiedCount = 0;

            foreach (var targetShopId in targetShopIds)
            {
                foreach (var targetDay in targetDays)
                {
                    // Skip copying source to itself on same shop
                    if (targetShopId == shopId && targetDay == payload.SourceDay)
                        continue;

                    // Remove existing entry for this day on target shop
                    var existingEntry = await context.ShopWorkdayHeaders
                        .FirstOrDefaultAsync(x => x.AccountId == accountId && x.ShopId == targetShopId
                            && x.Day == targetDay, HttpContext.RequestAborted);

                    int newHeaderId;

                    if (existingEntry != null)
                    {
                        // Update existing
                        existingEntry.OpenTime = sourceEntry.OpenTime;
                        existingEntry.CloseTime = sourceEntry.CloseTime;
                        existingEntry.DayDelta = sourceEntry.DayDelta;
                        existingEntry.Enabled = true;
                        existingEntry.ModifiedDate = now;
                        existingEntry.ModifiedBy = user;
                        newHeaderId = existingEntry.WorkdayHeaderId;

                        // Remove old periods for this day
                        var oldPeriods = await context.ShopWorkdayPeriods
                            .Where(x => x.AccountId == accountId && x.ShopId == targetShopId
                                && x.WorkdayHeaderId == newHeaderId)
                            .ToListAsync(HttpContext.RequestAborted);
                        context.ShopWorkdayPeriods.RemoveRange(oldPeriods);
                    }
                    else
                    {
                        // Create new entry — let DB auto-generate WorkdayHeaderId
                        var newHeader = new ShopWorkdayHeader
                        {
                            AccountId = accountId,
                            ShopId = targetShopId,
                            Day = targetDay,
                            OpenTime = sourceEntry.OpenTime,
                            CloseTime = sourceEntry.CloseTime,
                            DayDelta = sourceEntry.DayDelta,
                            Enabled = true,
                            CreatedDate = now,
                            CreatedBy = user,
                            ModifiedDate = now,
                            ModifiedBy = user
                        };
                        context.ShopWorkdayHeaders.Add(newHeader);
                        // Save now to get the auto-generated WorkdayHeaderId
                        await context.SaveChangesAsync(HttpContext.RequestAborted);
                        newHeaderId = newHeader.WorkdayHeaderId;
                    }

                    // Copy periods — let DB auto-generate WorkdayPeriodId
                    foreach (var sp in sourcePeriods)
                    {
                        context.ShopWorkdayPeriods.Add(new ShopWorkdayPeriod
                        {
                            AccountId = accountId,
                            ShopId = targetShopId,
                            WorkdayHeaderId = newHeaderId,
                            PeriodName = sp.PeriodName,
                            FromTime = sp.FromTime,
                            ToTime = sp.ToTime,
                            DayDelta = sp.DayDelta,
                            Enabled = true,
                            WorkdayPeriodMasterId = sp.WorkdayPeriodMasterId,
                            CreatedDate = now,
                            CreatedBy = user,
                            ModifiedDate = now,
                            ModifiedBy = user
                        });
                    }
                    await context.SaveChangesAsync(HttpContext.RequestAborted);

                    copiedCount++;
                }
            }

            return Ok(new { message = $"Copied schedule to {copiedCount} day(s)." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error copying workday schedule for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while copying the schedule." });
        }
    }

    // ════════════════════════════════════════════════════════════════
    //  WORKDAY PERIOD MASTERS
    // ════════════════════════════════════════════════════════════════

    [HttpGet("brand/{brandId:int}/period-masters")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<WorkdayPeriodMasterDto>>> GetPeriodMasters(int brandId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var masters = await context.WorkdayPeriodMasters
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled)
                .OrderBy(x => x.WorkdayPeriodMasterId)
                .ToListAsync(HttpContext.RequestAborted);

            // Count usage per master across all shops
            var masterIds = masters.Select(m => m.WorkdayPeriodMasterId).ToList();
            var usageCounts = await context.ShopWorkdayPeriods
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.Enabled && x.WorkdayPeriodMasterId != null
                    && masterIds.Contains(x.WorkdayPeriodMasterId!.Value))
                .GroupBy(x => x.WorkdayPeriodMasterId!.Value)
                .Select(g => new { MasterId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.MasterId, x => x.Count, HttpContext.RequestAborted);

            var dtos = masters.Select(m => new WorkdayPeriodMasterDto
            {
                WorkdayPeriodMasterId = m.WorkdayPeriodMasterId,
                AccountId = m.AccountId,
                PeriodName = m.PeriodName ?? string.Empty,
                PeriodCode = m.PeriodCode ?? string.Empty,
                DefaultFromTime = m.DefaultFromTime,
                DefaultToTime = m.DefaultToTime,
                DayDelta = m.DayDelta,
                Enabled = m.Enabled,
                UsageCount = usageCounts.TryGetValue(m.WorkdayPeriodMasterId, out var c) ? c : 0
            }).ToList();

            return Ok(dtos);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching period masters for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while fetching period masters." });
        }
    }

    [HttpPost("brand/{brandId:int}/period-masters")]
    [RequireBrandAdmin]
    public async Task<ActionResult<WorkdayPeriodMasterDto>> CreatePeriodMaster(int brandId, UpsertWorkdayPeriodMasterDto payload)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.PeriodName))
                return BadRequest(new { message = "Period name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var nextId = (await context.WorkdayPeriodMasters
                .Where(x => x.AccountId == accountId)
                .Select(x => (int?)x.WorkdayPeriodMasterId)
                .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;

            var entity = new WorkdayPeriodMaster
            {
                WorkdayPeriodMasterId = nextId,
                AccountId = accountId,
                PeriodName = Clip(payload.PeriodName, 50),
                PeriodCode = Clip(payload.PeriodCode, 50),
                DefaultFromTime = payload.DefaultFromTime,
                DefaultToTime = payload.DefaultToTime,
                DayDelta = payload.DayDelta,
                Enabled = true,
                CreatedDate = now,
                CreatedBy = user,
                ModifiedDate = now,
                ModifiedBy = user
            };

            context.WorkdayPeriodMasters.Add(entity);
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new WorkdayPeriodMasterDto
            {
                WorkdayPeriodMasterId = entity.WorkdayPeriodMasterId,
                AccountId = entity.AccountId,
                PeriodName = entity.PeriodName,
                PeriodCode = entity.PeriodCode ?? string.Empty,
                DefaultFromTime = entity.DefaultFromTime,
                DefaultToTime = entity.DefaultToTime,
                DayDelta = entity.DayDelta,
                Enabled = entity.Enabled,
                UsageCount = 0
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating period master for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while creating the period master." });
        }
    }

    [HttpPut("brand/{brandId:int}/period-masters/{masterId:int}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<WorkdayPeriodMasterDto>> UpdatePeriodMaster(
        int brandId, int masterId, UpsertWorkdayPeriodMasterDto payload,
        [FromQuery] bool cascadeRename = false)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(payload.PeriodName))
                return BadRequest(new { message = "Period name is required." });

            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);
            var now = DateTime.UtcNow;
            var user = GetCurrentUserIdentifier();

            var entity = await context.WorkdayPeriodMasters
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.WorkdayPeriodMasterId == masterId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Period master not found." });

            var newName = Clip(payload.PeriodName, 50);
            var oldName = entity.PeriodName;

            entity.PeriodName = newName;
            entity.PeriodCode = Clip(payload.PeriodCode, 50);
            entity.DefaultFromTime = payload.DefaultFromTime;
            entity.DefaultToTime = payload.DefaultToTime;
            entity.DayDelta = payload.DayDelta;
            entity.ModifiedDate = now;
            entity.ModifiedBy = user;

            // Cascade rename: update all ShopWorkdayPeriods referencing this master
            var affectedCount = 0;
            if (cascadeRename && oldName != newName)
            {
                var affectedPeriods = await context.ShopWorkdayPeriods
                    .Where(x => x.AccountId == accountId && x.WorkdayPeriodMasterId == masterId && x.Enabled)
                    .ToListAsync(HttpContext.RequestAborted);

                foreach (var p in affectedPeriods)
                {
                    p.PeriodName = newName;
                    p.ModifiedDate = now;
                    p.ModifiedBy = user;
                }
                affectedCount = affectedPeriods.Count;
            }

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            var usageCount = await context.ShopWorkdayPeriods
                .AsNoTracking()
                .CountAsync(x => x.AccountId == accountId && x.WorkdayPeriodMasterId == masterId && x.Enabled,
                    HttpContext.RequestAborted);

            return Ok(new WorkdayPeriodMasterDto
            {
                WorkdayPeriodMasterId = entity.WorkdayPeriodMasterId,
                AccountId = entity.AccountId,
                PeriodName = entity.PeriodName,
                PeriodCode = entity.PeriodCode ?? string.Empty,
                DefaultFromTime = entity.DefaultFromTime,
                DefaultToTime = entity.DefaultToTime,
                DayDelta = entity.DayDelta,
                Enabled = entity.Enabled,
                UsageCount = usageCount
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating period master for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while updating the period master." });
        }
    }

    [HttpDelete("brand/{brandId:int}/period-masters/{masterId:int}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> DeactivatePeriodMaster(int brandId, int masterId)
    {
        try
        {
            var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

            var entity = await context.WorkdayPeriodMasters
                .FirstOrDefaultAsync(x => x.AccountId == accountId && x.WorkdayPeriodMasterId == masterId,
                    HttpContext.RequestAborted);

            if (entity == null)
                return NotFound(new { message = "Period master not found." });

            // Block deletion if in use
            var usageCount = await context.ShopWorkdayPeriods
                .AsNoTracking()
                .CountAsync(x => x.AccountId == accountId && x.WorkdayPeriodMasterId == masterId && x.Enabled,
                    HttpContext.RequestAborted);

            if (usageCount > 0)
                return BadRequest(new { message = $"Cannot remove: {usageCount} active period(s) are using \"{entity.PeriodName}\"." });

            entity.Enabled = false;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.ModifiedBy = GetCurrentUserIdentifier();
            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new { message = "Period master deactivated." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Brand not found: {BrandId}", brandId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating period master for brand {BrandId}", brandId);
            return StatusCode(500, new { message = "An error occurred while deactivating the period master." });
        }
    }
}
