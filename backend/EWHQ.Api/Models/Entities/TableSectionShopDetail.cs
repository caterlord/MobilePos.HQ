#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TableSectionShopDetail")]
public class TableSectionShopDetail
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int SectionId { get; set; }

    [MaxLength(200)]
    public string TableMapBackgroundImagePath { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int? TableMapBackgroundImageWidth { get; set; }

    public int? TableMapBackgroundImageHeight { get; set; }

}
