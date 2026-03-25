#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ShopType")]
public class ShopType
{
    public int ShopTypeid { get; set; }

    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string TypeName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string AltTypeName { get; set; }

    [MaxLength(500)]
    public string TypeDesc { get; set; }

    [MaxLength(1000)]
    public string AltTypeDesc { get; set; }

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
