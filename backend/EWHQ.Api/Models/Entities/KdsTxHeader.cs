using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("KdsTxHeader")]
public class KdsTxHeader
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int KdsTxHeaderId { get; set; }

    public int TxSalesHeaderId { get; set; }

    public int TxSalesDetailId { get; set; }

    public int ParentTxSalesDetailId { get; set; }

    public int BatchNum { get; set; }

    public int OverallStatusId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal CompletedProgress { get; set; }

    public bool IsSendOut { get; set; }

    public DateTime? SubmitDateTime { get; set; }

    public DateTime? CompleteDateTime { get; set; }

    public DateTime? SendOutDatetime { get; set; }

    public DateTime TxSalesDetailLastUpdateDateTime { get; set; }

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
