using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("RawMaterialItemMasterSetting")]
public class RawMaterialItemMasterSetting
{
    public int AccountId { get; set; }

    public int RawMaterialId { get; set; }

    public int ItemId { get; set; }

    [Column(TypeName = "decimal(13, 5)")]
    public decimal? RequiredUnit { get; set; }

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
