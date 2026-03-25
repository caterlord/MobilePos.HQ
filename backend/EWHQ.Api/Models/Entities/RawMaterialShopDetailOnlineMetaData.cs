#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("RawMaterialShopDetailOnlineMetaData")]
public class RawMaterialShopDetailOnlineMetaData
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int RawMaterialId { get; set; }

    public int ParLevel { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; }

    [Column(TypeName = "decimal(13, 5)")]
    public decimal? CostPerUnit { get; set; }

}
