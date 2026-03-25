using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TaiwanUniformInvoiceC0501")]
public class TaiwanUniformInvoiceC0501
{
    public int SerialNumber { get; set; }

    public int AccountId { get; set; }

    public int ShopId { get; set; }

    [MaxLength(10)]
    [Required]
    public string InvoiceNumber { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string InvalidDate { get; set; } = string.Empty;

    public bool IsUploaded { get; set; }

}
