using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("CashDrawerHeader")]
public class CashDrawerHeader
{
    [MaxLength(10)]
    [Required]
    public string CashDrawerCode { get; set; } = string.Empty;

    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string CashDrawerName { get; set; } = string.Empty;

    public int ShopId { get; set; }

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
