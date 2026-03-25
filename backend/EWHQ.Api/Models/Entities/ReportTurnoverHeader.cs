using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ReportTurnoverHeader")]
public class ReportTurnoverHeader
{
    [Key]
    [Column(Order = 0)]
    public int ReportTurnoverHeaderId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public DateTime ClearingDatetime { get; set; }

    public DateTime LastPrintDatetime { get; set; }

    public int LastPrintCount { get; set; }

    [MaxLength(50)]
    [Required]
    public string LastPrintBy { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal DayTurnover { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal DayDiscount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal DayServiceFee { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal DayRounding { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal DayNetTurnoverAmount { get; set; }

    public int DayNetTurnoverTxCount { get; set; }

    public int UncloseTxCount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal UncloseTxAmount { get; set; }

    public int WorkdayDetailId { get; set; }

    public DateTime WorkdayOpenDatetime { get; set; }

    public DateTime WorkdayCloseDatetime { get; set; }

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
