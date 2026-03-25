using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemPrice")]
public class ItemPrice
{
    [Key]
    [Column(Order = 0)]
    public int ItemPriceId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int ItemId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Price { get; set; }

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
