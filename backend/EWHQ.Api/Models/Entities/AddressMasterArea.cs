using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AddressMasterArea")]
public class AddressMasterArea
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int AreaId { get; set; }

    [MaxLength(400)]
    [Required]
    public string AreaName { get; set; } = string.Empty;

    [MaxLength(400)]
    public string AreaNameAlt { get; set; } = null!;

    [MaxLength(400)]
    public string AreaPath { get; set; } = null!;

    [MaxLength(400)]
    public string AreaPathAlt { get; set; } = null!;

    [MaxLength(400)]
    public string AreaDesc { get; set; } = null!;

    public int ClickCount { get; set; }

    public int DisplayIndex { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsReadOnly { get; set; }

}
