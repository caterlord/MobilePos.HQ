#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockOrderHeader")]
public class StockOrderHeader
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int OrderHeaderId { get; set; }

    public int OrderTypeId { get; set; }

    [MaxLength(200)]
    [Required]
    public string OrderRef { get; set; } = string.Empty;

    public bool IsStockTransfer { get; set; }

    public bool IsOrderAutoStockIn { get; set; }

    public DateTime? DueDate { get; set; }

    public int? OrderFromSupplierId { get; set; }

    public int? TransferFromShopId { get; set; }

    public int? OrderToShopId { get; set; }

    [MaxLength(4000)]
    public string Remark { get; set; }

    public int OrderStatusId { get; set; }

    public DateTime? OrderSubmittedDatetime { get; set; }

    [MaxLength(50)]
    public string OrderSubmittedBy { get; set; }

    public DateTime? OrderReceivedDatetime { get; set; }

    [MaxLength(50)]
    public string OrderReceivedBy { get; set; }

    public DateTime? StockSendToShopDatetime { get; set; }

    [MaxLength(50)]
    public string StockSendToShopBy { get; set; }

    public DateTime? StockReceivedByShopDatetime { get; set; }

    [MaxLength(50)]
    public string StockReceivedByShopBy { get; set; }

    [MaxLength(200)]
    public string OrderRef2 { get; set; }

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
