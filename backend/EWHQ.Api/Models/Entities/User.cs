using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("User")]
public class User
{
    [Key]
    [Column(Order = 0)]
    public int UserId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string UserName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? UserAltName { get; set; }

    [MaxLength(50)]
    [Required]
    public string Password { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? CardNo { get; set; }

    [MaxLength(50)]
    public string? StaffCode { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public DateTime? EffectiveDateFrom { get; set; }

    public DateTime? EffectiveDateTo { get; set; }

    public bool EnableUserIdLogin { get; set; }

    public bool EnableCardNoLogin { get; set; }

    public bool EnableStaffCodeLogin { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool InactiveUserAccount { get; set; }

}
