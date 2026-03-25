using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("CouponCampaignDistShopMapping")]
public class CouponCampaignDistShopMapping
{
    public int AccountId { get; set; }

    public int CouponCampaignId { get; set; }

    public int ShopId { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? IsSubscriptionSuspended { get; set; }

}
