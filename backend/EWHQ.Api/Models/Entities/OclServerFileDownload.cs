using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("OclServerFileDownload")]
public class OclServerFileDownload
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int DownloadId { get; set; }

    [MaxLength(50)]
    [Required]
    public string Filename { get; set; } = string.Empty;

    public bool IsMetaFile { get; set; }

    public DateTime UploadDatetime { get; set; }

    public bool IsUploadSuccess { get; set; }

    public int UploadRetryCount { get; set; }

    public bool IsLatestFile { get; set; }

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
