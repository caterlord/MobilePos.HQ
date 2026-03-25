using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("DeviceUsageLogOnline")]
public class DeviceUsageLogOnline
{
    [Key]
    [Column(Order = 0)]
    public int DeviceUsageLogOnlineId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [MaxLength(100)]
    [Required]
    public string PosCode { get; set; } = string.Empty;

    [MaxLength(100)]
    [Required]
    public string InternalIpAddress { get; set; } = string.Empty;

    public DateTime LastOnlineDatetime { get; set; }

}
