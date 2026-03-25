using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TableOrderTokenMapping")]
public class TableOrderTokenMapping
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int TableId { get; set; }

    public Guid TableToken { get; set; }

    public Guid? OrderToken { get; set; }

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
