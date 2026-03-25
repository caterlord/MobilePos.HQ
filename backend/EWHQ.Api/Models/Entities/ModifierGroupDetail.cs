#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ModifierGroupDetail")]
public class ModifierGroupDetail
{
    public int GroupHeaderId { get; set; }

    public int ItemId { get; set; }

    public int AccountId { get; set; }

    public int DisplayIndex { get; set; }

    public bool Enabled { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; }

}
