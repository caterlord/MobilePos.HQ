#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("CashDrawerDetail")]
public class CashDrawerDetail
{
    [Key]
    [Column(Order = 0)]
    public int CashDrawerDetailId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(10)]
    [Required]
    public string CashDrawerCode { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal OpenAmount { get; set; }

    public DateTime OpenDatetime { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? CloseAmount { get; set; }

    public DateTime? CloseDatetime { get; set; }

    public int WorkdayDetailId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? CloseActualAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? CloseAmountDifferent { get; set; }

    [MaxLength(4000)]
    public string RemarkData { get; set; }

}
