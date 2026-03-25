using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("CouponMemberWallet")]
public class CouponMemberWallet
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int MemberWalletCouponId { get; set; }

    public int CouponCampaignId { get; set; }

    public int MemberId { get; set; }

    [MaxLength(20)]
    [Required]
    public string CouponCode { get; set; } = string.Empty;

    public DateTime? RedeemedDate { get; set; }

    public int Status { get; set; }

    public DateTime? ValidateDurationStartDate { get; set; }

    public DateTime? ValidateDurationExpiryDate { get; set; }

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
    public string SocialMediaId { get; set; } = null!;

}
