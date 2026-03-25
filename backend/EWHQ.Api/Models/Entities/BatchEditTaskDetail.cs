#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("BatchEditTaskDetail")]
public class BatchEditTaskDetail
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int TaskId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int TaskDetailId { get; set; }

    [MaxLengthUnlimited]
    public string TaskDetailData { get; set; }

    public DateTime? ExecutionDatetime { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLengthUnlimited]
    public string BackupTaskDetailData { get; set; }

}
