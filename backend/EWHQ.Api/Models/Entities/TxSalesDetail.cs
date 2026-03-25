using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TxSalesDetail")]
public class TxSalesDetail
{
    [Key]
    [Column(Order = 0)]
    public int TxSalesDetailId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int TxSalesHeaderId { get; set; }

    public int? PreviousTxSalesHeaderId { get; set; }

    public int SeqNo { get; set; }

    public bool IsSubItem { get; set; }

    public bool IsModifier { get; set; }

    public int? ParentTxSalesDetailId { get; set; }

    public int SubItemLevel { get; set; }

    [MaxLength(100)]
    [Required]
    public string ItemPath { get; set; } = string.Empty;

    public int ItemSetRunningIndex { get; set; }

    public int ItemOrderRunningIndex { get; set; }

    public DateTime OrderDateTime { get; set; }

    public int OrderUserId { get; set; }

    [MaxLength(50)]
    [Required]
    public string OrderUserName { get; set; } = string.Empty;

    public int ItemId { get; set; }

    public int CategoryId { get; set; }

    [MaxLength(20)]
    [Required]
    public string ItemCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ItemName { get; set; } = null!;

    [MaxLength(100)]
    public string ItemNameAlt2 { get; set; } = null!;

    [Column(TypeName = "decimal(10, 3)")]
    public decimal Qty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Price { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Amount { get; set; }

    public bool Enabled { get; set; }

    public bool Voided { get; set; }

    public bool PrintedKitchen { get; set; }

    public int? PrintedKitchenByUserId { get; set; }

    [MaxLength(50)]
    public string PrintedKitchenByUserName { get; set; } = null!;

    public DateTime? PrintedKitchenDateTime { get; set; }

    public int? DisabledReasonId { get; set; }

    [MaxLength(500)]
    public string DisabledReasonDesc { get; set; } = null!;

    public int? DisabledByUserId { get; set; }

    [MaxLength(50)]
    public string DisabledByUserName { get; set; } = null!;

    public DateTime? DisabledDateTime { get; set; }

    public int? ChaseCount { get; set; }

    public int? ChaseUserId { get; set; }

    [MaxLength(50)]
    public string ChaseUserName { get; set; } = null!;

    public DateTime? ChaseDateTime { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsPromoComboItem { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [MaxLength(100)]
    public string ItemNameAlt { get; set; } = null!;

    [MaxLength(100)]
    public string ItemNameAl3 { get; set; } = null!;

    [MaxLength(100)]
    public string ItemNameAl4 { get; set; } = null!;

    [MaxLength(50)]
    public string ItemPosName { get; set; } = null!;

    [MaxLength(100)]
    public string ItemPosNameAlt { get; set; } = null!;

    public int? DepartmentId { get; set; }

    [MaxLength(100)]
    public string DepartmentName { get; set; } = null!;

    public bool? IsPointPaidItem { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountPoint { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Point { get; set; }

    public bool? IsNonTaxableItem { get; set; }

    public bool? IsItemOnHold { get; set; }

    public DateTime? ItemOnHoldDateTime { get; set; }

    public int? ItemOnHoldUserId { get; set; }

    [MaxLength(50)]
    public string ItemOnHoldUserName { get; set; } = null!;

    public bool? IsItemFired { get; set; }

    public DateTime? ItemFiredDateTime { get; set; }

    public int? ItemFiredUserId { get; set; }

    [MaxLength(50)]
    public string ItemFiredUserName { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TakeawaySurcharge { get; set; }

    public bool? IsItemShowInKitchenChecklist { get; set; }

    public bool? IsPrepaidRechargeItem { get; set; }

    [MaxLength(200)]
    public string ApiGatewayName { get; set; } = null!;

    public int? ApiGatewayRefId { get; set; }

    [MaxLength(1000)]
    public string ApiGatewayRefRemark { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountItemDiscount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountItemTaxation { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AmountItemSurcharge { get; set; }

    public int? PromoHeaderId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PromoDeductAmount { get; set; }

    [Column(TypeName = "decimal(10, 3)")]
    public decimal? PromoQty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PromoRevenueOffset { get; set; }

    [MaxLength(50)]
    public string CategoryName { get; set; } = null!;

    public int? OrderSourceTypeId { get; set; }

    [MaxLength(100)]
    public string ItemPublicDisplayName { get; set; } = null!;

    [MaxLength(100)]
    public string ItemPublicDisplayNameAlt { get; set; } = null!;

    [MaxLength(100)]
    public string ItemPublicPrintedName { get; set; } = null!;

    [MaxLength(100)]
    public string ItemPublicPrintedNameAlt { get; set; } = null!;

    public int? LinkedItemOrderRunningIndex { get; set; }

    public int? LinkedItemSetRunningIndex { get; set; }

    public int? LinkedItemId { get; set; }

    public bool? IsPriceInPercentage { get; set; }

    public int? OrderSourceRefId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DepartmentRevenueAmount { get; set; }

    [MaxLength(50)]
    public string PromoCode { get; set; } = null!;

    [MaxLength(200)]
    public string PromoName { get; set; } = null!;

    public int? itemCourseIndex { get; set; }

    public int? priceRuleGroupId { get; set; }

    [MaxLength(50)]
    public string priceRuleGroupCode { get; set; } = null!;

    [MaxLength(200)]
    public string priceRuleGroupName { get; set; } = null!;

    [MaxLength(100)]
    public string OrderBatchTag { get; set; } = null!;

    public bool? IsTxOnHold { get; set; }

    public int? SubDepartmentId { get; set; }

    [MaxLength(100)]
    public string SubDepartmentName { get; set; } = null!;

    [MaxLength(1000)]
    public string ApiGatewayRefCode { get; set; } = null!;

    [MaxLength(1000)]
    public string ApiGatewayResponseCode { get; set; } = null!;

    public bool? IsVariance { get; set; }

    public int? GroupHeaderId { get; set; }

    [MaxLength(50)]
    public string GroupBatchName { get; set; } = null!;

    public int? DiscountId { get; set; }

    [MaxLength(200)]
    public string DiscountName { get; set; } = null!;

    [MaxLength(200)]
    public string SOPLookupPath { get; set; } = null!;

    public bool? IsNonSalesItem { get; set; }

}
