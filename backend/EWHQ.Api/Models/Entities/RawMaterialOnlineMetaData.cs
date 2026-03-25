using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("RawMaterialOnlineMetaData")]
public class RawMaterialOnlineMetaData
{
    public int AccountId { get; set; }

    public int? RawMaterialDepartmentId { get; set; }

    public int? RawMaterialCategoryId { get; set; }

    public int RawMaterialId { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; } = null!;

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; } = null!;

    public int? OrderQtyMultiplier { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? EndingQtyMultiplier { get; set; }

    [MaxLength(50)]
    public string LinkedItemCode { get; set; } = null!;

    public int? SeqNo { get; set; }

    [MaxLength(200)]
    public string CategoryName { get; set; } = null!;

    public int? ArrivalDay { get; set; }

}
