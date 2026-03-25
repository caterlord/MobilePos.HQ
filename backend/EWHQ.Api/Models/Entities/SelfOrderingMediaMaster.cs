using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("SelfOrderingMediaMaster")]
public class SelfOrderingMediaMaster
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int MediaId { get; set; }

    [MaxLength(50)]
    [Required]
    public string MediaType { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string MediaDesc { get; set; } = null!;

    [MaxLength(200)]
    public string MediaFileName { get; set; } = null!;

    public bool IsPublished { get; set; }

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
