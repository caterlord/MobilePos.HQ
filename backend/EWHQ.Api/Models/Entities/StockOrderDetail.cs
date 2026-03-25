#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockOrderDetail")]
public class StockOrderDetail
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int OrderHeaderId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int OrderDetailId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int? RawMaterialId { get; set; }

    [MaxLength(50)]
    public string RawMaterialCode { get; set; }

    [MaxLength(200)]
    public string RawMaterialName { get; set; }

    [MaxLength(200)]
    public string RawMaterialNameAlt { get; set; }

    public int OrderSeq { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Qty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? SupplyPrice { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? ReceivedQty { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(50)]
    public string BulkUnitName { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? BulkUnitQty { get; set; }

    [MaxLength(50)]
    public string OriginalUnitName { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? OriginalQty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? ReceivedOriginalQty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? ReceivedBulkUnitQty { get; set; }

}
