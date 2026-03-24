using System;
using System.Collections.Generic;

namespace EWHQ.Api.DTOs;

public class StoreSettingsShopDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

public class StoreInfoSettingsDto
{
    public int ShopId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AltName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string AltDesc { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string AddressLine2 { get; set; } = string.Empty;
    public string AddressLine3 { get; set; } = string.Empty;
    public string AddressLine4 { get; set; } = string.Empty;
    public string AltAddressLine1 { get; set; } = string.Empty;
    public string AltAddressLine2 { get; set; } = string.Empty;
    public string AltAddressLine3 { get; set; } = string.Empty;
    public string AltAddressLine4 { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Telephone { get; set; } = string.Empty;
    public string Fax { get; set; } = string.Empty;
    public string IntCallingCode { get; set; } = string.Empty;
    public string Contact1 { get; set; } = string.Empty;
    public string ContactTitle1 { get; set; } = string.Empty;
    public string Contact2 { get; set; } = string.Empty;
    public string ContactTitle2 { get; set; } = string.Empty;
    public string ShopCode { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
    public string AddressForDelivery { get; set; } = string.Empty;
    public decimal? AddressLat { get; set; }
    public decimal? AddressLong { get; set; }
    public string IanaTimeZone { get; set; } = string.Empty;
    public int? TimeZoneId { get; set; }
    public decimal? TimeZoneValue { get; set; }
    public bool? TimeZoneUseDaylightTime { get; set; }
    public bool Enabled { get; set; }
}

public class UpdateStoreInfoSettingsRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string AltName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string AltDesc { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string AddressLine2 { get; set; } = string.Empty;
    public string AddressLine3 { get; set; } = string.Empty;
    public string AddressLine4 { get; set; } = string.Empty;
    public string AltAddressLine1 { get; set; } = string.Empty;
    public string AltAddressLine2 { get; set; } = string.Empty;
    public string AltAddressLine3 { get; set; } = string.Empty;
    public string AltAddressLine4 { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Telephone { get; set; } = string.Empty;
    public string Fax { get; set; } = string.Empty;
    public string IntCallingCode { get; set; } = string.Empty;
    public string Contact1 { get; set; } = string.Empty;
    public string ContactTitle1 { get; set; } = string.Empty;
    public string Contact2 { get; set; } = string.Empty;
    public string ContactTitle2 { get; set; } = string.Empty;
    public string ShopCode { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
    public string AddressForDelivery { get; set; } = string.Empty;
    public decimal? AddressLat { get; set; }
    public decimal? AddressLong { get; set; }
    public string IanaTimeZone { get; set; } = string.Empty;
    public int? TimeZoneId { get; set; }
    public decimal? TimeZoneValue { get; set; }
    public bool? TimeZoneUseDaylightTime { get; set; }
    public bool Enabled { get; set; }
}

public class StoreWorkdayEntryDto
{
    public int WorkdayHeaderId { get; set; }
    public string Day { get; set; } = string.Empty;
    public TimeSpan OpenTime { get; set; }
    public TimeSpan CloseTime { get; set; }
    public int DayDelta { get; set; }
    public bool Enabled { get; set; }
}

public class UpdateStoreWorkdayRequestDto
{
    public IReadOnlyList<StoreWorkdayEntryDto> Entries { get; set; } = Array.Empty<StoreWorkdayEntryDto>();
}

public class StoreWorkdayPeriodDto
{
    public int WorkdayPeriodId { get; set; }
    public int WorkdayHeaderId { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public TimeSpan FromTime { get; set; }
    public TimeSpan ToTime { get; set; }
    public int DayDelta { get; set; }
    public bool Enabled { get; set; }
    public int? WorkdayPeriodMasterId { get; set; }
}

public class ReplaceStoreWorkdayPeriodsRequestDto
{
    public IReadOnlyList<StoreWorkdayPeriodDto> Periods { get; set; } = Array.Empty<StoreWorkdayPeriodDto>();
}

public class StoreServiceAreaDto
{
    public int ZoneId { get; set; }
    public string ZoneName { get; set; } = string.Empty;
    public int ZoneTypeId { get; set; }
    public int DeliveryShopId { get; set; }
    public decimal MinAmount { get; set; }
    public decimal DeliveryFee { get; set; }
    public string Shape { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string ShapeType { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

public class ReplaceStoreServiceAreasRequestDto
{
    public IReadOnlyList<StoreServiceAreaDto> Areas { get; set; } = Array.Empty<StoreServiceAreaDto>();
}

public class StoreSystemParameterDto
{
    public int ParamId { get; set; }
    public string ParamCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ParamValue { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

public class UpsertStoreSystemParameterDto
{
    public string Description { get; set; } = string.Empty;
    public string ParamValue { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
}

public class StoreSettingsSnapshotDto
{
    public int ShopId { get; set; }
    public IReadOnlyList<StoreWorkdayEntryDto> WorkdayEntries { get; set; } = Array.Empty<StoreWorkdayEntryDto>();
    public IReadOnlyList<StoreServiceAreaDto> ServiceAreas { get; set; } = Array.Empty<StoreServiceAreaDto>();
    public IReadOnlyList<StoreSystemParameterDto> SystemParameters { get; set; } = Array.Empty<StoreSystemParameterDto>();
}

public class StoreSettingsAuditLogDto
{
    public int LogId { get; set; }
    public int ShopId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string ActionName { get; set; } = string.Empty;
    public string ActionRefId { get; set; } = string.Empty;
    public string ActionRefDescription { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string ActionUserName { get; set; } = string.Empty;
    public DateTime LoggedAt { get; set; }
}

// ── Workday Period Master ──

public class WorkdayPeriodMasterDto
{
    public int WorkdayPeriodMasterId { get; set; }
    public int AccountId { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public string PeriodCode { get; set; } = string.Empty;
    public TimeSpan? DefaultFromTime { get; set; }
    public TimeSpan? DefaultToTime { get; set; }
    public int? DayDelta { get; set; }
    public bool Enabled { get; set; }
    public int UsageCount { get; set; }
}

public class UpsertWorkdayPeriodMasterDto
{
    public string PeriodName { get; set; } = string.Empty;
    public string PeriodCode { get; set; } = string.Empty;
    public TimeSpan? DefaultFromTime { get; set; }
    public TimeSpan? DefaultToTime { get; set; }
    public int? DayDelta { get; set; }
}
