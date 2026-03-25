using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("KdsTxDetail")]
public class KdsTxDetail
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int KdsTxHeaderId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int KdsTxDetailId { get; set; }

    public int ShopPrinterMasterId { get; set; }

    [MaxLength(50)]
    [Required]
    public string PrinterName { get; set; } = string.Empty;

    public int StatusId { get; set; }

    public DateTime StatusChangeDatetime { get; set; }

    [MaxLength(50)]
    [Required]
    public string StatusChangeUserName { get; set; } = string.Empty;

    public int StatusChangeUserId { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsRecalledTx { get; set; }

}
