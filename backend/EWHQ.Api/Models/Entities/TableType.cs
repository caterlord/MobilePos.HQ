#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TableType")]
public class TableType
{
    [Key]
    [Column(Order = 0)]
    public int TableTypeId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string TypeName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string TypeNameAlt { get; set; }

    [MaxLength(100)]
    public string Desc { get; set; }

    [MaxLength(200)]
    public string DescAlt { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsBypassServiceCharge { get; set; }

    public bool? IsMinChargeEnabled { get; set; }

    public bool? IsMinChargePerHead { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MinChargeAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MinChargeMemberAmount { get; set; }

    public bool? IsBypassTaxation { get; set; }

}
