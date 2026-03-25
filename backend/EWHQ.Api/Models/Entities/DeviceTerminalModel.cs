using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("DeviceTerminalModel")]
public class DeviceTerminalModel
{
    [Key]
    public int DeviceTerminalModelId { get; set; }

    [MaxLength(50)]
    [Required]
    public string DeviceTerminalModelCode { get; set; } = string.Empty;

    [MaxLength(100)]
    [Required]
    public string DeviceTerminalModelName { get; set; } = string.Empty;

    public int DefaultResolutionWidth { get; set; }

    public int DefaultResolutionHeight { get; set; }

    public int DisplayOrder { get; set; }

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
