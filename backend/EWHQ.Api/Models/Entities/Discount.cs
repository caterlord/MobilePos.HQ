#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("Discount")]
public class Discount
{
    [Key]
    [Column(Order = 0)]
    public int DiscountId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string DiscountCode { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string DiscountName { get; set; } = string.Empty;

    public int Priority { get; set; }

    public bool IsDateSpecific { get; set; }

    public bool IsFixedAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DiscountPercent { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DiscountAmount { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public TimeSpan? StartTime { get; set; }

    public TimeSpan? EndTime { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsAutoCalculate { get; set; }

    public bool IsOpenAmount { get; set; }

    public bool? IsSystemDiscount { get; set; }

    public bool? IsNoOtherLoyalty { get; set; }

    [MaxLength(4000)]
    public string? MandatoryIncludedCategoryIdList { get; set; }

    [MaxLength(4000)]
    public string? MandatoryIncludedItemIdList { get; set; }

    [MaxLength(4000)]
    public string? MandatoryIncludedModifierItemIdList { get; set; }

    [MaxLength(4000)]
    public string? MandatoryExcludedCategoryIdList { get; set; }

    [MaxLength(4000)]
    public string? MandatoryExcludedItemIdList { get; set; }

    [MaxLength(4000)]
    public string? MandatoryExcludedModifierItemIdList { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PriceSpecific { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PriceHigherThanEqualToSpecific { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PriceLowerThanEqualToSpecific { get; set; }

    public bool? IsLinkedWithThirdPartyLoyalty { get; set; }

    [MaxLength(50)]
    public string? LinkedThirdPartyLoyaltyCode { get; set; }

    public bool? IsAppliedOnItemLevel { get; set; }

    public int? UpgradeModifierItemId { get; set; }

    [MaxLength(500)]
    public string? DiscountTag { get; set; }

    [MaxLength(1000)]
    public string? DiscountBenefitModifierAmountAdjustment { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DiscountPrice { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TotalDiscountAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TotalAmount { get; set; }

    [MaxLength(4000)]
    public string? PromoHeaderIdList { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MinOrderAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MaxOrderAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MinMatchedItemAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MaxMatchedItemAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MinMatchedItemQty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MaxDiscountAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MaxDiscountQty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DiscountFirstQty { get; set; }

    [MaxLength(100)]
    public string? ConditionalDayOfWeeks { get; set; }

    [MaxLength(100)]
    public string? ConditionalMonths { get; set; }

    [MaxLength(150)]
    public string? ConditionalDates { get; set; }

    public DateTime? ConditionalStartDate { get; set; }

    public DateTime? ConditionalEndDate { get; set; }

    public TimeSpan? ConditionalStartTime { get; set; }

    public TimeSpan? ConditionalEndTime { get; set; }

    public bool? CalculateIncludedSubItems { get; set; }

    public bool? MatchMultiple { get; set; }

    [MaxLength(4000)]
    public string? DiscountedCategoryIdList { get; set; }

    [MaxLength(4000)]
    public string? DiscountedItemIdList { get; set; }

    [MaxLength(4000)]
    public string? DiscountedModifierItemIdList { get; set; }

    public bool? DiscountedItemPriceOrderDescending { get; set; }

}
