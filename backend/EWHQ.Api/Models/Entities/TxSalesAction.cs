using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TxSalesAction")]
public class TxSalesAction
{
    [Key]
    public int ActionId { get; set; }

    [MaxLength(50)]
    [Required]
    public string ActionName { get; set; } = string.Empty;

    [MaxLength(1000)]
    [Required]
    public string ActionTemplate { get; set; } = string.Empty;

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
