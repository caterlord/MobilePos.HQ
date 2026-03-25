using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("BundlePromoOverview")]
public class BundlePromoOverview
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int BundlePromoOverviewId { get; set; }

    [MaxLength(50)]
    [Required]
    public string BundlePromoCode { get; set; } = string.Empty;

    [MaxLength(500)]
    [Required]
    public string BundlePromoName { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string? BundlePromoDesc { get; set; }

    public bool IsAvailable { get; set; }

    public int Priority { get; set; }

    public bool Enabled { get; set; }

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public int BundlePromoHeaderTypeId { get; set; }

    public int BundlePromoRefId { get; set; }

}
