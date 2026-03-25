#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("RawMaterialCategoryOnline")]
public class RawMaterialCategoryOnline
{
    public int RawMaterialCategoryId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int AccountId { get; set; }

    public int? SeqNo { get; set; }

    [MaxLength(200)]
    [Required]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string NameAlt1 { get; set; }

    [MaxLength(200)]
    public string NameAlt2 { get; set; }

    [MaxLength(200)]
    public string NameAlt3 { get; set; }

    [MaxLength(200)]
    public string CategoryType { get; set; }

    public int? ParentCategoryId { get; set; }

    public bool Enabled { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; }

    [MaxLength(50)]
    public string CategoryCode { get; set; }

}
