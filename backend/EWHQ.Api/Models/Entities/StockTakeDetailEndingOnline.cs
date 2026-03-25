using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockTakeDetailEndingOnline")]
public class StockTakeDetailEndingOnline
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int StockTakeHeaderId { get; set; }

    public int RawMaterialId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? OriginalQty { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TranOut { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TranIn { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Wastage { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Ending { get; set; }

    [MaxLength(255)]
    public string Remark { get; set; } = null!;

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; } = null!;

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? OpenCheck { get; set; }

}
