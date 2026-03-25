using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("MemberHeader")]
public class MemberHeader
{
    [Key]
    [Column(Order = 0)]
    public int MemberHeaderId { get; set; }

    [MaxLength(50)]
    [Required]
    public string MemberTypeName { get; set; } = string.Empty;

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DiscountRate { get; set; }

    public int? Duration { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? IsDefaultOnlineMemberType { get; set; }

    public bool? IsStaffMessingMemberType { get; set; }

}
