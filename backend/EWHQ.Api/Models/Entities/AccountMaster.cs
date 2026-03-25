using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AccountMaster")]
public class AccountMaster
{
    [Key]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string AccountName { get; set; } = string.Empty;

    [MaxLength(100)]
    [Required]
    public string AccountKey { get; set; } = string.Empty;

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
