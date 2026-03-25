#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockTakeDetailEndingTranOutOnline")]
public class StockTakeDetailEndingTranOutOnline
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int StockTakeHeaderId { get; set; }

    public int RawMaterialId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TranOut { get; set; }

    [MaxLength(50)]
    [Required]
    public string ToShopCode { get; set; } = string.Empty;

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; }

}
