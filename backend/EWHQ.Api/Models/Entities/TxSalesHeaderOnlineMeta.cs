#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TxSalesHeaderOnlineMeta")]
public class TxSalesHeaderOnlineMeta
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int TxSalesHeaderOnlineMetaId { get; set; }

    public int DeliveryShopId { get; set; }

    public int TxSalesHeaderId { get; set; }

    public int StatusId { get; set; }

    public DateTime OrderedDateTime { get; set; }

    public DateTime? ReceivedDateTime { get; set; }

    public DateTime? AcceptedDateTime { get; set; }

    public int? AcceptedByUserId { get; set; }

    [MaxLength(50)]
    public string AcceptedBy { get; set; }

    public DateTime? RejectedDateTime { get; set; }

    public int? RejectedByUserId { get; set; }

    [MaxLength(50)]
    public string RejectedBy { get; set; }

    public int? RejectedReasonId { get; set; }

    [MaxLength(500)]
    public string RejectedReasonDesc { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(400)]
    public string ContactName { get; set; }

    [MaxLength(400)]
    public string ContactEmail { get; set; }

    [MaxLength(100)]
    public string ContactPhone { get; set; }

    public bool? IsPickup { get; set; }

    public bool? IsDelivery { get; set; }

    public bool? IsNow { get; set; }

    public bool? IsLater { get; set; }

    public DateTime? LaterDateTime { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? DeliveryMin { get; set; }

    [MaxLength(400)]
    public string PaypalTxnId { get; set; }

    public bool? IsDeliveryOutOfRange { get; set; }

    public bool? IsKitchenSlipPrinted { get; set; }

    public bool? IsReceiptPrinted { get; set; }

    [MaxLength(1000)]
    public string DeliveryAddress { get; set; }

    public bool? IsFacebookMessengerOrder { get; set; }

    [MaxLength(100)]
    public string FacebookUserId { get; set; }

    public int? TransferredFromShopId { get; set; }

    public int? TransferredByUserId { get; set; }

    [MaxLength(50)]
    public string TransferredByUserName { get; set; }

    public bool? IsCODOrder { get; set; }

    public int? CODCompleteShopId { get; set; }

    [MaxLength(100)]
    public string CODCompleteShopName { get; set; }

    public int? CODCompleteByUserId { get; set; }

    [MaxLength(50)]
    public string CODCompleteByUserName { get; set; }

    [MaxLength(10)]
    public string CODCashDrawerCode { get; set; }

    public int? CODWorkdayDetailId { get; set; }

    public int? CODWorkdayPeriodDetailId { get; set; }

}
