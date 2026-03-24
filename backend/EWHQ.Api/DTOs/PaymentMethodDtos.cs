using System;
using System.Collections.Generic;

namespace EWHQ.Api.DTOs;

public class PaymentMethodSummaryDto
{
    public int PaymentMethodId { get; set; }
    public int AccountId { get; set; }
    public string PaymentMethodCode { get; set; } = string.Empty;
    public string PaymentMethodName { get; set; } = string.Empty;
    public int DisplayIndex { get; set; }
    public bool Enabled { get; set; }
    public bool? IsDrawerKick { get; set; }
    public bool? IsTipEnabled { get; set; }
    public bool? IsNonSalesPayment { get; set; }
    public bool? IsCashPayment { get; set; }
    public decimal? PaymentMethodSurchargeRate { get; set; }
    public string? LinkedGateway { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class PaymentMethodDetailDto
{
    public int PaymentMethodId { get; set; }
    public int AccountId { get; set; }
    public string PaymentMethodCode { get; set; } = string.Empty;
    public string PaymentMethodName { get; set; } = string.Empty;
    public int DisplayIndex { get; set; }
    public bool Enabled { get; set; }
    public bool? IsDrawerKick { get; set; }
    public bool? IsTipEnabled { get; set; }
    public bool? IsNonSalesPayment { get; set; }
    public bool? IsCashPayment { get; set; }
    public bool? IsFixedAmount { get; set; }
    public decimal? FixedAmount { get; set; }
    public bool? IsOverPaymentEnabled { get; set; }
    public bool? IsFxPayment { get; set; }
    public bool? IsAutoRemarkEnabled { get; set; }
    public decimal? PaymentMethodSurchargeRate { get; set; }
    public decimal? TxChargesRate { get; set; }
    public string? LinkedGateway { get; set; }
    public string? RemarkFormats { get; set; }
    public int? MaxUseCount { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
    public IReadOnlyList<PaymentMethodShopRuleDto> ShopRules { get; set; } = Array.Empty<PaymentMethodShopRuleDto>();
}

public class PaymentMethodShopRuleDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public decimal? PaymentFxRate { get; set; }
}

public class UpsertPaymentMethodDto
{
    public string PaymentMethodCode { get; set; } = string.Empty;
    public string PaymentMethodName { get; set; } = string.Empty;
    public int DisplayIndex { get; set; }
    public bool? IsDrawerKick { get; set; }
    public bool? IsTipEnabled { get; set; }
    public bool? IsNonSalesPayment { get; set; }
    public bool? IsCashPayment { get; set; }
    public bool? IsFixedAmount { get; set; }
    public decimal? FixedAmount { get; set; }
    public bool? IsOverPaymentEnabled { get; set; }
    public bool? IsFxPayment { get; set; }
    public bool? IsAutoRemarkEnabled { get; set; }
    public decimal? PaymentMethodSurchargeRate { get; set; }
    public decimal? TxChargesRate { get; set; }
    public string? LinkedGateway { get; set; }
    public string? RemarkFormats { get; set; }
    public int? MaxUseCount { get; set; }
    public IReadOnlyList<PaymentMethodShopRuleDto>? ShopRules { get; set; }
}
