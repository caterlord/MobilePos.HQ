using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemModifierGroupMapping")]
public class ItemModifierGroupMapping
{
    public int AccountId { get; set; }

    public int ItemId { get; set; }

    public int GroupHeaderId { get; set; }

    public int Seq { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? ModifierLinkType { get; set; }

}
