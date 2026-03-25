using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ReportParameterType")]
public class ReportParameterType
{
    [Key]
    public int ParamTypeId { get; set; }

    [MaxLength(50)]
    [Required]
    public string ParamName { get; set; } = string.Empty;

    [MaxLength(15)]
    [Required]
    public string ParamDataType { get; set; } = string.Empty;

    public bool AllowNull { get; set; }

    [MaxLength(255)]
    public string DefaultValue { get; set; } = null!;

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
