using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("UserGroupRight")]
public class UserGroupRight
{
    [Key]
    [Column(Order = 0)]
    public int GroupRightId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int GroupId { get; set; }

    public int GroupRightCodeId { get; set; }

    public bool CanRead { get; set; }

    public bool CanWrite { get; set; }

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
