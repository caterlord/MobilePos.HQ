using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ShopWorkdayPeriod")]
public class ShopWorkdayPeriod
{
    [Key]
    [Column(Order = 0)]
    public int WorkdayPeriodId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int WorkdayHeaderId { get; set; }

    [MaxLength(50)]
    [Required]
    public string PeriodName { get; set; } = string.Empty;

    public TimeSpan FromTime { get; set; }

    public TimeSpan ToTime { get; set; }

    public int DayDelta { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int? WorkdayPeriodMasterId { get; set; }

}
