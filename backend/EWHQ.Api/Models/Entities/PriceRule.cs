#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("PriceRule")]
public class PriceRule
{
    [Key]
    [Column(Order = 0)]
    public int RuleId { get; set; }

    public int GroupId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(20)]
    [Required]
    public string RuleCode { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string RuleName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; }

    public bool Enabled { get; set; }

    public bool IsTimeRange { get; set; }

    public TimeSpan StartTime { get; set; }

    public TimeSpan EndTime { get; set; }

    public bool IsEveryMon { get; set; }

    public bool IsEveryTue { get; set; }

    public bool IsEveryWed { get; set; }

    public bool IsEveryThu { get; set; }

    public bool IsEveryFri { get; set; }

    public bool IsEverySat { get; set; }

    public bool IsEverySun { get; set; }

    public bool IsEveryHoliday { get; set; }

    public bool IsDateRange { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string Method { get; set; } = string.Empty;

    public int Seq { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
