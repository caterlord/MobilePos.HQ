using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StockLevelShopDetail")]
public class StockLevelShopDetail
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int RawMaterialId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal StockLevelCount { get; set; }

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
