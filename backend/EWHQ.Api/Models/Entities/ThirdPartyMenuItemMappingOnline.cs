#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("ThirdPartyMenuItemMappingOnline")]
public class ThirdPartyMenuItemMappingOnline
{
    public int OrderChannelId { get; set; }

    public int AccountId { get; set; }

    public int ItemId { get; set; }

    [MaxLength(200)]
    [Required]
    public string ThirdPartyItemOnlineId { get; set; } = string.Empty;

    public int ParentItemId { get; set; }

    public int ModifierGroupHeaderId { get; set; }

    public bool IsModifier { get; set; }

    public bool IsFollowSet { get; set; }

    [MaxLengthUnlimited]
    public string Remark { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int ShopId { get; set; }

}
