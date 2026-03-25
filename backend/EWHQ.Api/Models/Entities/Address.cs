#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("Address")]
public class Address
{
    [Key]
    [Column(Order = 0)]
    public int AddressId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int? DisplayIndex { get; set; }

    [MaxLength(200)]
    public string Caption { get; set; }

    [MaxLength(200)]
    public string CaptionAlt { get; set; }

    public int? DisplayLevel { get; set; }

    public int? ParentAddressId { get; set; }

    public bool IsReadOnly { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Column(TypeName = "decimal(20, 8)")]
    public decimal? Lat { get; set; }

    [Column(TypeName = "decimal(20, 8)")]
    public decimal? Lng { get; set; }

    [MaxLength(50)]
    public string RefKey { get; set; }

}
