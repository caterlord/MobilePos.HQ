using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ShopWorkdayDetail")]
public class ShopWorkdayDetail
{
    [Key]
    [Column(Order = 0)]
    public int WorkdayDetailId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int WorkdayHeaderId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public DateTime OpenDatetime { get; set; }

    public DateTime CloseDatetime { get; set; }

    public bool IsClosed { get; set; }

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
