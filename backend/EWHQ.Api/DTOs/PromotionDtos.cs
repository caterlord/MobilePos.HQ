using System;

namespace EWHQ.Api.DTOs;

public class PromotionSummaryDto
{
    public int PromoHeaderId { get; set; }
    public int AccountId { get; set; }
    public int? BundlePromoOverviewId { get; set; }
    public int BundlePromoHeaderTypeId { get; set; }
    public string PromoCode { get; set; } = string.Empty;
    public string PromoName { get; set; } = string.Empty;
    public string? BundlePromoDesc { get; set; }
    public decimal PromoSaveAmount { get; set; }
    public int? Priority { get; set; }
    public bool Enabled { get; set; }
    public bool IsAvailable { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class UpsertPromotionDto
{
    public string PromoCode { get; set; } = string.Empty;
    public string PromoName { get; set; } = string.Empty;
    public string? BundlePromoDesc { get; set; }
    public int BundlePromoHeaderTypeId { get; set; }
    public decimal PromoSaveAmount { get; set; }
    public int? Priority { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsAvailable { get; set; } = true;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
}

public class PromotionRuleDetailDto
{
    public int? PromoDetailId { get; set; }
    public int BundlePromoDetailTypeId { get; set; }
    public int? SelectedCategoryId { get; set; }
    public int? SelectedItemId { get; set; }
    public decimal? SpecificPrice { get; set; }
    public int BundleDeductRuleTypeId { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsOptionalItem { get; set; } = false;
    public bool IsReplaceItem { get; set; } = false;
    public bool IsItemCanReplace { get; set; } = false;
    public decimal? PriceReplace { get; set; }
    public int? GroupIndex { get; set; }
    public bool IsDepartmentRevenue { get; set; } = false;
    public decimal? DepartmentRevenue { get; set; }
}

public class PromotionRuleDetailGroupDto
{
    public int GroupIndex { get; set; }
    public IReadOnlyList<PromotionRuleDetailDto> Details { get; set; } = Array.Empty<PromotionRuleDetailDto>();
}

public class PromotionShopRuleDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

public class PromotionRuleEditorDto
{
    public int PromoHeaderId { get; set; }
    public int AccountId { get; set; }
    public int? BundlePromoOverviewId { get; set; }
    public int BundlePromoHeaderTypeId { get; set; }
    public string PromoCode { get; set; } = string.Empty;
    public string PromoName { get; set; } = string.Empty;
    public string? BundlePromoDesc { get; set; }
    public decimal PromoSaveAmount { get; set; }
    public int? Priority { get; set; }
    public bool Enabled { get; set; }
    public bool IsAvailable { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public bool IsCoexistPromo { get; set; }
    public bool IsAmountDeductEvenly { get; set; }
    public bool IsPromoDetailMatchMustExist { get; set; }
    public decimal? FlatPrice { get; set; }
    public string DayOfWeeks { get; set; } = string.Empty;
    public string Months { get; set; } = string.Empty;
    public string Dates { get; set; } = string.Empty;
    public IReadOnlyList<PromotionRuleDetailDto> MandatoryDetails { get; set; } = Array.Empty<PromotionRuleDetailDto>();
    public IReadOnlyList<PromotionRuleDetailGroupDto> OptionalDetailGroups { get; set; } = Array.Empty<PromotionRuleDetailGroupDto>();
    public IReadOnlyList<PromotionShopRuleDto> ShopRules { get; set; } = Array.Empty<PromotionShopRuleDto>();
}

public class UpdatePromotionRuleEditorDto
{
    public int BundlePromoHeaderTypeId { get; set; }
    public string PromoCode { get; set; } = string.Empty;
    public string PromoName { get; set; } = string.Empty;
    public string? BundlePromoDesc { get; set; }
    public decimal PromoSaveAmount { get; set; }
    public int? Priority { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsAvailable { get; set; } = true;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public bool IsCoexistPromo { get; set; } = false;
    public bool IsAmountDeductEvenly { get; set; } = false;
    public bool IsPromoDetailMatchMustExist { get; set; } = false;
    public decimal? FlatPrice { get; set; }
    public string? DayOfWeeks { get; set; }
    public string? Months { get; set; }
    public string? Dates { get; set; }
    public IReadOnlyList<PromotionRuleDetailDto> MandatoryDetails { get; set; } = Array.Empty<PromotionRuleDetailDto>();
    public IReadOnlyList<PromotionRuleDetailGroupDto> OptionalDetailGroups { get; set; } = Array.Empty<PromotionRuleDetailGroupDto>();
    public IReadOnlyList<PromotionShopRuleDto> ShopRules { get; set; } = Array.Empty<PromotionShopRuleDto>();
}
