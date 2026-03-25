#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ThirdPartyReservation")]
public class ThirdPartyReservation
{
    [Key]
    [Column(Order = 0)]
    public int ThirdPartyReservationId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [MaxLength(200)]
    public string ReservationId { get; set; }

    public int? TxSalesHeaderId { get; set; }

    [MaxLength(50)]
    public string ReservationState { get; set; }

    [MaxLength(4000)]
    public string Note { get; set; }

    [MaxLength(1000)]
    public string Tables { get; set; }

    [MaxLength(50)]
    public string ReservationType { get; set; }

    public int? GroupSize { get; set; }

    [MaxLength(200)]
    public string CustomerId { get; set; }

    [MaxLength(4000)]
    public string CustomerNote { get; set; }

    public long? EstimatedReadyTime { get; set; }

    public long? ReservationTime { get; set; }

    [MaxLength(200)]
    public string SerialNumber { get; set; }

    public long? StateChangeTime { get; set; }

    public int? NumberOfKidChairs { get; set; }

    public int? NumberOfKidSets { get; set; }

    [MaxLength(50)]
    public string ContactCustomerId { get; set; }

    [MaxLength(50)]
    public string CanceledBy { get; set; }

    [MaxLength(50)]
    public string CreatedFrom { get; set; }

    public long? CreatedTime { get; set; }

    [MaxLength(100)]
    [Required]
    public string ServiceProviderTag { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
