using System;
using System.Collections.Generic;

namespace EWHQ.Api.DTOs;

public class DiscountSummaryDto
{
    public int DiscountId { get; set; }
    public int AccountId { get; set; }
    public int? BundlePromoOverviewId { get; set; }
    public int BundlePromoHeaderTypeId { get; set; }
    public string DiscountCode { get; set; } = string.Empty;
    public string DiscountName { get; set; } = string.Empty;
    public string? BundlePromoDesc { get; set; }
    public bool IsFixedAmount { get; set; }
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public int Priority { get; set; }
    public bool Enabled { get; set; }
    public bool IsAvailable { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class UpsertDiscountDto
{
    public string DiscountCode { get; set; } = string.Empty;
    public string DiscountName { get; set; } = string.Empty;
    public string? BundlePromoDesc { get; set; }
    public int BundlePromoHeaderTypeId { get; set; }
    public bool IsFixedAmount { get; set; } = false;
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public int Priority { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsAvailable { get; set; } = true;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
}

public class DiscountShopRuleDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

public class DiscountRuleEditorDto
{
    public int DiscountId { get; set; }
    public int AccountId { get; set; }
    public int? BundlePromoOverviewId { get; set; }
    public int BundlePromoHeaderTypeId { get; set; }
    public string DiscountCode { get; set; } = string.Empty;
    public string DiscountName { get; set; } = string.Empty;
    public string? BundlePromoDesc { get; set; }
    public int Priority { get; set; }
    public bool Enabled { get; set; }
    public bool IsAvailable { get; set; }
    public bool IsDateSpecific { get; set; }
    public bool IsAutoCalculate { get; set; }
    public bool IsOpenAmount { get; set; }
    public bool IsFixedAmount { get; set; }
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public bool IsNoOtherLoyalty { get; set; }
    public IReadOnlyList<int> MandatoryIncludedCategoryIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryIncludedItemIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryIncludedModifierItemIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryExcludedCategoryIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryExcludedItemIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryExcludedModifierItemIds { get; set; } = Array.Empty<int>();
    public decimal? PriceSpecific { get; set; }
    public decimal? PriceHigherThanEqualToSpecific { get; set; }
    public decimal? PriceLowerThanEqualToSpecific { get; set; }
    public bool IsLinkedWithThirdPartyLoyalty { get; set; }
    public string? LinkedThirdPartyLoyaltyCode { get; set; }
    public bool IsAppliedOnItemLevel { get; set; }
    public int? UpgradeModifierItemId { get; set; }
    public string? DiscountTag { get; set; }
    public string? DiscountBenefitModifierAmountAdjustment { get; set; }
    public decimal? MinOrderAmount { get; set; }
    public decimal? MaxOrderAmount { get; set; }
    public decimal? MinMatchedItemAmount { get; set; }
    public decimal? MaxMatchedItemAmount { get; set; }
    public decimal? MinMatchedItemQty { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public decimal? MaxDiscountQty { get; set; }
    public decimal? DiscountFirstQty { get; set; }
    public string ConditionalDayOfWeeks { get; set; } = string.Empty;
    public string ConditionalMonths { get; set; } = string.Empty;
    public string ConditionalDates { get; set; } = string.Empty;
    public DateTime? ConditionalStartDate { get; set; }
    public DateTime? ConditionalEndDate { get; set; }
    public TimeSpan? ConditionalStartTime { get; set; }
    public TimeSpan? ConditionalEndTime { get; set; }
    public bool CalculateIncludedSubItems { get; set; }
    public bool MatchMultiple { get; set; }
    public IReadOnlyList<int> DiscountedCategoryIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> DiscountedItemIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> DiscountedModifierItemIds { get; set; } = Array.Empty<int>();
    public bool DiscountedItemPriceOrderDescending { get; set; }
    public IReadOnlyList<int> PromoHeaderIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<DiscountShopRuleDto> ShopRules { get; set; } = Array.Empty<DiscountShopRuleDto>();
}

public class UpdateDiscountRuleEditorDto
{
    public int BundlePromoHeaderTypeId { get; set; }
    public string DiscountCode { get; set; } = string.Empty;
    public string DiscountName { get; set; } = string.Empty;
    public string? BundlePromoDesc { get; set; }
    public int Priority { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsAvailable { get; set; } = true;
    public bool IsAutoCalculate { get; set; }
    public bool IsFixedAmount { get; set; }
    public bool IsOpenAmount { get; set; }
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public bool IsNoOtherLoyalty { get; set; }
    public IReadOnlyList<int> MandatoryIncludedCategoryIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryIncludedItemIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryIncludedModifierItemIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryExcludedCategoryIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryExcludedItemIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> MandatoryExcludedModifierItemIds { get; set; } = Array.Empty<int>();
    public decimal? PriceSpecific { get; set; }
    public decimal? PriceHigherThanEqualToSpecific { get; set; }
    public decimal? PriceLowerThanEqualToSpecific { get; set; }
    public bool IsLinkedWithThirdPartyLoyalty { get; set; }
    public string? LinkedThirdPartyLoyaltyCode { get; set; }
    public bool IsAppliedOnItemLevel { get; set; }
    public int? UpgradeModifierItemId { get; set; }
    public string? DiscountTag { get; set; }
    public string? DiscountBenefitModifierAmountAdjustment { get; set; }
    public decimal? MinOrderAmount { get; set; }
    public decimal? MaxOrderAmount { get; set; }
    public decimal? MinMatchedItemAmount { get; set; }
    public decimal? MaxMatchedItemAmount { get; set; }
    public decimal? MinMatchedItemQty { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public decimal? MaxDiscountQty { get; set; }
    public decimal? DiscountFirstQty { get; set; }
    public string? ConditionalDayOfWeeks { get; set; }
    public string? ConditionalMonths { get; set; }
    public string? ConditionalDates { get; set; }
    public DateTime? ConditionalStartDate { get; set; }
    public DateTime? ConditionalEndDate { get; set; }
    public TimeSpan? ConditionalStartTime { get; set; }
    public TimeSpan? ConditionalEndTime { get; set; }
    public bool CalculateIncludedSubItems { get; set; }
    public bool MatchMultiple { get; set; }
    public IReadOnlyList<int> DiscountedCategoryIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> DiscountedItemIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<int> DiscountedModifierItemIds { get; set; } = Array.Empty<int>();
    public bool DiscountedItemPriceOrderDescending { get; set; }
    public IReadOnlyList<int> PromoHeaderIds { get; set; } = Array.Empty<int>();
    public IReadOnlyList<DiscountShopRuleDto> ShopRules { get; set; } = Array.Empty<DiscountShopRuleDto>();
}
