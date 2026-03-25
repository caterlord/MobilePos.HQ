#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("SmsReportTaskerHeader")]
public class SmsReportTaskerHeader
{
    [Key]
    [Column(Order = 0)]
    public int SmsReportTaskerHeaderId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int ReportId { get; set; }

    public int CycleTypeId { get; set; }

    [MaxLength(50)]
    public string HangfireStartScheduledJobId { get; set; }

    [MaxLength(50)]
    public string HangfireEndScheduledJobId { get; set; }

    [MaxLength(20)]
    [Required]
    public string SmsFrom { get; set; } = string.Empty;

    public DateTime StartFromDate { get; set; }

    public DateTime? EndFromDate { get; set; }

    public DateTime? NextSendDate { get; set; }

    public DateTime? LastSendDate { get; set; }

    public bool? IsLastSendSuccess { get; set; }

    public bool Enabled { get; set; }

    public bool Paused { get; set; }

    public bool Deleted { get; set; }

    public bool IsCustomizedDate { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? TimeZone { get; set; }

}
