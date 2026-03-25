using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("RawMaterialTxSalesDetail")]
public class RawMaterialTxSalesDetail
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int TxSalesDetailId { get; set; }

    public int RawMaterialId { get; set; }

    public int ItemId { get; set; }

    [MaxLength(50)]
    [Required]
    public string ItemName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ItemNameAlt2 { get; set; } = null!;

    [MaxLength(20)]
    [Required]
    public string ItemCode { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string RawMaterialCode { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string RawMaterialName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string RawMaterialNameAlt { get; set; } = null!;

    [MaxLength(50)]
    [Required]
    public string UnitName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(13, 5)")]
    public decimal? CostPerUnit { get; set; }

    [Column(TypeName = "decimal(13, 5)")]
    public decimal? UnitPerItem { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Qty { get; set; }

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
