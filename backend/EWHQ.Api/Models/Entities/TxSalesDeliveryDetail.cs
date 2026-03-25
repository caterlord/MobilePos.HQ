using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TxSalesDeliveryDetail")]
public class TxSalesDeliveryDetail
{
    [Key]
    [Column(Order = 0)]
    public int TxSalesDeliveryDetailId { get; set; }

    public int TxSalesDeliveryHeaderId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int UserId { get; set; }

    [MaxLength(50)]
    [Required]
    public string UserName { get; set; } = string.Empty;

    public int TxSalesHeaderId { get; set; }

    [MaxLength(50)]
    [Required]
    public string TableCode { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string TxCode { get; set; } = string.Empty;

    public bool IsCompleted { get; set; }

    public DateTime TakeoutDatetime { get; set; }

    public DateTime? CompleteDatetime { get; set; }

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
