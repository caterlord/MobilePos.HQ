#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("TxSalesHeader")]
public class TxSalesHeader
{
    [Key]
    [Column(Order = 0)]
    public int TxSalesHeaderId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [MaxLength(50)]
    [Required]
    public string TxCode { get; set; } = string.Empty;

    public DateTime TxDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ReceiptNo { get; set; } = string.Empty;

    public bool IsCurrentTx { get; set; }

    public bool Voided { get; set; }

    public bool Enabled { get; set; }

    public int TableId { get; set; }

    [MaxLength(10)]
    [Required]
    public string TableCode { get; set; } = string.Empty;

    public int? PreviousTableId { get; set; }

    [MaxLength(10)]
    public string PreviousTableCode { get; set; }

    public int SectionId { get; set; }

    [MaxLength(50)]
    [Required]
    public string SectionName { get; set; } = string.Empty;

    public DateTime? CheckinDatetime { get; set; }

    public DateTime? CheckoutDatetime { get; set; }

    public int? CheckinUserId { get; set; }

    [MaxLength(50)]
    public string CheckinUserName { get; set; }

    public int? CheckoutUserId { get; set; }

    [MaxLength(50)]
    public string CheckoutUserName { get; set; }

    public int? CashierUserId { get; set; }

    [MaxLength(50)]
    public string CashierUserName { get; set; }

    public DateTime? CashierDatetime { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountPaid { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountChange { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal AmountSubtotal { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal AmountServiceCharge { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal AmountDiscount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal AmountTotal { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal AmountRounding { get; set; }

    public bool TxCompleted { get; set; }

    public bool TxChecked { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsTakeAway { get; set; }

    public int? TakeAwayRunningIndex { get; set; }

    public int? DisabledReasonId { get; set; }

    [MaxLength(500)]
    public string DisabledReasonDesc { get; set; }

    public int? DisabledByUserId { get; set; }

    [MaxLength(50)]
    public string DisabledByUserName { get; set; }

    public DateTime? DisabledDateTime { get; set; }

    public int? WorkdayPeriodDetailId { get; set; }

    [MaxLength(50)]
    public string WorkdayPeriodName { get; set; }

    public int? DiscountId { get; set; }

    [MaxLength(200)]
    public string DiscountName { get; set; }

    [MaxLength(10)]
    public string CashDrawerCode { get; set; }

    public int ReceiptPrintCount { get; set; }

    public int TxRevokeCount { get; set; }

    public int? ServiceChargeId { get; set; }

    [MaxLength(50)]
    public string ServiceChargeName { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal AmountTips { get; set; }

    public bool? IsTimeLimited { get; set; }

    public int? TimeLimitedMinutes { get; set; }

    public int? CusCount { get; set; }

    public int? DiscountByUserId { get; set; }

    [MaxLength(50)]
    public string DiscountByUserName { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountPointTotal { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MemberPointRemain { get; set; }

    public int? TaxationId { get; set; }

    [MaxLength(200)]
    public string TaxationName { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountTaxation { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountMinChargeOffset { get; set; }

    public bool? IsMinChargeOffsetWaived { get; set; }

    public bool? IsMinChargeTx { get; set; }

    public bool? IsMinChargePerHead { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MinChargeAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MinChargeMemberAmount { get; set; }

    public bool? IsPrepaidRechargeTx { get; set; }

    public bool? IsInvoicePrintPending { get; set; }

    public int? InvoiceNum { get; set; }

    public int? OrderNum { get; set; }

    public bool? IsDepositTx { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TotalDepositAmount { get; set; }

    [MaxLength(4000)]
    public string DepositRemark { get; set; }

    public bool? IsDepositOutstanding { get; set; }

    public bool? IsReturnTx { get; set; }

    public bool? HasReturned { get; set; }

    public DateTime? ReturnedDateTime { get; set; }

    public int? ReturnedTxSalesHeaderId { get; set; }

    public int? NewTxSalesHeaderIdForReturn { get; set; }

    public int? ApiGatewayRefId { get; set; }

    [MaxLength(200)]
    public string ApiGatewayName { get; set; }

    [MaxLengthUnlimited]
    public string ApiGatewayRefRemark { get; set; }

    [MaxLength(200)]
    public string TableRemark { get; set; }

    [MaxLength(4000)]
    public string TxSalesHeaderRemark { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TotalPaymentMethodSurchargeAmount { get; set; }

    public bool? IsNonSalesTx { get; set; }

    public bool? IsNoOtherLoyaltyTx { get; set; }

    public int? StartWorkdayPeriodDetailId { get; set; }

    [MaxLength(50)]
    public string StartWorkdayPeriodName { get; set; }

    public bool? IsTxOnHold { get; set; }

    public bool? IsOdoTx { get; set; }

    public Guid? OdoOrderToken { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountOverpayment { get; set; }

    public int? TxStatusId { get; set; }

    [MaxLength(50)]
    public string OverridedChecklistPrinterName { get; set; }

    public int? OrderSourceTypeId { get; set; }

    public int? OrderSourceRefId { get; set; }

    public int? OrderChannelId { get; set; }

    [MaxLength(50)]
    public string OrderChannelCode { get; set; }

    [MaxLength(200)]
    public string OrderChannelName { get; set; }

    [MaxLength(1000)]
    public string ApiGatewayRefCode { get; set; }

    [MaxLength(1000)]
    public string ApiGatewayResponseCode { get; set; }

    public DateTime? TableRemarkModifiedDate { get; set; }

}
