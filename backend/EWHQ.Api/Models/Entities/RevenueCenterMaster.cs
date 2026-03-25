using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("RevenueCenterMaster")]
public class RevenueCenterMaster
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int RevenueCenterId { get; set; }

    [MaxLength(50)]
    [Required]
    public string RevenueCenterCode { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string RevenueCenterName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string RevenueCenterNameAlt { get; set; } = null!;

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
