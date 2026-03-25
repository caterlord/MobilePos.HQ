#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemMasterMetaOnline")]
public class ItemMasterMetaOnline
{
    public int ItemId { get; set; }

    public int AccountId { get; set; }

    [MaxLength(200)]
    public string OdoImageFileName1 { get; set; }

    [MaxLength(200)]
    public string OdoImageFileName2 { get; set; }

    [MaxLength(200)]
    public string OdoImageFileName3 { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int? ProductionSeconds { get; set; }

}
