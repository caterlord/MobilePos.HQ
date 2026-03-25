using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ShopCodeSettingOnline")]
public class ShopCodeSettingOnline
{
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string ShopCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Name { get; set; } = null!;

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; } = null!;

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; } = null!;

    [MaxLength(50)]
    public string Manager { get; set; } = null!;

    [MaxLength(50)]
    public string StoreCategory { get; set; } = null!;

    [MaxLength(255)]
    public string Email { get; set; } = null!;

}
