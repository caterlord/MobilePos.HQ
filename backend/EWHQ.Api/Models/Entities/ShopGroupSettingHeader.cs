using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ShopGroupSettingHeader")]
public class ShopGroupSettingHeader
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int ShopGroupId { get; set; }

    [MaxLength(200)]
    [Required]
    public string ShopGroupCode { get; set; } = string.Empty;

    [MaxLength(500)]
    [Required]
    public string ShopGroupName { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string ShopGroupDesc { get; set; } = null!;

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
