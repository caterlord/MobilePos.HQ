#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockAdjustment")]
public class StockAdjustment
{
    public Guid AdjustmentId { get; set; }

    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int? RawMaterialId { get; set; }

    public DateTime? AdjustmentDatetime { get; set; }

    [MaxLength(4000)]
    public string AdjustmentRemark { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Qty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? BeforeAdjustmentCount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? AfterAdjustmentCount { get; set; }

    [MaxLength(100)]
    public string RefNum { get; set; }

    public bool IsBalanced { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsEffectived { get; set; }

    public DateTime? EffectivedDatetime { get; set; }

}
