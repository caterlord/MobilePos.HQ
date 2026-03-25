using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemCategory")]
public class ItemCategory
{
    [Key]
    [Column(Order = 0)]
    public int CategoryId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string CategoryName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? CategoryNameAlt { get; set; }

    public int DisplayIndex { get; set; }

    public int? ParentCategoryId { get; set; }

    public bool IsTerminal { get; set; }

    public bool IsPublicDisplay { get; set; }

    public int? ButtonStyleId { get; set; }

    [MaxLength(50)]
    public string? PrinterName { get; set; }

    public bool IsModifier { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? PrinterName2 { get; set; }

    [MaxLength(50)]
    public string? PrinterName3 { get; set; }

    [MaxLength(50)]
    public string? PrinterName4 { get; set; }

    [MaxLength(50)]
    public string? PrinterName5 { get; set; }

    public int? CategoryTypeId { get; set; }

    [MaxLength(200)]
    public string? ImageFileName { get; set; }

    [MaxLength(200)]
    public string? ImageFileName2 { get; set; }

    [MaxLength(200)]
    public string? ImageFileName3 { get; set; }

    public bool? IsSelfOrderingDisplay { get; set; }

    public bool? IsOnlineStoreDisplay { get; set; }

    [MaxLength(50)]
    public string? CategoryCode { get; set; }

}
