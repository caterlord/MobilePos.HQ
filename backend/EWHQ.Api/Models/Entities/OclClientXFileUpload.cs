using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("OclClientXFileUpload")]
public class OclClientXFileUpload
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int UploadId { get; set; }

    public int WorkdayDetailId { get; set; }

    [MaxLength(50)]
    [Required]
    public string Filename { get; set; } = string.Empty;

    public DateTime GenDatetime { get; set; }

    public bool IsGenSuccess { get; set; }

    public int GenRetryCount { get; set; }

    public DateTime UploadDatetime { get; set; }

    public bool IsUploadSuccess { get; set; }

    public int UploadRetryCount { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public DateTime? UploadToOclDatetime { get; set; }

    public bool IsUploadToOclSuccess { get; set; }

    public int? UploadToOclRetryCount { get; set; }

    public bool IsReadyForUploadToOcl { get; set; }

}
