#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("MediaLibrary")]
public class MediaLibrary
{
    [Key]
    public int ImageId { get; set; }

    [MaxLength(200)]
    [Required]
    public string Title { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string Tags { get; set; }

    [MaxLength(200)]
    [Required]
    public string FileName { get; set; } = string.Empty;

    public bool IsPublished { get; set; }

    public bool Enabled { get; set; }

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

}
