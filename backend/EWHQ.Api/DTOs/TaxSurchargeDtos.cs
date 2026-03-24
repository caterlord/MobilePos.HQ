using System;
using System.Collections.Generic;

namespace EWHQ.Api.DTOs;

// ── Shared ──

public class TaxShopRuleDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

// ── Taxation ──

public class TaxationSummaryDto
{
    public int TaxationId { get; set; }
    public int AccountId { get; set; }
    public string TaxationCode { get; set; } = string.Empty;
    public string TaxationName { get; set; } = string.Empty;
    public int Priority { get; set; }
    public decimal? TaxationPercent { get; set; }
    public bool IsFixedAmount { get; set; }
    public decimal? TaxationAmount { get; set; }
    public bool Enabled { get; set; }
    public bool IsAutoCalculate { get; set; }
    public bool IsOpenAmount { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class TaxationDetailDto
{
    public int TaxationId { get; set; }
    public int AccountId { get; set; }
    public string TaxationCode { get; set; } = string.Empty;
    public string TaxationName { get; set; } = string.Empty;
    public int Priority { get; set; }
    public decimal? TaxationPercent { get; set; }
    public bool IsFixedAmount { get; set; }
    public decimal? TaxationAmount { get; set; }
    public bool IsDateSpecific { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public bool Enabled { get; set; }
    public bool IsAutoCalculate { get; set; }
    public bool IsOpenAmount { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
    public IReadOnlyList<TaxShopRuleDto> ShopRules { get; set; } = Array.Empty<TaxShopRuleDto>();
}

public class UpsertTaxationDto
{
    public string TaxationCode { get; set; } = string.Empty;
    public string TaxationName { get; set; } = string.Empty;
    public int Priority { get; set; }
    public decimal? TaxationPercent { get; set; }
    public bool IsFixedAmount { get; set; }
    public decimal? TaxationAmount { get; set; }
    public bool IsDateSpecific { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public bool IsAutoCalculate { get; set; }
    public bool IsOpenAmount { get; set; }
    public IReadOnlyList<TaxShopRuleDto>? ShopRules { get; set; }
}

// ── Surcharge (ServiceCharge) ──

public class SurchargeSummaryDto
{
    public int ServiceChargeId { get; set; }
    public int AccountId { get; set; }
    public string ServiceChargeCode { get; set; } = string.Empty;
    public string ServiceChargeName { get; set; } = string.Empty;
    public int Priority { get; set; }
    public decimal? ServiceChargePercent { get; set; }
    public bool IsFixedAmount { get; set; }
    public decimal? ServiceChargeAmount { get; set; }
    public bool Enabled { get; set; }
    public bool IsAutoCalculate { get; set; }
    public bool IsOpenAmount { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class SurchargeDetailDto
{
    public int ServiceChargeId { get; set; }
    public int AccountId { get; set; }
    public string ServiceChargeCode { get; set; } = string.Empty;
    public string ServiceChargeName { get; set; } = string.Empty;
    public int Priority { get; set; }
    public decimal? ServiceChargePercent { get; set; }
    public bool IsFixedAmount { get; set; }
    public decimal? ServiceChargeAmount { get; set; }
    public bool IsDateSpecific { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public bool Enabled { get; set; }
    public bool IsAutoCalculate { get; set; }
    public bool IsOpenAmount { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
    public IReadOnlyList<TaxShopRuleDto> ShopRules { get; set; } = Array.Empty<TaxShopRuleDto>();
}

public class UpsertSurchargeDto
{
    public string ServiceChargeCode { get; set; } = string.Empty;
    public string ServiceChargeName { get; set; } = string.Empty;
    public int Priority { get; set; }
    public decimal? ServiceChargePercent { get; set; }
    public bool IsFixedAmount { get; set; }
    public decimal? ServiceChargeAmount { get; set; }
    public bool IsDateSpecific { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public bool IsAutoCalculate { get; set; }
    public bool IsOpenAmount { get; set; }
    public IReadOnlyList<TaxShopRuleDto>? ShopRules { get; set; }
}
