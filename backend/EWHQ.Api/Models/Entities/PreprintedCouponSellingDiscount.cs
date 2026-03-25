#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("PreprintedCouponSellingDiscount")]
public class PreprintedCouponSellingDiscount
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int CouponSellingDiscountId { get; set; }

    public int Qty { get; set; }

    public bool IsOpenAmount { get; set; }

    public bool IsFixedAmount { get; set; }

    [Column(TypeName = "decimal(18, 3)")]
    public decimal DeductAmount { get; set; }

    public bool IsPercentage { get; set; }

    public int? DeductPercentage { get; set; }

    public DateTime? EffectiveDatetimeFrom { get; set; }

    public DateTime? EffectiveDatetimeTo { get; set; }

    public int Seq { get; set; }

    public bool IsDiscountReflectInTotalSales { get; set; }

    public bool Enabled { get; set; }

    public bool IsNeedManagerApproval { get; set; }

    public bool IsNeedMemberLogin { get; set; }

    public bool IsForPhysicalCoupon { get; set; }

    public bool IsForOnlineCoupon { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(200)]
    public string DisocuntName { get; set; }

    public bool IsAccumulateDiscountAmountByQty { get; set; }

    public bool IsPublicDisplay { get; set; }

}
