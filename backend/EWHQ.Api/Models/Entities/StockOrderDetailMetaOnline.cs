#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockOrderDetailMetaOnline")]
public class StockOrderDetailMetaOnline
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int StockOrderHeaderId { get; set; }

    public int StockOrderDetailId { get; set; }

    public int SeqNo { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Qty { get; set; }

    [MaxLength(50)]
    public string Reason { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; }

    public DateTime? ArrivalDate { get; set; }

}
