#nullable disable warnings

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
    public string? BundlePromoCode { get; set; }

    [MaxLength(500)]
    public string? BundlePromoName { get; set; }

    [MaxLength(4000)]
    public string? BundlePromoDesc { get; set; }

    public bool IsAvailable { get; set; }

    public int Priority { get; set; }

    public bool Enabled { get; set; }

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    public string? ModifiedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    public string? CreatedBy { get; set; }

    public int BundlePromoHeaderTypeId { get; set; }

    public int BundlePromoRefId { get; set; }

}
