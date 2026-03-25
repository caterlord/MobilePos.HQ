#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("SmsReportLog")]
public class SmsReportLog
{
    [Key]
    public int SmsReportLogId { get; set; }

    public int SmsReportTaskerHeaderId { get; set; }

    public DateTime SendDate { get; set; }

    public bool IsSuccess { get; set; }

    [MaxLength(4000)]
    public string ErrorMessage { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
