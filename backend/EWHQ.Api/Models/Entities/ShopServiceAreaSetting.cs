using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ShopServiceAreaSetting")]
public class ShopServiceAreaSetting
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int ZoneId { get; set; }

    [MaxLength(100)]
    [Required]
    public string ZoneName { get; set; } = string.Empty;

    public int ZoneTypeId { get; set; }

    public int DeliveryShopId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal MinAmount { get; set; }

    [Column(TypeName = "decimal(10, 0)")]
    public decimal DeliveryFee { get; set; }

    [MaxLength(2000)]
    [Required]
    public string Shape { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string Color { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string ShapeType { get; set; } = string.Empty;

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
