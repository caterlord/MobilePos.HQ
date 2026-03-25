using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AuditTrailLog")]
public class AuditTrailLog
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int LogId { get; set; }

    [MaxLength(200)]
    [Required]
    public string PosCode { get; set; } = string.Empty;

    public DateTime LogDatetime { get; set; }

    [MaxLength(200)]
    [Required]
    public string ActionName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ActionRefId { get; set; } = null!;

    [MaxLength(200)]
    public string ActionRefDesc { get; set; } = null!;

    public int ActionUserId { get; set; }

    [MaxLength(200)]
    [Required]
    public string ActionUserName { get; set; } = string.Empty;

    public int? SecondaryActionUserId { get; set; }

    [MaxLength(200)]
    public string SecondaryActionUserName { get; set; } = null!;

    [MaxLength(200)]
    public string SourceName { get; set; } = null!;

    [MaxLength(50)]
    public string SourceRefId { get; set; } = null!;

    [MaxLength(200)]
    public string SourceRefDesc { get; set; } = null!;

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
