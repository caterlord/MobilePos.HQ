#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("CouponCampaign")]
public class CouponCampaign
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int CouponCampaignId { get; set; }

    [MaxLength(50)]
    public string CampaignCode { get; set; }

    [MaxLength(500)]
    public string CampaignName { get; set; }

    [MaxLength(2000)]
    public string CampaignDesc { get; set; }

    public bool AllowMultipleUse { get; set; }

    public int UseCount { get; set; }

    public bool IsMemberLimited { get; set; }

    public bool IsMemberTypeLimited { get; set; }

    public bool IsRedeemShopLimited { get; set; }

    public int Status { get; set; }

    public int CouponTypeId { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string CampaignTnc { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? BenefitValue { get; set; }

    public int? BenefitTypeId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? BenefitPercentOff { get; set; }

    public int? BenefitItemId { get; set; }

    public bool? IsOnlineCampaign { get; set; }

    public bool? IsOfflineCampaign { get; set; }

    public int? DistributionRuleTypeId { get; set; }

    public int? DistributionQty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DistributionSpendingAmount { get; set; }

    public int? DistributionCategoryId { get; set; }

    public int? DistributionItemId { get; set; }

    public int? DistributionDayLength { get; set; }

    public DateTime? DistributeDateFrom { get; set; }

    public DateTime? DistributeDateTo { get; set; }

    public TimeSpan? DistributeTimeFrom { get; set; }

    public TimeSpan? DistributeTimeTo { get; set; }

    public bool? IsDistributedShopLimited { get; set; }

    public bool? IsRedemptionMemberOnly { get; set; }

    public bool? IsRedemptionHasMinSpend { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? RedemptionMinSpendAmount { get; set; }

    public bool? IsRedemptionCanExistWithOtherCoupon { get; set; }

    public bool? IsRedemptionHasExpiryDay { get; set; }

    public int? RedemptionExpireInDay { get; set; }

    public DateTime? RedemptionDateFrom { get; set; }

    public DateTime? RedemptionDateTo { get; set; }

    public TimeSpan? RedemptionTimeFrom { get; set; }

    public TimeSpan? RedemptionTimeTo { get; set; }

    public bool? IsDistributionRepeat { get; set; }

    public bool? IsDistributionGroupedCoupon { get; set; }

    public int? RedemptionStartInDay { get; set; }

    public bool? IsSubscriptionSuspended { get; set; }

    public int MaxUsedCount { get; set; }

    [MaxLengthUnlimited]
    public string BenefitExtraInfo { get; set; }

}
