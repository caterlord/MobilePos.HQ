using System;
using System.Collections.Generic;

namespace EWHQ.Api.DTOs;

public class DeviceTerminalModelOptionDto
{
    public int DeviceTerminalModelId { get; set; }
    public string DeviceTerminalModelCode { get; set; } = string.Empty;
    public string DeviceTerminalModelName { get; set; } = string.Empty;
    public int DefaultResolutionWidth { get; set; }
    public int DefaultResolutionHeight { get; set; }
}

public class DeviceTerminalDto
{
    public int TerminalId { get; set; }
    public int ShopId { get; set; }
    public string PosCode { get; set; } = string.Empty;
    public string PosIpAddress { get; set; } = string.Empty;
    public bool IsServer { get; set; }
    public bool IsCashRegister { get; set; }
    public string CashRegisterCode { get; set; } = string.Empty;
    public int DeviceTerminalModelId { get; set; }
    public string DeviceModelName { get; set; } = string.Empty;
    public int ResolutionWidth { get; set; }
    public int ResolutionHeight { get; set; }
    public string ResolutionForDisplay { get; set; } = string.Empty;
    public bool IsConfigFileUploaded { get; set; }
    public bool IsActivated { get; set; }
    public bool Enabled { get; set; }
}

public class DeviceTerminalConfigFileDto
{
    public int TerminalId { get; set; }
    public int ShopId { get; set; }
    public string PosCode { get; set; } = string.Empty;
    public bool IsConfigFileUploaded { get; set; }
    public string ConfigFile { get; set; } = string.Empty;
}

public class UpsertDeviceTerminalRequestDto
{
    public string PosCode { get; set; } = string.Empty;
    public string PosIpAddress { get; set; } = string.Empty;
    public bool IsServer { get; set; }
    public bool IsCashRegister { get; set; }
    public string CashRegisterCode { get; set; } = string.Empty;
    public int DeviceTerminalModelId { get; set; }
    public int ResolutionWidth { get; set; }
    public int ResolutionHeight { get; set; }
}

public class DevicePrinterDto
{
    public int ShopPrinterMasterId { get; set; }
    public int ShopId { get; set; }
    public string PrinterName { get; set; } = string.Empty;
    public bool IsKds { get; set; }
    public bool IsLabelPrinter { get; set; }
    public bool IsDinein { get; set; }
    public bool IsTakeaway { get; set; }
    public IReadOnlyList<int> AutoRedirectPrinterIdList { get; set; } = Array.Empty<int>();
}

public class UpsertDevicePrinterRequestDto
{
    public string PrinterName { get; set; } = string.Empty;
    public bool IsKds { get; set; }
    public bool IsLabelPrinter { get; set; }
    public bool IsDinein { get; set; } = true;
    public bool IsTakeaway { get; set; } = true;
    public IReadOnlyList<int> AutoRedirectPrinterIdList { get; set; } = Array.Empty<int>();
}

public class CashDrawerDto
{
    public string CashDrawerCode { get; set; } = string.Empty;
    public string CashDrawerName { get; set; } = string.Empty;
    public int ShopId { get; set; }
    public bool Enabled { get; set; }
}

public class UpsertCashDrawerRequestDto
{
    public string CashDrawerName { get; set; } = string.Empty;
}
