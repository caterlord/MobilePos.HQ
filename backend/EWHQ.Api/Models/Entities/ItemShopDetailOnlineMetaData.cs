using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemShopDetailOnlineMetaData")]
public class ItemShopDetailOnlineMetaData
{
    public int ItemId { get; set; }

    public int ShopId { get; set; }

    public int AccountId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? OriginalPrice { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? FoodpandaDeliveryPrice { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? FoodpandaPickupPrice { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DeliverooDeliveryPrice { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DeliverooPickupPrice { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? KeetaDeliveryPrice { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? KeetaPickupPrice { get; set; }

}
