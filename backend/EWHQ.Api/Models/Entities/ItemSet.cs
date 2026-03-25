using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemSet")]
public class ItemSet
{
    [Key]
    [Column(Order = 0)]
    public int ItemSetId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int? ItemId { get; set; }

    public int? GroupHeaderId { get; set; }

    public int? Seq { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? LinkType { get; set; }

}
