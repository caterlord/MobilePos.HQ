using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AddressBook")]
public class AddressBook
{
    [Key]
    [Column(Order = 0)]
    public int AddressBookId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string PhoneNum { get; set; } = string.Empty;

    [MaxLength(100)]
    public string CusName { get; set; } = null!;

    [MaxLength(500)]
    public string Line1 { get; set; } = null!;

    [MaxLength(500)]
    public string Line2 { get; set; } = null!;

    [MaxLength(500)]
    public string Line3 { get; set; } = null!;

    [MaxLength(500)]
    public string Line4 { get; set; } = null!;

    [MaxLength(500)]
    public string Line5 { get; set; } = null!;

    [MaxLength(500)]
    public string Remark1 { get; set; } = null!;

    [MaxLength(500)]
    public string Remark2 { get; set; } = null!;

    [MaxLength(500)]
    public string Remark3 { get; set; } = null!;

    [MaxLength(500)]
    public string Remark4 { get; set; } = null!;

    [MaxLength(500)]
    public string Remark5 { get; set; } = null!;

    public bool IsActive { get; set; }

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
