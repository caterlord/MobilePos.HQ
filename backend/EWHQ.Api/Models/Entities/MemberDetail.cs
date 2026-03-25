#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("MemberDetail")]
public class MemberDetail
{
    [Key]
    [Column(Order = 0)]
    public int MemberDetailId { get; set; }

    public int MemberHeaderId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public DateTime OpenCardDatetime { get; set; }

    [MaxLength(50)]
    [Required]
    public string OpenCardUserName { get; set; } = string.Empty;

    public int OpenCardUserId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? OverrideDiscount { get; set; }

    [MaxLength(100)]
    public string MemberCardNum { get; set; }

    [MaxLength(100)]
    public string MemberFormNum { get; set; }

    [MaxLength(200)]
    public string MemberName { get; set; }

    [MaxLength(200)]
    public string MemberEmail { get; set; }

    [MaxLength(200)]
    public string MemberPhone { get; set; }

    public DateTime? MemberEffectiveDate { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public DateTime? MemberDateOfBirth { get; set; }

    [MaxLength(50)]
    public string MemberGender { get; set; }

    [MaxLength(50)]
    public string MemberEnglishName { get; set; }

    public int? CreditTotalBalance { get; set; }

    public bool IsMemberExpired { get; set; }

    [MaxLength(50)]
    public string MemberIdCardNum { get; set; }

    [MaxLength(4000)]
    public string MemberRemark { get; set; }

    [MaxLength(4000)]
    public string MemberAddess { get; set; }

    [MaxLength(4000)]
    public string MemberRemark2 { get; set; }

    [MaxLength(4000)]
    public string MemberRemark3 { get; set; }

    [MaxLength(4000)]
    public string MemberRemark4 { get; set; }

    [MaxLength(4000)]
    public string MemberRemark5 { get; set; }

    [MaxLength(4000)]
    public string MemberRemark6 { get; set; }

    [MaxLength(4000)]
    public string MemberRemark7 { get; set; }

    [MaxLength(4000)]
    public string MemberRemark8 { get; set; }

    [MaxLength(4000)]
    public string MemberRemark9 { get; set; }

    [MaxLength(4000)]
    public string MemberRemark10 { get; set; }

    [MaxLength(50)]
    public string MemberPassword { get; set; }

    public DateTime? MemberExpiryDate { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Balance { get; set; }

    public bool? IsOnlineMember { get; set; }

    [MaxLength(200)]
    public string QRCodeImageUrl { get; set; }

    [MaxLength(100)]
    public string FirstName { get; set; }

    [MaxLength(100)]
    public string LastName { get; set; }

    public int? DateOfBirthYear { get; set; }

    public int? DateOfBirthMonth { get; set; }

    public int? DateOfBirthDay { get; set; }

    public bool? IsStaffMessingMember { get; set; }

}
