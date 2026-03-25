#nullable disable warnings

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
    public string SocialMediaId { get; set; }

    public int? SocialMediaTypeId { get; set; }

    [MaxLength(100)]
    public string FirstName { get; set; }

    [MaxLength(100)]
    public string LastName { get; set; }

    [MaxLength(2)]
    public string GenderCode { get; set; }

    [MaxLength(100)]
    public string GenderDesc { get; set; }

    [MaxLength(500)]
    public string ImageUrl { get; set; }

    public DateTime? DateOfBirth { get; set; }

    public int? DateOfBirthYear { get; set; }

    public int? DateOfBirthMonth { get; set; }

    public int? DateOfBirthDay { get; set; }

    [MaxLength(200)]
    public string Email { get; set; }

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
    public string ReferralSourceId { get; set; }

    [MaxLength(50)]
    public string LocaleCode { get; set; }

    public int? AgeRangeMin { get; set; }

    public int? AgeRangeMax { get; set; }

    [MaxLength(200)]
    public string FBRealUserId { get; set; }

    [MaxLength(50)]
    public string RegStatus { get; set; }

    [MaxLength(200)]
    public string ContactName { get; set; }

    [MaxLength(200)]
    public string ContactEmail { get; set; }

    [MaxLength(100)]
    public string ContactPhone { get; set; }

    [MaxLength(1000)]
    public string ContactAddress { get; set; }

    [MaxLength(100)]
    public string Phone { get; set; }

}
