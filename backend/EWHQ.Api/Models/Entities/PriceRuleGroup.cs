using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("PriceRuleGroup")]
public class PriceRuleGroup
{
    [Key]
    [Column(Order = 0)]
    public int GroupId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(20)]
    [Required]
    public string GroupCode { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string GroupName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = null!;

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
