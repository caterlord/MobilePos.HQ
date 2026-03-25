using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("CouponRedeemLog")]
public class CouponRedeemLog
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int CouponRedeemLogId { get; set; }

    public int? ConsumedAccountId { get; set; }

    public int ConsumedShopId { get; set; }

    public int CouponCampaignId { get; set; }

    [MaxLength(20)]
    [Required]
    public string CouponCode { get; set; } = string.Empty;

    public int? RedeemedMemberId { get; set; }

    public DateTime RedeemedDate { get; set; }

    public int? TxSalesHeaderId { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
