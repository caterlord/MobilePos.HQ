using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("RawMaterialMaster")]
public class RawMaterialMaster
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int RawMaterialId { get; set; }

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

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int? CategoryId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MinWarningQty { get; set; }

    [MaxLength(1000)]
    public string ExcludeRawMaterialIdList { get; set; } = null!;

    public bool? IsCalculateOnce { get; set; }

}
