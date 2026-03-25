using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemMaster")]
public class ItemMaster
{
    [Key]
    [Column(Order = 0)]
    public int ItemId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int CategoryId { get; set; }

    public int DepartmentId { get; set; }

    [MaxLength(20)]
    [Required]
    public string ItemCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ItemName { get; set; }

    [MaxLength(100)]
    public string? ItemNameAlt { get; set; }

    [MaxLength(50)]
    public string? ItemPosName { get; set; }

    [MaxLength(100)]
    public string? ItemPosNameAlt { get; set; }

    public int DisplayIndex { get; set; }

    public bool HasModifier { get; set; }

    public int? ModifierGroupHeaderId { get; set; }

    public bool AutoRedirectToModifier { get; set; }

    public bool IsModifier { get; set; }

    public int? ButtonStyleId { get; set; }

    public bool Enabled { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string? CreatedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string? ModifiedBy { get; set; }

    public bool IsItemShow { get; set; }

    public bool IsPriceShow { get; set; }

    [MaxLength(100)]
    public string? ItemNameAlt2 { get; set; }

    [MaxLength(100)]
    public string? ItemNameAlt3 { get; set; }

    [MaxLength(100)]
    public string? ItemNameAlt4 { get; set; }

    public bool IsManualPrice { get; set; }

    public bool IsManualName { get; set; }

    public bool IsPromoItem { get; set; }

    public bool IsModifierConcatToParent { get; set; }

    public bool IsFollowSet { get; set; }

    public bool IsFollowSetDynamic { get; set; }

    public bool IsFollowSetStandard { get; set; }

    public bool IsNonDiscountItem { get; set; }

    public bool IsNonServiceChargeItem { get; set; }

    public bool? IsStandaloneAndSetItem { get; set; }

    public bool IsGroupRightItem { get; set; }

    public bool IsPrintLabel { get; set; }

    public bool IsPrintLabelTakeaway { get; set; }

    public bool IsPriceInPercentage { get; set; }

    [MaxLength(200)]
    public string? ImageFileName { get; set; }

    public bool? IsPointPaidItem { get; set; }

    public bool? IsNoPointEarnItem { get; set; }

    public bool? IsNonTaxableItem { get; set; }

    public bool? IsItemShowInKitchenChecklist { get; set; }

    public bool? IsSoldoutAutoLock { get; set; }

    public bool? IsPrepaidRechargeItem { get; set; }

    public bool? IsAutoLinkWithRawMaterial { get; set; }

    [MaxLength(200)]
    public string? ImageFileName2 { get; set; }

    [MaxLength(4000)]
    public string? Remark { get; set; }

    [MaxLength(4000)]
    public string? RemarkAlt { get; set; }

    [MaxLength(200)]
    public string? OdoImageFileName { get; set; }

    [MaxLength(4000)]
    public string? OdoRemark { get; set; }

    [MaxLength(4000)]
    public string? OdoRemarkAlt { get; set; }

    [MaxLength(200)]
    public string? KioskImageFileName { get; set; }

    [MaxLength(4000)]
    public string? KioskRemark { get; set; }

    [MaxLength(4000)]
    public string? KioskRemarkAlt { get; set; }

    [MaxLength(100)]
    public string? ItemPublicDisplayName { get; set; }

    [MaxLength(100)]
    public string? ItemPublicDisplayNameAlt { get; set; }

    [MaxLength(100)]
    public string? ItemPublicPrintedName { get; set; }

    [MaxLength(100)]
    public string? ItemPublicPrintedNameAlt { get; set; }

    public bool IsDinein { get; set; }

    public bool IsTakeaway { get; set; }

    public bool IsDelivery { get; set; }

    [MaxLength(200)]
    public string? TableOrderingImageFileName { get; set; }

    public bool? IsKitchenPrintInRedColor { get; set; }

    public bool? IsManualPriceGroup { get; set; }

    public int? SubDepartmentId { get; set; }

    public bool? IsExcludeLabelCount { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? ServingSize { get; set; }

    [MaxLength(200)]
    public string? SystemRemark { get; set; }

    public bool? IsNonSalesItem { get; set; }

    public int? ProductionSeconds { get; set; }

    public int? ParentItemId { get; set; }

    public bool? IsComboRequired { get; set; }

}
