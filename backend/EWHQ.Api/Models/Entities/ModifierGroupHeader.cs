using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ModifierGroupHeader")]
public class ModifierGroupHeader
{
    [Key]
    [Column(Order = 0)]
    public int GroupHeaderId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string GroupBatchName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? GroupBatchNameAlt { get; set; }

    public int MaxModifierSelectCount { get; set; }

    public int? LinkedGroupHeaderId { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? IsFollowSet { get; set; }

    public bool? IsMandatory { get; set; }

    public int? MinModifierSelectCount { get; set; }

    public bool? IsOnlineStoreDisplay { get; set; }

    public bool? IsOdoDisplay { get; set; }

    public bool? IsKioskDisplay { get; set; }

    public bool? IsSelfOrderingDisplay { get; set; }

    [MaxLength(500)]
    public string? PublicGroupBatchName { get; set; }

    [MaxLength(500)]
    public string? PublicGroupBatchNameAlt { get; set; }

    public bool? IsTableOrderingDisplay { get; set; }

    [MaxLength(50)]
    public string? GroupType { get; set; }

    [MaxLength(20)]
    public string? GroupHeaderCode { get; set; }

    [MaxLength(50)]
    [Column ("SOPLookupType")]
    public string? SopLookupType { get; set; }

    public bool? ShowInNewPage { get; set; }

    public bool? IsPosDisplay { get; set; }

}
