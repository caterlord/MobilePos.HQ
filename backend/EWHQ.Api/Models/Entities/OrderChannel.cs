using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("OrderChannel")]
public class OrderChannel
{
    [Key]
    public int OrderChannelId { get; set; }

    [MaxLength(200)]
    public string? OrderChannelName { get; set; }

    [MaxLength(200)]
    public string? OrderChannelNameAlt { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? ChannelTypeCode { get; set; }

    [MaxLength(50)]
    public string? OrderChannelCode { get; set; }

}
