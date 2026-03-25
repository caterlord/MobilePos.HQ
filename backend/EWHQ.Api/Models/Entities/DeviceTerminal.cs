using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("DeviceTerminal")]
public class DeviceTerminal
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int TerminalId { get; set; }

    [MaxLength(200)]
    [Required]
    public string PosCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string PosIpAddress { get; set; } = null!;

    [MaxLengthUnlimited]
    public string ConfigFile { get; set; } = null!;

    public bool IsServer { get; set; }

    [MaxLength(100)]
    public string Resolution { get; set; } = null!;

    public bool IsCashRegister { get; set; }

    [MaxLength(10)]
    public string CashRegisterCode { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    public int ResolutionWidth { get; set; }

    public int ResolutionHeight { get; set; }

    public int DeviceTerminalModelId { get; set; }

    public bool IsActivated { get; set; }

}
