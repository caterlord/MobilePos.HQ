#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AddressDeliveryMapping")]
public class AddressDeliveryMapping
{
    [Key]
    [Column(Order = 0)]
    public int DeliveryId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int? AddressId { get; set; }

    public int? AddressBuildingId { get; set; }

    public int? AddressShopId { get; set; }

    [MaxLength(25)]
    public string KinShunId { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; }

}
