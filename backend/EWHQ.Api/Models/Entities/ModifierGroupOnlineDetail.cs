using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ModifierGroupOnlineDetail")]
public class ModifierGroupOnlineDetail
{
    public int AccountId { get; set; }

    public int GroupHeaderId { get; set; }

    public int? OdoGroupColumnSize { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(50)]
    public string OdoGroupType { get; set; } = null!;

}
