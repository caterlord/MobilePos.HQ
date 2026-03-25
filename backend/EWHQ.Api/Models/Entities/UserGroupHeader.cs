#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("UserGroupHeader")]
public class UserGroupHeader
{
    [Key]
    [Column(Order = 0)]
    public int GroupId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    [Required]
    public string AltName { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(50)]
    public string GroupType { get; set; }

}
