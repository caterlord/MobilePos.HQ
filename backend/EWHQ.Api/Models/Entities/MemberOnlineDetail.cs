using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("MemberOnlineDetail")]
public class MemberOnlineDetail
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int MemberOnlineDetailId { get; set; }

    public int? MemberDetailId { get; set; }

    [MaxLength(200)]
    public string SocialMediaId { get; set; } = null!;

    public int? SocialMediaTypeId { get; set; }

    [MaxLength(100)]
    public string FirstName { get; set; } = null!;

    [MaxLength(100)]
    public string LastName { get; set; } = null!;

    [MaxLength(2)]
    public string GenderCode { get; set; } = null!;

    [MaxLength(100)]
    public string GenderDesc { get; set; } = null!;

    [MaxLength(500)]
    public string ImageUrl { get; set; } = null!;

    public DateTime? DateOfBirth { get; set; }

    public int? DateOfBirthYear { get; set; }

    public int? DateOfBirthMonth { get; set; }

    public int? DateOfBirthDay { get; set; }

    [MaxLength(200)]
    public string Email { get; set; } = null!;

    public DateTime? RegistrationDateTime { get; set; }

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
    public string ReferralSourceId { get; set; } = null!;

    [MaxLength(50)]
    public string LocaleCode { get; set; } = null!;

    public int? AgeRangeMin { get; set; }

    public int? AgeRangeMax { get; set; }

    [MaxLength(200)]
    public string FBRealUserId { get; set; } = null!;

    [MaxLength(50)]
    public string RegStatus { get; set; } = null!;

    [MaxLength(200)]
    public string ContactName { get; set; } = null!;

    [MaxLength(200)]
    public string ContactEmail { get; set; } = null!;

    [MaxLength(100)]
    public string ContactPhone { get; set; } = null!;

    [MaxLength(1000)]
    public string ContactAddress { get; set; } = null!;

    [MaxLength(100)]
    public string Phone { get; set; } = null!;

}
