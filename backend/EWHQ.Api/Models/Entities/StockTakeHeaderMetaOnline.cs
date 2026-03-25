using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockTakeHeaderMetaOnline")]
public class StockTakeHeaderMetaOnline
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int OrderHeaderId { get; set; }

    public int StockTakeStatusId { get; set; }

    public int? DepartmentId { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; } = null!;

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; } = null!;

    public DateTime? AnalysisDateFrom { get; set; }

    public DateTime? AnalysisDateTo { get; set; }

    public DateTime? CompletedDatetime { get; set; }

}
