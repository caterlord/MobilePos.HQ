#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("SmsReportTaskerParamDetail")]
public class SmsReportTaskerParamDetail
{
    public int SmsReportTaskerHeaderId { get; set; }

    public int AccountId { get; set; }

    public int ParamTypeId { get; set; }

    [MaxLength(4000)]
    public string Value { get; set; }

    public bool IsDefault { get; set; }

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
