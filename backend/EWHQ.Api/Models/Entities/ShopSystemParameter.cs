using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("ShopSystemParameter")]
public class ShopSystemParameter
{
    [Key]
    [Column(Order = 0)]
    public int ParamId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(200)]
    [Required]
    public string ParamCode { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string Description { get; set; } = string.Empty;

    [MaxLengthUnlimited]
    [Required]
    public string ParamValue { get; set; } = string.Empty;

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
