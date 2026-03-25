using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockTakeDetail")]
public class StockTakeDetail
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int StockTakeHeaderId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int StockTakeDetailId { get; set; }

    public int RawMaterialId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? ExpectedCount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? ActualCount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DifferenceInUnit { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DifferenceInCost { get; set; }

    [MaxLength(1000)]
    public string Remark { get; set; } = null!;

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
    public string RawMaterialCode { get; set; } = null!;

    [MaxLength(200)]
    public string RawMaterialNameAlt { get; set; } = null!;

    [MaxLength(200)]
    public string RawMaterialName { get; set; } = null!;

    [MaxLength(50)]
    public string BulkUnitName { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? BulkUnitCount { get; set; }

    [MaxLength(50)]
    public string OriginalUnitName { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? OriginalCount { get; set; }

}
