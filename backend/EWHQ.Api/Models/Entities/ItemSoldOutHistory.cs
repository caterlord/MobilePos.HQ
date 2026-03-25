#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemSoldOutHistory")]
public class ItemSoldOutHistory
{
    [Key]
    [Column(Order = 0)]
    public int ItemSoldOutHistoryId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int ItemId { get; set; }

    [MaxLength(50)]
    [Required]
    public string ItemName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 3)")]
    public decimal ItemQty { get; set; }

    public bool IsLimitedItem { get; set; }

    public DateTime SoldOutDatetime { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int? ReasonId { get; set; }

    [MaxLength(10)]
    public string ReasonCode { get; set; }

    [MaxLength(500)]
    public string ReasonDesc { get; set; }

}
