using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemShopDetail")]
public class ItemShopDetail
{
    public int ItemId { get; set; }

    public int ShopId { get; set; }

    public int AccountId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Price { get; set; }

    public bool IsLimitedItem { get; set; }

    public bool IsOutOfStock { get; set; }

    [Column(TypeName = "decimal(10, 3)")]
    public decimal? ItemQty { get; set; }

    [Column(TypeName = "decimal(10, 3)")]
    public decimal? ItemCount { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int? ShopPrinter1 { get; set; }

    public int? ShopPrinter2 { get; set; }

    public int? ShopPrinter3 { get; set; }

    public int? ShopPrinter4 { get; set; }

    public int? ShopPrinter5 { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? SetItemPrice { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Point { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TakeawaySurcharge { get; set; }

    public bool? IsGroupPrintByPrinter { get; set; }

    public int? ShopKds1 { get; set; }

    public int? ShopKds2 { get; set; }

    public int? ShopKds3 { get; set; }

    public int? ShopKds4 { get; set; }

    public int? ShopKds5 { get; set; }

    public bool? Enabled { get; set; }

    public bool? IsPublicDisplay { get; set; }

    public bool? IsLimitedItemAutoReset { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? OriginalPrice { get; set; }

    public int? ShopLabelPrinter1 { get; set; }

    public int? ShopLabelPrinter2 { get; set; }

    public int? ShopLabelPrinter3 { get; set; }

    public int? ShopLabelPrinter4 { get; set; }

    public int? ShopLabelPrinter5 { get; set; }

}
