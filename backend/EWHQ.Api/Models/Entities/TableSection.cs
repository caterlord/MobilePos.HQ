#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TableSection")]
public class TableSection
{
    [Key]
    [Column(Order = 0)]
    public int SectionId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string SectionName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? SectionNameAlt { get; set; }

    [MaxLength(200)]
    public string? Desc { get; set; }

    [MaxLength(400)]
    public string? DescAlt { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? TableMapBackgroundImagePath { get; set; }

}
