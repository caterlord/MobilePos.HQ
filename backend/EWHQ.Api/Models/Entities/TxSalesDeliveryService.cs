using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("TxSalesDeliveryService")]
public class TxSalesDeliveryService
{
    [Key]
    [Column(Order = 0)]
    public int TxSalesDeliveryServiceId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int TxSalesHeaderId { get; set; }

    [MaxLength(50)]
    [Required]
    public string Service { get; set; } = string.Empty;

    [MaxLength(50)]
    public string OrderId { get; set; } = null!;

    [MaxLength(500)]
    public string OrderInfo { get; set; } = null!;

    [MaxLengthUnlimited]
    public string OrderDetail { get; set; } = null!;

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; } = null!;

    public DateTime? CancelledDate { get; set; }

    [MaxLength(50)]
    public string CancelledBy { get; set; } = null!;

}
