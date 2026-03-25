#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("SmartCategory")]
public class SmartCategory
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int SmartCategoryId { get; set; }

    [MaxLength(100)]
    public string? Name { get; set; }

    [MaxLength(100)]
    public string? NameAlt { get; set; }

    public int DisplayIndex { get; set; }

    public int? ParentSmartCategoryId { get; set; }

    public bool IsPublicDisplay { get; set; }

    public int ButtonStyleId { get; set; }

    public bool IsTerminal { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Description { get; set; }

    [MaxLength(200)]
    public string? DescriptionAlt { get; set; }

    [MaxLength(200)]
    public string? ImageFileName { get; set; }

    [MaxLength(200)]
    public string? ImageFileName2 { get; set; }

    [MaxLength(200)]
    public string? ImageFileName3 { get; set; }

    public bool? IsSelfOrderingDisplay { get; set; }

    [MaxLength(4000)]
    public string? Remark { get; set; }

    public bool? IsOnlineStoreDisplay { get; set; }

    public int? OnlineStoreRefCategoryId { get; set; }

    [MaxLength(4000)]
    public string? RemarkAlt { get; set; }

    public bool? IsOdoDisplay { get; set; }

    public bool? IsKioskDisplay { get; set; }

    public bool? IsTableOrderingDisplay { get; set; }

}
