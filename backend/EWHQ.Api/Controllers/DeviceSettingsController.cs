using System;
using System.Collections.Generic;
using System.Globalization;
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
[Route("api/device-settings")]
[Authorize]
public class DeviceSettingsController : ControllerBase
{
    private const string PrinterRedirectParamPrefix = "PRINTER_REDIRECT";

    private readonly IPOSDbContextService _posContextService;
    private readonly ISettingsAuditService _settingsAuditService;
    private readonly ILogger<DeviceSettingsController> _logger;

    public DeviceSettingsController(
        IPOSDbContextService posContextService,
        ISettingsAuditService settingsAuditService,
        ILogger<DeviceSettingsController> logger)
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

    private async Task<(EWHQDbContext context, int accountId)> GetContextAndValidateShopAsync(int brandId, int shopId)
    {
        var (context, accountId) = await _posContextService.GetContextAndAccountIdForBrandAsync(brandId);

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

    private static DeviceTerminalDto ToDeviceTerminalDto(DeviceTerminal terminal, string modelName)
    {
        return new DeviceTerminalDto
        {
            TerminalId = terminal.TerminalId,
            ShopId = terminal.ShopId,
            PosCode = terminal.PosCode ?? string.Empty,
            PosIpAddress = terminal.PosIpAddress ?? string.Empty,
            IsServer = terminal.IsServer,
            IsCashRegister = terminal.IsCashRegister,
            CashRegisterCode = terminal.CashRegisterCode ?? string.Empty,
            DeviceTerminalModelId = terminal.DeviceTerminalModelId,
            DeviceModelName = modelName,
            ResolutionWidth = terminal.ResolutionWidth,
            ResolutionHeight = terminal.ResolutionHeight,
            ResolutionForDisplay = $"{terminal.ResolutionWidth}x{terminal.ResolutionHeight}",
            IsConfigFileUploaded = !string.IsNullOrWhiteSpace(terminal.ConfigFile),
            IsActivated = terminal.IsActivated,
            Enabled = terminal.Enabled
        };
    }

    private static DevicePrinterDto ToDevicePrinterDto(ShopPrinterMaster printer, IReadOnlyList<int>? redirectIds = null)
    {
        return new DevicePrinterDto
        {
            ShopPrinterMasterId = printer.ShopPrinterMasterId,
            ShopId = printer.ShopId,
            PrinterName = printer.PrinterName ?? string.Empty,
            IsKds = printer.IsKds ?? false,
            IsLabelPrinter = printer.IsLabelPrinter ?? false,
            IsDinein = printer.IsDinein ?? true,
            IsTakeaway = printer.IsTakeaway ?? true,
            AutoRedirectPrinterIdList = redirectIds ?? Array.Empty<int>()
        };
    }

    private static CashDrawerDto ToCashDrawerDto(CashDrawerHeader drawer)
    {
        return new CashDrawerDto
        {
            CashDrawerCode = drawer.CashDrawerCode ?? string.Empty,
            CashDrawerName = drawer.CashDrawerName ?? string.Empty,
            ShopId = drawer.ShopId,
            Enabled = drawer.Enabled
        };
    }

    private async Task<int> GetNextTerminalIdAsync(EWHQDbContext context, int accountId, int shopId)
    {
        return (await context.DeviceTerminals
            .Where(x => x.AccountId == accountId && x.ShopId == shopId)
            .Select(x => (int?)x.TerminalId)
            .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;
    }

    private async Task<int> GetNextPrinterIdAsync(EWHQDbContext context, int accountId, int shopId)
    {
        return (await context.ShopPrinterMasters
            .Where(x => x.AccountId == accountId && x.ShopId == shopId)
            .Select(x => (int?)x.ShopPrinterMasterId)
            .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;
    }

    private async Task<int> GetNextShopSystemParamIdAsync(EWHQDbContext context, int accountId, int shopId)
    {
        return (await context.ShopSystemParameters
            .Where(x => x.AccountId == accountId && x.ShopId == shopId)
            .Select(x => (int?)x.ParamId)
            .MaxAsync(HttpContext.RequestAborted) ?? 0) + 1;
    }

    private async Task<string> GenerateNextCashDrawerCodeAsync(EWHQDbContext context, int accountId, int shopId)
    {
        var prefix = $"{shopId}D";
        var existingCodes = await context.CashDrawerHeaders
            .AsNoTracking()
            .Where(x => x.AccountId == accountId && x.ShopId == shopId)
            .Select(x => x.CashDrawerCode)
            .ToListAsync(HttpContext.RequestAborted);

        var maxSuffix = 0;
        foreach (var code in existingCodes)
        {
            if (string.IsNullOrWhiteSpace(code) || !code.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var suffix = code[prefix.Length..];
            if (int.TryParse(suffix, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            {
                if (parsed > maxSuffix)
                {
                    maxSuffix = parsed;
                }
            }
        }

        return $"{prefix}{maxSuffix + 1}";
    }

    private async Task<Dictionary<int, List<int>>> GetPrinterRedirectMapAsync(EWHQDbContext context, int accountId, int shopId)
    {
        var redirectParams = await context.ShopSystemParameters
            .AsNoTracking()
            .Where(x => x.AccountId == accountId
                        && x.ShopId == shopId
                        && x.Enabled
                        && (x.ParamCode ?? string.Empty).StartsWith(PrinterRedirectParamPrefix))
            .Select(x => new
            {
                x.ParamCode,
                x.ParamValue
            })
            .ToListAsync(HttpContext.RequestAborted);

        var result = new Dictionary<int, List<int>>();

        foreach (var redirectParam in redirectParams)
        {
            if (string.IsNullOrWhiteSpace(redirectParam.ParamValue))
            {
                continue;
            }

            var parsedIds = redirectParam.ParamValue
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(segment => int.TryParse(segment, out var parsedId) ? parsedId : 0)
                .Where(id => id > 0)
                .ToList();

            if (parsedIds.Count <= 1)
            {
                continue;
            }

            var sourcePrinterId = parsedIds[0];
            var redirectIds = parsedIds.Skip(1).Distinct().ToList();
            result[sourcePrinterId] = redirectIds;
        }

        return result;
    }

    private async Task ReplacePrinterRedirectConfigAsync(
        EWHQDbContext context,
        int accountId,
        int shopId,
        int printerId,
        IReadOnlyList<int>? redirectPrinterIds,
        string currentUser,
        DateTime now)
    {
        var existingParams = await context.ShopSystemParameters
            .Where(x => x.AccountId == accountId
                        && x.ShopId == shopId
                        && (x.ParamCode ?? string.Empty).StartsWith($"{PrinterRedirectParamPrefix}_{printerId}"))
            .ToListAsync(HttpContext.RequestAborted);

        if (existingParams.Count > 0)
        {
            context.ShopSystemParameters.RemoveRange(existingParams);
        }

        var validRedirectIds = (redirectPrinterIds ?? Array.Empty<int>())
            .Where(id => id > 0 && id != printerId)
            .Distinct()
            .ToList();

        if (validRedirectIds.Count == 0)
        {
            return;
        }

        var paramId = await GetNextShopSystemParamIdAsync(context, accountId, shopId);

        context.ShopSystemParameters.Add(new ShopSystemParameter
        {
            AccountId = accountId,
            ShopId = shopId,
            ParamId = paramId,
            ParamCode = $"{PrinterRedirectParamPrefix}_{printerId}",
            ParamValue = string.Join(",", (new[] { printerId }).Concat(validRedirectIds)),
            Description = string.Empty,
            Enabled = true,
            CreatedBy = currentUser,
            CreatedDate = now,
            ModifiedBy = currentUser,
            ModifiedDate = now
        });
    }

    private async Task<CashDrawerHeader> ResolveOrCreateCashDrawerAsync(
        EWHQDbContext context,
        int accountId,
        int shopId,
        string requestedCashRegisterCode,
        string currentUser,
        DateTime now)
    {
        var normalizedRequestedCode = Clip(requestedCashRegisterCode, 10).ToUpperInvariant();
        var effectiveCode = normalizedRequestedCode;

        if (string.IsNullOrWhiteSpace(effectiveCode))
        {
            effectiveCode = await GenerateNextCashDrawerCodeAsync(context, accountId, shopId);
        }

        var existingDrawer = await context.CashDrawerHeaders
            .FirstOrDefaultAsync(
                x => x.AccountId == accountId
                     && x.ShopId == shopId
                     && (x.CashDrawerCode ?? string.Empty).ToUpper() == effectiveCode,
                HttpContext.RequestAborted);

        if (existingDrawer != null)
        {
            if (!existingDrawer.Enabled)
            {
                existingDrawer.Enabled = true;
                existingDrawer.ModifiedBy = currentUser;
                existingDrawer.ModifiedDate = now;
            }

            if (string.IsNullOrWhiteSpace(existingDrawer.CashDrawerName))
            {
                existingDrawer.CashDrawerName = effectiveCode;
                existingDrawer.ModifiedBy = currentUser;
                existingDrawer.ModifiedDate = now;
            }

            return existingDrawer;
        }

        var drawer = new CashDrawerHeader
        {
            AccountId = accountId,
            ShopId = shopId,
            CashDrawerCode = effectiveCode,
            CashDrawerName = effectiveCode,
            Enabled = true,
            CreatedBy = currentUser,
            CreatedDate = now,
            ModifiedBy = currentUser,
            ModifiedDate = now
        };

        context.CashDrawerHeaders.Add(drawer);
        return drawer;
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/terminal-models")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<DeviceTerminalModelOptionDto>>> GetTerminalModels(int brandId, int shopId)
    {
        try
        {
            var (context, _) = await GetContextAndValidateShopAsync(brandId, shopId);

            var terminalModels = await context.DeviceTerminalModels
                .AsNoTracking()
                .Where(x => x.Enabled)
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.DeviceTerminalModelName)
                .Select(x => new DeviceTerminalModelOptionDto
                {
                    DeviceTerminalModelId = x.DeviceTerminalModelId,
                    DeviceTerminalModelCode = x.DeviceTerminalModelCode ?? string.Empty,
                    DeviceTerminalModelName = x.DeviceTerminalModelName ?? string.Empty,
                    DefaultResolutionWidth = x.DefaultResolutionWidth,
                    DefaultResolutionHeight = x.DefaultResolutionHeight
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(terminalModels);
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
            _logger.LogError(ex, "Error fetching terminal models for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading terminal models." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/terminals")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<DeviceTerminalDto>>> GetTerminals(int brandId, int shopId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var terminals = await (
                from terminal in context.DeviceTerminals.AsNoTracking()
                join model in context.DeviceTerminalModels.AsNoTracking()
                    on terminal.DeviceTerminalModelId equals model.DeviceTerminalModelId
                    into modelJoin
                from model in modelJoin.DefaultIfEmpty()
                where terminal.AccountId == accountId && terminal.ShopId == shopId && terminal.Enabled
                orderby terminal.TerminalId
                select new DeviceTerminalDto
                {
                    TerminalId = terminal.TerminalId,
                    ShopId = terminal.ShopId,
                    PosCode = terminal.PosCode ?? string.Empty,
                    PosIpAddress = terminal.PosIpAddress ?? string.Empty,
                    IsServer = terminal.IsServer,
                    IsCashRegister = terminal.IsCashRegister,
                    CashRegisterCode = terminal.CashRegisterCode ?? string.Empty,
                    DeviceTerminalModelId = terminal.DeviceTerminalModelId,
                    DeviceModelName = model != null ? (model.DeviceTerminalModelName ?? string.Empty) : string.Empty,
                    ResolutionWidth = terminal.ResolutionWidth,
                    ResolutionHeight = terminal.ResolutionHeight,
                    ResolutionForDisplay = (terminal.ResolutionWidth.ToString(CultureInfo.InvariantCulture) + "x" + terminal.ResolutionHeight.ToString(CultureInfo.InvariantCulture)),
                    IsConfigFileUploaded = !string.IsNullOrEmpty(terminal.ConfigFile),
                    IsActivated = terminal.IsActivated,
                    Enabled = terminal.Enabled
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(terminals);
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
            _logger.LogError(ex, "Error fetching terminals for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading terminals." });
        }
    }

    [HttpPost("brand/{brandId:int}/shops/{shopId:int}/terminals")]
    [RequireBrandAdmin]
    public async Task<ActionResult<DeviceTerminalDto>> CreateTerminal(int brandId, int shopId, UpsertDeviceTerminalRequestDto payload)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var posCode = Clip(payload.PosCode, 200);
            if (string.IsNullOrWhiteSpace(posCode))
            {
                return BadRequest(new { message = "POS code is required." });
            }

            var model = await context.DeviceTerminalModels
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.DeviceTerminalModelId == payload.DeviceTerminalModelId && x.Enabled,
                    HttpContext.RequestAborted);

            if (model == null)
            {
                return BadRequest(new { message = "A valid device model is required." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var width = payload.ResolutionWidth > 0 ? payload.ResolutionWidth : model.DefaultResolutionWidth;
            var height = payload.ResolutionHeight > 0 ? payload.ResolutionHeight : model.DefaultResolutionHeight;

            if (width <= 0 || height <= 0)
            {
                return BadRequest(new { message = "Valid resolution width and height are required." });
            }

            var terminalId = await GetNextTerminalIdAsync(context, accountId, shopId);
            var terminal = new DeviceTerminal
            {
                AccountId = accountId,
                ShopId = shopId,
                TerminalId = terminalId,
                PosCode = posCode,
                PosIpAddress = Clip(payload.PosIpAddress, 200),
                IsServer = payload.IsServer,
                IsCashRegister = payload.IsCashRegister,
                CashRegisterCode = string.Empty,
                DeviceTerminalModelId = payload.DeviceTerminalModelId,
                ResolutionWidth = width,
                ResolutionHeight = height,
                Resolution = $"{width}x{height}",
                ConfigFile = string.Empty,
                IsActivated = false,
                Enabled = true,
                CreatedBy = currentUser,
                CreatedDate = now,
                ModifiedBy = currentUser,
                ModifiedDate = now
            };

            if (payload.IsCashRegister)
            {
                var drawer = await ResolveOrCreateCashDrawerAsync(
                    context,
                    accountId,
                    shopId,
                    payload.CashRegisterCode,
                    currentUser,
                    now);

                terminal.CashRegisterCode = drawer.CashDrawerCode;
            }

            context.DeviceTerminals.Add(terminal);

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "DEVICE_SETTINGS",
                    ActionType = "CREATE_TERMINAL",
                    ActionRefId = terminal.TerminalId.ToString(CultureInfo.InvariantCulture),
                    ActionRefDescription = terminal.PosCode ?? string.Empty,
                    Details = $"Created terminal; modelId={terminal.DeviceTerminalModelId}; cashRegister={terminal.IsCashRegister}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToDeviceTerminalDto(terminal, model.DeviceTerminalModelName ?? string.Empty));
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
            _logger.LogError(ex, "Error creating terminal for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while creating terminal." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/terminals/{terminalId:int}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<DeviceTerminalDto>> UpdateTerminal(int brandId, int shopId, int terminalId, UpsertDeviceTerminalRequestDto payload)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var terminal = await context.DeviceTerminals
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId && x.TerminalId == terminalId,
                    HttpContext.RequestAborted);

            if (terminal == null)
            {
                return NotFound(new { message = "Terminal not found." });
            }

            var posCode = Clip(payload.PosCode, 200);
            if (string.IsNullOrWhiteSpace(posCode))
            {
                return BadRequest(new { message = "POS code is required." });
            }

            var model = await context.DeviceTerminalModels
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.DeviceTerminalModelId == payload.DeviceTerminalModelId && x.Enabled,
                    HttpContext.RequestAborted);

            if (model == null)
            {
                return BadRequest(new { message = "A valid device model is required." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var width = payload.ResolutionWidth > 0 ? payload.ResolutionWidth : model.DefaultResolutionWidth;
            var height = payload.ResolutionHeight > 0 ? payload.ResolutionHeight : model.DefaultResolutionHeight;

            if (width <= 0 || height <= 0)
            {
                return BadRequest(new { message = "Valid resolution width and height are required." });
            }

            terminal.PosCode = posCode;
            terminal.PosIpAddress = Clip(payload.PosIpAddress, 200);
            terminal.IsServer = payload.IsServer;
            terminal.IsCashRegister = payload.IsCashRegister;
            terminal.DeviceTerminalModelId = payload.DeviceTerminalModelId;
            terminal.ResolutionWidth = width;
            terminal.ResolutionHeight = height;
            terminal.Resolution = $"{width}x{height}";

            if (payload.IsCashRegister)
            {
                var drawer = await ResolveOrCreateCashDrawerAsync(
                    context,
                    accountId,
                    shopId,
                    payload.CashRegisterCode,
                    currentUser,
                    now);

                terminal.CashRegisterCode = drawer.CashDrawerCode;
            }
            else
            {
                terminal.CashRegisterCode = string.Empty;
            }

            terminal.ModifiedBy = currentUser;
            terminal.ModifiedDate = now;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "DEVICE_SETTINGS",
                    ActionType = "UPDATE_TERMINAL",
                    ActionRefId = terminalId.ToString(CultureInfo.InvariantCulture),
                    ActionRefDescription = terminal.PosCode ?? string.Empty,
                    Details = $"Updated terminal; modelId={terminal.DeviceTerminalModelId}; cashRegister={terminal.IsCashRegister}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToDeviceTerminalDto(terminal, model.DeviceTerminalModelName ?? string.Empty));
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
            _logger.LogError(ex, "Error updating terminal {TerminalId} for brand {BrandId}, shop {ShopId}", terminalId, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while updating terminal." });
        }
    }

    [HttpDelete("brand/{brandId:int}/shops/{shopId:int}/terminals/{terminalId:int}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> DeleteTerminal(int brandId, int shopId, int terminalId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var terminal = await context.DeviceTerminals
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId && x.TerminalId == terminalId,
                    HttpContext.RequestAborted);

            if (terminal == null)
            {
                return NotFound(new { message = "Terminal not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            terminal.Enabled = false;
            terminal.ModifiedBy = currentUser;
            terminal.ModifiedDate = now;

            if (!string.IsNullOrWhiteSpace(terminal.CashRegisterCode))
            {
                var drawer = await context.CashDrawerHeaders
                    .FirstOrDefaultAsync(
                        x => x.AccountId == accountId
                             && x.ShopId == shopId
                             && (x.CashDrawerCode ?? string.Empty).ToUpper() == terminal.CashRegisterCode.ToUpper(),
                        HttpContext.RequestAborted);

                if (drawer != null)
                {
                    drawer.Enabled = false;
                    drawer.ModifiedBy = currentUser;
                    drawer.ModifiedDate = now;
                }
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "DEVICE_SETTINGS",
                    ActionType = "DELETE_TERMINAL",
                    ActionRefId = terminalId.ToString(CultureInfo.InvariantCulture),
                    ActionRefDescription = terminal.PosCode ?? string.Empty,
                    Details = "Disabled terminal and detached related cash drawer if linked.",
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
            _logger.LogError(ex, "Error deleting terminal {TerminalId} for brand {BrandId}, shop {ShopId}", terminalId, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while deleting terminal." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/terminals/{terminalId:int}/config-file")]
    [RequireBrandView]
    public async Task<ActionResult<DeviceTerminalConfigFileDto>> GetTerminalConfigFile(int brandId, int shopId, int terminalId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var terminalConfig = await context.DeviceTerminals
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId && x.TerminalId == terminalId && x.Enabled)
                .Select(x => new DeviceTerminalConfigFileDto
                {
                    TerminalId = x.TerminalId,
                    ShopId = x.ShopId,
                    PosCode = x.PosCode ?? string.Empty,
                    IsConfigFileUploaded = !string.IsNullOrWhiteSpace(x.ConfigFile),
                    ConfigFile = x.ConfigFile ?? string.Empty
                })
                .FirstOrDefaultAsync(HttpContext.RequestAborted);

            if (terminalConfig == null)
            {
                return NotFound(new { message = "Terminal not found." });
            }

            return Ok(terminalConfig);
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
            _logger.LogError(ex, "Error fetching config file for terminal {TerminalId} in brand {BrandId}, shop {ShopId}", terminalId, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading terminal config file." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/printers")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<DevicePrinterDto>>> GetPrinters(int brandId, int shopId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var printers = await context.ShopPrinterMasters
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId && x.Enabled)
                .OrderBy(x => x.PrinterName)
                .ThenBy(x => x.ShopPrinterMasterId)
                .ToListAsync(HttpContext.RequestAborted);

            var redirectMap = await GetPrinterRedirectMapAsync(context, accountId, shopId);
            var response = printers
                .Select(printer =>
                    ToDevicePrinterDto(
                        printer,
                        redirectMap.TryGetValue(printer.ShopPrinterMasterId, out var ids)
                            ? ids
                            : Array.Empty<int>()))
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
            _logger.LogError(ex, "Error fetching printers for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading printers." });
        }
    }

    [HttpPost("brand/{brandId:int}/shops/{shopId:int}/printers")]
    [RequireBrandAdmin]
    public async Task<ActionResult<DevicePrinterDto>> CreatePrinter(int brandId, int shopId, UpsertDevicePrinterRequestDto payload)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var printerName = Clip(payload.PrinterName, 50);
            if (string.IsNullOrWhiteSpace(printerName))
            {
                return BadRequest(new { message = "Printer name is required." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            var printerId = await GetNextPrinterIdAsync(context, accountId, shopId);
            var printer = new ShopPrinterMaster
            {
                AccountId = accountId,
                ShopId = shopId,
                ShopPrinterMasterId = printerId,
                PrinterName = printerName,
                IsKds = payload.IsKds,
                IsLabelPrinter = payload.IsLabelPrinter,
                IsDinein = payload.IsDinein,
                IsTakeaway = payload.IsTakeaway,
                Enabled = true,
                CreatedBy = currentUser,
                CreatedDate = now,
                ModifiedBy = currentUser,
                ModifiedDate = now,
                Remark = string.Empty,
                RedirectToPrinterName = string.Empty,
                RedirectDateTime = null
            };

            context.ShopPrinterMasters.Add(printer);

            await ReplacePrinterRedirectConfigAsync(
                context,
                accountId,
                shopId,
                printerId,
                payload.AutoRedirectPrinterIdList,
                currentUser,
                now);

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "DEVICE_SETTINGS",
                    ActionType = "CREATE_PRINTER",
                    ActionRefId = printerId.ToString(CultureInfo.InvariantCulture),
                    ActionRefDescription = printer.PrinterName ?? string.Empty,
                    Details = $"Created printer; redirectCount={(payload.AutoRedirectPrinterIdList ?? Array.Empty<int>()).Count}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToDevicePrinterDto(printer, payload.AutoRedirectPrinterIdList?.Where(id => id > 0 && id != printerId).Distinct().ToList()));
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
            _logger.LogError(ex, "Error creating printer for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while creating printer." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/printers/{printerId:int}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<DevicePrinterDto>> UpdatePrinter(int brandId, int shopId, int printerId, UpsertDevicePrinterRequestDto payload)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var printer = await context.ShopPrinterMasters
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId && x.ShopPrinterMasterId == printerId,
                    HttpContext.RequestAborted);

            if (printer == null)
            {
                return NotFound(new { message = "Printer not found." });
            }

            var printerName = Clip(payload.PrinterName, 50);
            if (string.IsNullOrWhiteSpace(printerName))
            {
                return BadRequest(new { message = "Printer name is required." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            printer.PrinterName = printerName;
            printer.IsKds = payload.IsKds;
            printer.IsLabelPrinter = payload.IsLabelPrinter;
            printer.IsDinein = payload.IsDinein;
            printer.IsTakeaway = payload.IsTakeaway;
            printer.ModifiedBy = currentUser;
            printer.ModifiedDate = now;

            await ReplacePrinterRedirectConfigAsync(
                context,
                accountId,
                shopId,
                printerId,
                payload.AutoRedirectPrinterIdList,
                currentUser,
                now);

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "DEVICE_SETTINGS",
                    ActionType = "UPDATE_PRINTER",
                    ActionRefId = printerId.ToString(CultureInfo.InvariantCulture),
                    ActionRefDescription = printer.PrinterName ?? string.Empty,
                    Details = $"Updated printer; redirectCount={(payload.AutoRedirectPrinterIdList ?? Array.Empty<int>()).Count}",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToDevicePrinterDto(printer, payload.AutoRedirectPrinterIdList?.Where(id => id > 0 && id != printerId).Distinct().ToList()));
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
            _logger.LogError(ex, "Error updating printer {PrinterId} for brand {BrandId}, shop {ShopId}", printerId, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while updating printer." });
        }
    }

    [HttpDelete("brand/{brandId:int}/shops/{shopId:int}/printers/{printerId:int}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> DeletePrinter(int brandId, int shopId, int printerId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var printer = await context.ShopPrinterMasters
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId && x.ShopId == shopId && x.ShopPrinterMasterId == printerId,
                    HttpContext.RequestAborted);

            if (printer == null)
            {
                return NotFound(new { message = "Printer not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            printer.Enabled = false;
            printer.ModifiedBy = currentUser;
            printer.ModifiedDate = now;

            var redirectParams = await context.ShopSystemParameters
                .Where(x => x.AccountId == accountId
                            && x.ShopId == shopId
                            && (x.ParamCode ?? string.Empty).StartsWith($"{PrinterRedirectParamPrefix}_{printerId}"))
                .ToListAsync(HttpContext.RequestAborted);

            if (redirectParams.Count > 0)
            {
                context.ShopSystemParameters.RemoveRange(redirectParams);
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "DEVICE_SETTINGS",
                    ActionType = "DELETE_PRINTER",
                    ActionRefId = printerId.ToString(CultureInfo.InvariantCulture),
                    ActionRefDescription = printer.PrinterName ?? string.Empty,
                    Details = "Disabled printer and removed redirect rules.",
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
            _logger.LogError(ex, "Error deleting printer {PrinterId} for brand {BrandId}, shop {ShopId}", printerId, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while deleting printer." });
        }
    }

    [HttpGet("brand/{brandId:int}/shops/{shopId:int}/cash-drawers")]
    [RequireBrandView]
    public async Task<ActionResult<IReadOnlyList<CashDrawerDto>>> GetCashDrawers(int brandId, int shopId)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var drawers = await context.CashDrawerHeaders
                .AsNoTracking()
                .Where(x => x.AccountId == accountId && x.ShopId == shopId && x.Enabled)
                .OrderBy(x => x.CashDrawerCode)
                .Select(x => new CashDrawerDto
                {
                    CashDrawerCode = x.CashDrawerCode ?? string.Empty,
                    CashDrawerName = x.CashDrawerName ?? string.Empty,
                    ShopId = x.ShopId,
                    Enabled = x.Enabled
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(drawers);
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
            _logger.LogError(ex, "Error fetching cash drawers for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while loading cash drawers." });
        }
    }

    [HttpPost("brand/{brandId:int}/shops/{shopId:int}/cash-drawers")]
    [RequireBrandAdmin]
    public async Task<ActionResult<CashDrawerDto>> CreateCashDrawer(int brandId, int shopId, UpsertCashDrawerRequestDto payload)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var drawerName = Clip(payload.CashDrawerName, 50);
            if (string.IsNullOrWhiteSpace(drawerName))
            {
                return BadRequest(new { message = "Cash drawer name is required." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();
            var cashDrawerCode = await GenerateNextCashDrawerCodeAsync(context, accountId, shopId);

            var cashDrawer = new CashDrawerHeader
            {
                AccountId = accountId,
                ShopId = shopId,
                CashDrawerCode = cashDrawerCode,
                CashDrawerName = drawerName,
                Enabled = true,
                CreatedBy = currentUser,
                CreatedDate = now,
                ModifiedBy = currentUser,
                ModifiedDate = now
            };

            context.CashDrawerHeaders.Add(cashDrawer);

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "DEVICE_SETTINGS",
                    ActionType = "CREATE_CASH_DRAWER",
                    ActionRefId = cashDrawerCode,
                    ActionRefDescription = cashDrawer.CashDrawerName ?? string.Empty,
                    Details = "Created cash drawer.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(ToCashDrawerDto(cashDrawer));
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
            _logger.LogError(ex, "Error creating cash drawer for brand {BrandId}, shop {ShopId}", brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while creating cash drawer." });
        }
    }

    [HttpPut("brand/{brandId:int}/shops/{shopId:int}/cash-drawers/{cashDrawerCode}")]
    [RequireBrandAdmin]
    public async Task<ActionResult<CashDrawerDto>> UpdateCashDrawer(
        int brandId,
        int shopId,
        string cashDrawerCode,
        UpsertCashDrawerRequestDto payload)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var normalizedCode = Clip(cashDrawerCode, 10).ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(normalizedCode))
            {
                return BadRequest(new { message = "Cash drawer code is required." });
            }

            var drawerName = Clip(payload.CashDrawerName, 50);
            if (string.IsNullOrWhiteSpace(drawerName))
            {
                return BadRequest(new { message = "Cash drawer name is required." });
            }

            var cashDrawer = await context.CashDrawerHeaders
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && (x.CashDrawerCode ?? string.Empty).ToUpper() == normalizedCode,
                    HttpContext.RequestAborted);

            if (cashDrawer == null)
            {
                return NotFound(new { message = "Cash drawer not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            cashDrawer.CashDrawerName = drawerName;
            cashDrawer.ModifiedBy = currentUser;
            cashDrawer.ModifiedDate = now;

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "DEVICE_SETTINGS",
                    ActionType = "UPDATE_CASH_DRAWER",
                    ActionRefId = normalizedCode,
                    ActionRefDescription = cashDrawer.CashDrawerName ?? string.Empty,
                    Details = "Updated cash drawer name.",
                    Actor = currentUser
                },
                HttpContext.RequestAborted);

            await context.SaveChangesAsync(HttpContext.RequestAborted);
            return Ok(ToCashDrawerDto(cashDrawer));
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
            _logger.LogError(ex, "Error updating cash drawer {CashDrawerCode} for brand {BrandId}, shop {ShopId}", cashDrawerCode, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while updating cash drawer." });
        }
    }

    [HttpDelete("brand/{brandId:int}/shops/{shopId:int}/cash-drawers/{cashDrawerCode}")]
    [RequireBrandAdmin]
    public async Task<IActionResult> DeleteCashDrawer(int brandId, int shopId, string cashDrawerCode)
    {
        try
        {
            var (context, accountId) = await GetContextAndValidateShopAsync(brandId, shopId);

            var normalizedCode = Clip(cashDrawerCode, 10).ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(normalizedCode))
            {
                return BadRequest(new { message = "Cash drawer code is required." });
            }

            var cashDrawer = await context.CashDrawerHeaders
                .FirstOrDefaultAsync(
                    x => x.AccountId == accountId
                         && x.ShopId == shopId
                         && (x.CashDrawerCode ?? string.Empty).ToUpper() == normalizedCode,
                    HttpContext.RequestAborted);

            if (cashDrawer == null)
            {
                return NotFound(new { message = "Cash drawer not found." });
            }

            var now = DateTime.UtcNow;
            var currentUser = GetCurrentUserIdentifier();

            cashDrawer.Enabled = false;
            cashDrawer.ModifiedBy = currentUser;
            cashDrawer.ModifiedDate = now;

            var linkedTerminals = await context.DeviceTerminals
                .Where(x => x.AccountId == accountId
                            && x.ShopId == shopId
                            && (x.CashRegisterCode ?? string.Empty).ToUpper() == normalizedCode)
                .ToListAsync(HttpContext.RequestAborted);

            foreach (var terminal in linkedTerminals)
            {
                terminal.IsCashRegister = false;
                terminal.CashRegisterCode = string.Empty;
                terminal.ModifiedBy = currentUser;
                terminal.ModifiedDate = now;
            }

            await _settingsAuditService.LogMutationAsync(
                context,
                new SettingsAuditMutation
                {
                    AccountId = accountId,
                    ShopId = shopId,
                    Category = "DEVICE_SETTINGS",
                    ActionType = "DELETE_CASH_DRAWER",
                    ActionRefId = normalizedCode,
                    ActionRefDescription = cashDrawer.CashDrawerName ?? string.Empty,
                    Details = $"Disabled cash drawer and detached {linkedTerminals.Count} terminal(s).",
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
            _logger.LogError(ex, "Error deleting cash drawer {CashDrawerCode} for brand {BrandId}, shop {ShopId}", cashDrawerCode, brandId, shopId);
            return StatusCode(500, new { message = "An error occurred while deleting cash drawer." });
        }
    }
}
