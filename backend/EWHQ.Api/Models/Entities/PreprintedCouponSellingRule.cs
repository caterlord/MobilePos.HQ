using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("PreprintedCouponSellingRule")]
public class PreprintedCouponSellingRule
{
    public int AccountId { get; set; }

    public int CouponTypeId { get; set; }

    public int Qty { get; set; }

    [Column(TypeName = "decimal(18, 3)")]
    public decimal DeductAmount { get; set; }

    public DateTime? EffectiveDatetimeFrom { get; set; }

    public DateTime? EffectiveDatetimeTo { get; set; }

    public int Seq { get; set; }

    public bool IsDiscountReflectInTotalSales { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(200)]
    public string DisocuntName { get; set; } = null!;

}
