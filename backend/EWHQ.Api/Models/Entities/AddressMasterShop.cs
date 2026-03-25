#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AddressMasterShop")]
public class AddressMasterShop
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int ShopId { get; set; }

    [MaxLength(400)]
    [Required]
    public string ShopName { get; set; } = string.Empty;

    [MaxLength(400)]
    public string ShopNameAlt { get; set; }

    [MaxLength(400)]
    public string ShopPath { get; set; }

    [MaxLength(400)]
    public string ShopPathAlt { get; set; }

    [MaxLength(400)]
    public string ShopDesc { get; set; }

    public int ClickCount { get; set; }

    public int DisplayIndex { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int? AreaId { get; set; }

    public int? DistrictId { get; set; }

    public int? StreetId { get; set; }

    public int? EstateId { get; set; }

    public int? BuildingId { get; set; }

    public bool IsReadOnly { get; set; }

}
