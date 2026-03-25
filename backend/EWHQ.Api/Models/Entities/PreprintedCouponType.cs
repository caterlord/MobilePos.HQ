#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("PreprintedCouponType")]
public class PreprintedCouponType
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int CouponTypeId { get; set; }

    [MaxLength(200)]
    [Required]
    public string CouponTypeName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string CouponPrefix { get; set; }

    public int LinkedItemId { get; set; }

    public int? PaymentMethodId { get; set; }

    [MaxLengthUnlimited]
    public string MandatoryIncludedItemIdList { get; set; }

    [MaxLengthUnlimited]
    public string MandatoryIncludedCategoryIdList { get; set; }

    [MaxLengthUnlimited]
    public string MandatoryExcludedItemIdList { get; set; }

    [MaxLengthUnlimited]
    public string MandatoryExcludedCategoryIdList { get; set; }

    public bool IsPublicDisplay { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? IsOnlineCoupon { get; set; }

}
