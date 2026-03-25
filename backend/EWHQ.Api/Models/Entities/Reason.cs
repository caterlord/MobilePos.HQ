using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("Reason")]
public class Reason
{
    [Key]
    [Column(Order = 0)]
    public int ReasonId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(10)]
    [Required]
    public string ReasonGroupCode { get; set; } = string.Empty;

    [MaxLength(10)]
    [Required]
    public string ReasonCode { get; set; } = string.Empty;

    [MaxLength(500)]
    [Required]
    public string ReasonDesc { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? IsSystemReason { get; set; }

}
