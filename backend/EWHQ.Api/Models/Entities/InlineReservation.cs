using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("InlineReservation")]
public class InlineReservation
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    [MaxLength(200)]
    [Required]
    public string ReservationId { get; set; } = string.Empty;

    public int? TxSalesHeaderId { get; set; }

    [MaxLength(200)]
    public string CustomerId { get; set; } = null!;

    [MaxLength(4000)]
    public string CustomerNote { get; set; } = null!;

    [MaxLength(4000)]
    public string Note { get; set; } = null!;

    public long? EstimatedReadyTime { get; set; }

    public long? ReservationTime { get; set; }

    [MaxLength(200)]
    public string SerialNumber { get; set; } = null!;

    [MaxLengthUnlimited]
    public string Tables { get; set; } = null!;

    [MaxLength(50)]
    public string Type { get; set; } = null!;

    [MaxLength(50)]
    public string State { get; set; } = null!;

    public long? StateChangeTime { get; set; }

    public int? GroupSize { get; set; }

    public int? NumberOfKidChairs { get; set; }

    public int? NumberOfKidSets { get; set; }

    [MaxLength(50)]
    public string ContactCustomerId { get; set; } = null!;

    [MaxLength(50)]
    public string CanceledBy { get; set; } = null!;

    [MaxLength(50)]
    public string CreatedFrom { get; set; } = null!;

    public long? CreatedTime { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
