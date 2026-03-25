using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("CouponCampaignMemberUsedCount")]
public class CouponCampaignMemberUsedCount
{
    public int AccountId { get; set; }

    public int CouponCampaignId { get; set; }

    public int MemberDetailId { get; set; }

    public int UsedCount { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int? ShopId { get; set; }

    public int? TxSalesHeaderId { get; set; }

}
