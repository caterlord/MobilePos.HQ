#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TxSalesHeaderLog")]
public class TxSalesHeaderLog
{
    [Key]
    [Column(Order = 0)]
    public int TxSalesHeaderLogId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int UserId { get; set; }

    [MaxLength(50)]
    [Required]
    public string UserName { get; set; } = string.Empty;

    public DateTime LogDateTime { get; set; }

    public int? TxSalesHeaderlId { get; set; }

    public int TxActionId { get; set; }

    [MaxLength(50)]
    public string ResultSource { get; set; }

    [MaxLength(50)]
    public string ResultTarget { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

}
