using System.ComponentModel.DataAnnotations;

namespace EWHQ.Api.DTOs;

public class MenuItemSummaryDto
{
    public int ItemId { get; set; }
    public int AccountId { get; set; }
    public int CategoryId { get; set; }
    public int DepartmentId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string? ItemName { get; set; }
    public string? ItemNameAlt { get; set; }
    public string? ItemPosName { get; set; }
    public string? ItemPosNameAlt { get; set; }
    public bool Enabled { get; set; }
    public bool IsItemShow { get; set; }
    public bool IsPriceShow { get; set; }
    public bool HasModifier { get; set; }
    public bool IsModifier { get; set; }
    public bool IsFollowSet { get; set; }
    public bool IsFollowSetDynamic { get; set; }
    public bool IsFollowSetStandard { get; set; }
    public bool IsPromoItem { get; set; }
    public bool IsManualPrice { get; set; }
    public bool IsManualName { get; set; }
    public bool IsNonDiscountItem { get; set; }
    public bool IsNonServiceChargeItem { get; set; }
    public bool? IsPointPaidItem { get; set; }
    public bool? IsNoPointEarnItem { get; set; }
    public bool? IsNonTaxableItem { get; set; }
    public bool? IsComboRequired { get; set; }
    public int? ButtonStyleId { get; set; }
    public int DisplayIndex { get; set; }
    public string? ItemPublicDisplayName { get; set; }
    public string? ItemPublicDisplayNameAlt { get; set; }
    public string? ItemPublicPrintedName { get; set; }
    public string? ImageFileName { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public string? ModifiedBy { get; set; }
}

public class MenuItemDetailDto : MenuItemSummaryDto
{
    public int? ModifierGroupHeaderId { get; set; }
    public bool AutoRedirectToModifier { get; set; }
    public string? ItemNameAlt2 { get; set; }
    public string? ItemNameAlt3 { get; set; }
    public string? ItemNameAlt4 { get; set; }
    public string? Remark { get; set; }
    public string? RemarkAlt { get; set; }
    public string? ItemPublicPrintedNameAlt { get; set; }
    public string? ImageFileName2 { get; set; }
    public string? TableOrderingImageFileName { get; set; }
    public bool? IsStandaloneAndSetItem { get; set; }
    public bool IsModifierConcatToParent { get; set; }
    public bool IsGroupRightItem { get; set; }
    public bool IsPrintLabel { get; set; }
    public bool IsPrintLabelTakeaway { get; set; }
    public bool IsPriceInPercentage { get; set; }
    public bool? IsItemShowInKitchenChecklist { get; set; }
    public bool? IsSoldoutAutoLock { get; set; }
    public bool? IsPrepaidRechargeItem { get; set; }
    public bool? IsAutoLinkWithRawMaterial { get; set; }
    public bool IsDinein { get; set; }
    public bool IsTakeaway { get; set; }
    public bool IsDelivery { get; set; }
    public bool? IsKitchenPrintInRedColor { get; set; }
    public bool? IsManualPriceGroup { get; set; }
    public int? SubDepartmentId { get; set; }
    public bool? IsExcludeLabelCount { get; set; }
    public decimal? ServingSize { get; set; }
    public string? SystemRemark { get; set; }
    public bool? IsNonSalesItem { get; set; }
    public int? ProductionSeconds { get; set; }
    public int? ParentItemId { get; set; }
    public DateTime? CreatedDate { get; set; }
    public string? CreatedBy { get; set; }
    public IReadOnlyList<MenuItemPriceDto> Prices { get; set; } = Array.Empty<MenuItemPriceDto>();
    public IReadOnlyList<MenuItemShopAvailabilityDto> ShopAvailability { get; set; } = Array.Empty<MenuItemShopAvailabilityDto>();
}

public class MenuItemUpsertDto
{
    [Required]
    public string ItemCode { get; set; } = string.Empty;

    public string? ItemName { get; set; }
    public string? ItemNameAlt { get; set; }
    public string? ItemNameAlt2 { get; set; }
    public string? ItemNameAlt3 { get; set; }
    public string? ItemNameAlt4 { get; set; }
    public string? ItemPosName { get; set; }
    public string? ItemPosNameAlt { get; set; }
    public string? ItemPublicDisplayName { get; set; }
    public string? ItemPublicDisplayNameAlt { get; set; }
    public string? ItemPublicPrintedName { get; set; }
    public string? ItemPublicPrintedNameAlt { get; set; }
    public string? Remark { get; set; }
    public string? RemarkAlt { get; set; }
    public string? ImageFileName { get; set; }
    public string? ImageFileName2 { get; set; }
    public string? TableOrderingImageFileName { get; set; }

    [Required]
    public int CategoryId { get; set; }

    [Required]
    public int DepartmentId { get; set; }

    public int? SubDepartmentId { get; set; }
    public int DisplayIndex { get; set; } = 0;
    public bool Enabled { get; set; } = true;
    public bool IsItemShow { get; set; } = true;
    public bool IsPriceShow { get; set; } = true;
    public bool HasModifier { get; set; } = false;
    public bool AutoRedirectToModifier { get; set; } = false;
    public bool IsModifier { get; set; } = false;
    public int? ModifierGroupHeaderId { get; set; }
    public int? ButtonStyleId { get; set; }
    public bool IsManualPrice { get; set; } = false;
    public bool IsManualName { get; set; } = false;
    public bool IsPromoItem { get; set; } = false;
    public bool IsModifierConcatToParent { get; set; } = false;
    public bool IsFollowSet { get; set; } = false;
    public bool IsFollowSetDynamic { get; set; } = false;
    public bool IsFollowSetStandard { get; set; } = false;
    public bool IsNonDiscountItem { get; set; } = false;
    public bool IsNonServiceChargeItem { get; set; } = false;
    public bool? IsStandaloneAndSetItem { get; set; }
    public bool IsGroupRightItem { get; set; } = false;
    public bool IsPrintLabel { get; set; } = false;
    public bool IsPrintLabelTakeaway { get; set; } = false;
    public bool IsPriceInPercentage { get; set; } = false;
    public bool? IsPointPaidItem { get; set; }
    public bool? IsNoPointEarnItem { get; set; }
    public bool? IsNonTaxableItem { get; set; }
    public bool? IsItemShowInKitchenChecklist { get; set; }
    public bool? IsSoldoutAutoLock { get; set; }
    public bool? IsPrepaidRechargeItem { get; set; }
    public bool? IsAutoLinkWithRawMaterial { get; set; }
    public bool IsDinein { get; set; } = true;
    public bool IsTakeaway { get; set; } = true;
    public bool IsDelivery { get; set; } = true;
    public bool? IsKitchenPrintInRedColor { get; set; }
    public bool? IsManualPriceGroup { get; set; }
    public bool? IsExcludeLabelCount { get; set; }
    public decimal? ServingSize { get; set; }
    public string? SystemRemark { get; set; }
    public bool? IsNonSalesItem { get; set; }
    public int? ProductionSeconds { get; set; }
    public int? ParentItemId { get; set; }
    public bool? IsComboRequired { get; set; }
}

public class MenuItemListQuery
{
    public int? CategoryId { get; set; }
    public string? Search { get; set; }
    public bool IncludeDisabled { get; set; } = false;
    public bool? HasModifier { get; set; }
    public bool? IsPromoItem { get; set; }
    public string? ItemType { get; set; }
    public string SortBy { get; set; } = "displayIndex";
    public string SortDirection { get; set; } = "asc";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class MenuItemListResponse
{
    public IReadOnlyList<MenuItemSummaryDto> Items { get; set; } = Array.Empty<MenuItemSummaryDto>();
    public int TotalItems { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public IReadOnlyList<CategoryItemCountDto> CategoryCounts { get; set; } = Array.Empty<CategoryItemCountDto>();
}

public class CategoryItemCountDto
{
    public int CategoryId { get; set; }
    public int ItemCount { get; set; }
}

public class MenuItemLookupsDto
{
    public IReadOnlyList<ItemCategoryDto> Categories { get; set; } = Array.Empty<ItemCategoryDto>();
    public IReadOnlyList<ButtonStyleDto> ButtonStyles { get; set; } = Array.Empty<ButtonStyleDto>();
    public IReadOnlyList<DepartmentDto> Departments { get; set; } = Array.Empty<DepartmentDto>();
    public IReadOnlyList<ModifierGroupHeaderDto> ModifierGroups { get; set; } = Array.Empty<ModifierGroupHeaderDto>();
}

public class MenuItemReorderEntryDto
{
    [Required]
    public int ItemId { get; set; }

    [Required]
    public int DisplayIndex { get; set; }
}

public class MenuItemReorderRequestDto
{
    [MinLength(1)]
    public IReadOnlyList<MenuItemReorderEntryDto> Items { get; set; } = Array.Empty<MenuItemReorderEntryDto>();
}

public class MenuItemPriceDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public bool Enabled { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public string? ModifiedBy { get; set; }
    public bool HasPrice => Price.HasValue;
}

public class ShopPrinterOptionDto
{
    public int ShopPrinterMasterId { get; set; }
    public string PrinterName { get; set; } = string.Empty;
}

public class MenuItemShopAvailabilityDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public bool? Enabled { get; set; }
    public bool? IsOutOfStock { get; set; }
    public bool? IsLimitedItem { get; set; }
    public DateTime? LastUpdated { get; set; }
    public string? UpdatedBy { get; set; }
    public int? ShopPrinter1 { get; set; }
    public int? ShopPrinter2 { get; set; }
    public int? ShopPrinter3 { get; set; }
    public int? ShopPrinter4 { get; set; }
    public int? ShopPrinter5 { get; set; }
    public bool? IsGroupPrintByPrinter { get; set; }
    public IReadOnlyList<ShopPrinterOptionDto> PrinterOptions { get; set; } = Array.Empty<ShopPrinterOptionDto>();
}

public class UpdateMenuItemPriceDto
{
    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    public bool Enabled { get; set; }
}

public class UpdateMenuItemAvailabilityDto
{
    public bool? Enabled { get; set; }
    public bool? IsOutOfStock { get; set; }
    public bool? IsLimitedItem { get; set; }
    public int? ShopPrinter1 { get; set; }
    public int? ShopPrinter2 { get; set; }
    public int? ShopPrinter3 { get; set; }
    public int? ShopPrinter4 { get; set; }
    public int? ShopPrinter5 { get; set; }
    public bool? IsGroupPrintByPrinter { get; set; }
}

public class ItemModifierMappingDto
{
    public int GroupHeaderId { get; set; }
    public int Sequence { get; set; }
    public string? ModifierLinkType { get; set; }
}

public class ItemModifierMappingsDto
{
    public IReadOnlyList<ItemModifierMappingDto> InStore { get; set; } = Array.Empty<ItemModifierMappingDto>();
    public IReadOnlyList<ItemModifierMappingDto> Online { get; set; } = Array.Empty<ItemModifierMappingDto>();
}

public class ItemModifierMappingUpsertDto
{
    public int GroupHeaderId { get; set; }
    public int Sequence { get; set; }
}

public class UpdateItemModifierMappingsDto
{
    public IReadOnlyList<ItemModifierMappingUpsertDto> InStore { get; set; } = Array.Empty<ItemModifierMappingUpsertDto>();
    public IReadOnlyList<ItemModifierMappingUpsertDto> Online { get; set; } = Array.Empty<ItemModifierMappingUpsertDto>();
}
