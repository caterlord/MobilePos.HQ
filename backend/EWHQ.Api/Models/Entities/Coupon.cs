using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("Coupon")]
public class Coupon
{
    public int AccountId { get; set; }

    public int CouponCampaignId { get; set; }

    [MaxLength(20)]
    [Required]
    public string CouponCode { get; set; } = string.Empty;

    public int Status { get; set; }

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
    public string QRCodeImageUrl { get; set; } = null!;

    public DateTime? ValidDateFrom { get; set; }

    public DateTime? ValidDateTo { get; set; }

    [MaxLength(100)]
    public string NumericCouponCode { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? FaceValue { get; set; }

    public int UseCount { get; set; }

}
