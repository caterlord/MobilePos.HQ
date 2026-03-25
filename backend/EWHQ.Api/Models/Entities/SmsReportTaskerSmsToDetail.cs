using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("SmsReportTaskerSmsToDetail")]
public class SmsReportTaskerSmsToDetail
{
    public int SmsReportTaskerHeaderId { get; set; }

    public int AccountId { get; set; }

    [MaxLength(20)]
    [Required]
    public string SmsTo { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    public bool Deleted { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
