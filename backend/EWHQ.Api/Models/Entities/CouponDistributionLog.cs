#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("CouponDistributionLog")]
public class CouponDistributionLog
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int CouponDistributionLogId { get; set; }

    public int CouponCampaignId { get; set; }

    [MaxLength(500)]
    public string CampaignName { get; set; }

    public int? DistributionRuleTypeId { get; set; }

    [MaxLength(200)]
    public string QRCodeImageUrl { get; set; }

    [MaxLength(100)]
    public string FirstName { get; set; }

    [MaxLength(100)]
    public string LastName { get; set; }

    public int? MemberDetailId { get; set; }

    [MaxLength(200)]
    public string SocialMediaId { get; set; }

    public int? SocialMediaTypeId { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
