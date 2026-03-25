using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("SupplierMaster")]
public class SupplierMaster
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int SupplierId { get; set; }

    [MaxLength(500)]
    [Required]
    public string SupplierName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DefaultMarkup { get; set; }

    [MaxLengthUnlimited]
    public string Description { get; set; } = null!;

    [MaxLength(500)]
    public string ContactCompany { get; set; } = null!;

    [MaxLength(500)]
    public string ContactFirstName { get; set; } = null!;

    [MaxLength(500)]
    public string ContactLastName { get; set; } = null!;

    [MaxLength(500)]
    public string ContactPhone { get; set; } = null!;

    [MaxLength(500)]
    public string ContactMobile { get; set; } = null!;

    [MaxLength(500)]
    public string ContactFax { get; set; } = null!;

    [MaxLength(500)]
    public string ContactEmail { get; set; } = null!;

    [MaxLength(500)]
    public string ContactWebsite { get; set; } = null!;

    [MaxLengthUnlimited]
    public string ContactOther { get; set; } = null!;

    [MaxLengthUnlimited]
    public string AddressPhysical { get; set; } = null!;

    [MaxLengthUnlimited]
    public string AddressPostal { get; set; } = null!;

    public bool Enabled { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; } = null!;

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; } = null!;

}
