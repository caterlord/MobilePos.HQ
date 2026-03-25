#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StaffMessingAccount")]
public class StaffMessingAccount
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int StaffMessingAccountId { get; set; }

    public int MemberDetailId { get; set; }

    [MaxLength(200)]
    [Required]
    public string StaffFirstName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string StaffLastName { get; set; }

    [MaxLength(200)]
    [Required]
    public string StaffCode { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string StaffMessingCardNum { get; set; } = string.Empty;

    public bool IsShopStaff { get; set; }

    public int? OriginalShopId { get; set; }

    public int StaffMessingAccountTypeId { get; set; }

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
