using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("SystemParameter")]
public class SystemParameter
{
    [Key]
    [Column(Order = 0)]
    public int ParamId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(100)]
    public string ParamCode { get; set; } = null!;

    [MaxLength(200)]
    [Required]
    public string Description { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string ParamValue { get; set; } = null!;

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
