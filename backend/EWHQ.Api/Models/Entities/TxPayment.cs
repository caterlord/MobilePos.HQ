#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("TxPayment")]
public class TxPayment
{
    [Key]
    [Column(Order = 0)]
    public int TxPaymentId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int TxSalesHeaderId { get; set; }

    public int PaymentMethodId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal TotalAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal PaidAmount { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(10)]
    public string OclNum { get; set; }

    [Column(TypeName = "decimal(10, 1)")]
    public decimal? OclRemainValue { get; set; }

    [MaxLength(10)]
    public string OclDeviceNum { get; set; }

    [MaxLength(1000)]
    public string RefNum { get; set; }

    [MaxLengthUnlimited]
    public string Remark1 { get; set; }

    [MaxLength(1000)]
    public string Remark2 { get; set; }

    [MaxLength(1000)]
    public string Remark3 { get; set; }

    [MaxLength(1000)]
    public string Remark4 { get; set; }

    [MaxLength(1000)]
    public string Remark5 { get; set; }

    [MaxLength(1000)]
    public string Remark6 { get; set; }

    [MaxLength(1000)]
    public string Remark7 { get; set; }

    [MaxLength(1000)]
    public string Remark8 { get; set; }

    [MaxLength(1000)]
    public string Remark9 { get; set; }

    [MaxLength(1000)]
    public string Remark10 { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? ChangeAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? CashoutAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TipAmount { get; set; }

    public bool? IsDepositPayment { get; set; }

    public int? DepositReceivedByUserId { get; set; }

    [MaxLength(50)]
    public string DepositReceivedByUserName { get; set; }

    public DateTime? DepositReceivedDatetime { get; set; }

    public int? DepositWorkdayDetailId { get; set; }

    public int? DepositWorkdayPeriodDetailId { get; set; }

    [MaxLength(50)]
    public string DepositWorkdayPeriodName { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? PaymentMethodSurchargeAmount { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? PaymentMethodSurchargeRate { get; set; }

    public bool? IsNonSalesTxPayment { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? OverpaymentAmount { get; set; }

    public bool? IsPreprintedCouponTxPayment { get; set; }

    [MaxLength(1000)]
    public string PaymentRemark { get; set; }

    [MaxLength(50)]
    public string PaymentCurrency { get; set; }

    [MaxLength(50)]
    public string PaymentPathway { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PaidAmountFx { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? ChangeAmountFx { get; set; }

    public bool? IsFxPayment { get; set; }

    public bool? IsChangeAmountFx { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PaymentFxRate { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TotalAmountFx { get; set; }

    [MaxLength(10)]
    public string PaymentMethodCode { get; set; }

    [MaxLength(50)]
    public string PaymentMethodName { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TxChargesRate { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TxTotalCharges { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TxTipCharges { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TxNetTotal { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TxNetTip { get; set; }

    public bool? IsOdoTx { get; set; }

    public bool? IsOnlinePayment { get; set; }

}
