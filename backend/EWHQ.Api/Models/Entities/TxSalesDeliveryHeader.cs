using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TxSalesDeliveryHeader")]
public class TxSalesDeliveryHeader
{
    [Key]
    [Column(Order = 0)]
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
