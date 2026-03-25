#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemCategoryShopDetail")]
public class ItemCategoryShopDetail
{
    public int CategoryId { get; set; }

    public int ShopId { get; set; }

    public int AccountId { get; set; }

    [MaxLength(200)]
    public string DisplayName { get; set; }

    public int? DisplayIndex { get; set; }

    public bool IsPublicDisplay { get; set; }

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
