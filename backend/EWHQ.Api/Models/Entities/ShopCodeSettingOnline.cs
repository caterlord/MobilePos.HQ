#nullable disable warnings

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
    public string Name { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; }

    [MaxLength(50)]
    public string Manager { get; set; }

    [MaxLength(50)]
    public string StoreCategory { get; set; }

    [MaxLength(255)]
    public string Email { get; set; }

}
