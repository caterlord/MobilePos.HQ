#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("WorkdayPeriodMaster")]
public class WorkdayPeriodMaster
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int WorkdayPeriodMasterId { get; set; }

    [MaxLength(50)]
    [Required]
    public string PeriodName { get; set; } = string.Empty;

    public TimeSpan? DefaultFromTime { get; set; }

    public TimeSpan? DefaultToTime { get; set; }

    public int? DayDelta { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? PeriodCode { get; set; }

}
