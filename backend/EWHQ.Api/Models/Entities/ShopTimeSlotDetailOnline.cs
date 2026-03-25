using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ShopTimeSlotDetailOnline")]
public class ShopTimeSlotDetailOnline
{
    [Key]
    [Column(Order = 0)]
    public int TimeSlotDetailId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int TimeSlotHeaderId { get; set; }

    public DateTime AvailabilityDate { get; set; }

    [MaxLength(1)]
    [Required]
    public string Week { get; set; } = string.Empty;

    public int Period { get; set; }

    public int Slot1 { get; set; }

    public int Slot2 { get; set; }

    public int Slot3 { get; set; }

    public int Slot4 { get; set; }

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
