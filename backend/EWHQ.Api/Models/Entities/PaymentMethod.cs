#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("PaymentMethod")]
public class PaymentMethod
{
    [Key]
    [Column(Order = 0)]
    public int PaymentMethodId { get; set; }

    [MaxLength(10)]
    [Required]
    public string PaymentMethodCode { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string PaymentMethodName { get; set; } = string.Empty;

    public int DisplayIndex { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public bool? IsDrawerKick { get; set; }

    [MaxLength(100)]
    public string? LinkedGateway { get; set; }

    public bool? IsSystemUse { get; set; }

    public bool? IsTipEnabled { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? PaymentMethodSurchargeRate { get; set; }

    public bool? IsNonSalesPayment { get; set; }

    public bool? IsCashPayment { get; set; }

    public bool? IsFixedAmount { get; set; }

    public bool? IsBalancedWithinItem { get; set; }

    public bool? IsBalancedWithinCategory { get; set; }

    public bool? IsSpecificItemExist { get; set; }

    public bool? IsSpecificCategoryExist { get; set; }

    public bool? IsOverPaymentEnabled { get; set; }

    public bool? IsAutoRemarkEnabled { get; set; }

    [MaxLengthUnlimited]
    public string? IncludedItemIdList { get; set; }

    [MaxLengthUnlimited]
    public string? ExcludedItemIdList { get; set; }

    [MaxLengthUnlimited]
    public string? IncludedCategoryIdList { get; set; }

    [MaxLengthUnlimited]
    public string? ExcludedCategoryIdList { get; set; }

    public int? MaxUseCount { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? FixedAmount { get; set; }

    public bool? IsFxPayment { get; set; }

    public bool? IsPaymentChangeInFx { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TxChargesRate { get; set; }

    [MaxLength(2000)]
    public string? IncludedDiscountIdList { get; set; }

    [MaxLength(2000)]
    public string? ExcludedDiscountIdList { get; set; }

    [MaxLength(2000)]
    public string? IncludedMemberHeaderIdList { get; set; }

    [MaxLength(2000)]
    public string? ExcludedMemberHeaderIdList { get; set; }

    [MaxLength(300)]
    public string? RemarkFormats { get; set; }

}
