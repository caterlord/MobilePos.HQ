using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StaffMessingAccountType")]
public class StaffMessingAccountType
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int StaffMessingAccountTypeId { get; set; }

    [MaxLength(200)]
    [Required]
    public string TypeName { get; set; } = string.Empty;

    public int MemberHeaderId { get; set; }

    [Column(TypeName = "decimal(13, 2)")]
    public decimal Quota { get; set; }

    public bool IsResetMonthly { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? HasAmountLimitPerTx { get; set; }

    [Column(TypeName = "decimal(13, 2)")]
    public decimal? AmountLimitPerTx { get; set; }

}
