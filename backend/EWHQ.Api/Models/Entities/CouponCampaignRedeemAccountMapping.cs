using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("CouponCampaignRedeemAccountMapping")]
public class CouponCampaignRedeemAccountMapping
{
    public int AccountId { get; set; }

    public int CouponCampaignId { get; set; }

    public int RedeemAccountId { get; set; }

    public bool IsAllowAllShop { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
