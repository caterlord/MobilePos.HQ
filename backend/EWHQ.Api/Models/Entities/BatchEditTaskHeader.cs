#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("BatchEditTaskHeader")]
public class BatchEditTaskHeader
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int TaskId { get; set; }

    [MaxLength(200)]
    [Required]
    public string TaskName { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string TaskDesc { get; set; }

    public int StatusId { get; set; }

    public DateTime? LastStatusUpdatedDate { get; set; }

    [MaxLengthUnlimited]
    public string DataScope { get; set; }

    [MaxLengthUnlimited]
    public string ShopScope { get; set; }

    public int EffectiveTypeId { get; set; }

    public DateTime? EffectiveDatetime { get; set; }

    public bool IsManualEffectiveDatetimeEnabled { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public DateTime? EffectiveDatetimeWithTimezoneOffset { get; set; }

    public int? TimeZoneId { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? TimeZoneValue { get; set; }

    public bool? TimeZoneUseDaylightTime { get; set; }

}
