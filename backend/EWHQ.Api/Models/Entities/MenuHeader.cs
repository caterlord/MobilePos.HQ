using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("MenuHeader")]
public class MenuHeader
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int MenuId { get; set; }

    [MaxLength(200)]
    [Required]
    public string MenuName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? MenuNameAlt { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsBuiltIn { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsPublished { get; set; }

    [MaxLength(50)]
    public string? MenuCode { get; set; }

    public bool? IsOdoDisplay { get; set; }

    public bool? IsKioskDisplay { get; set; }

    public bool? IsTableOrderingDisplay { get; set; }

}
