using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockBulkUnitMapping")]
public class StockBulkUnitMapping
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int BulkUnitId { get; set; }

    [MaxLength(50)]
    [Required]
    public string BulkUnitName { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string OriginalUnitName { get; set; } = string.Empty;

    public int RawMaterialId { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal OriginalUnitQty { get; set; }

}
