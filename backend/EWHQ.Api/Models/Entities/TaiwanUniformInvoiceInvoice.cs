using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TaiwanUniformInvoiceInvoice")]
public class TaiwanUniformInvoiceInvoice
{
    public int SerialNumber { get; set; }

    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public DateTime CreateDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string POSNumber { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string WordTrack { get; set; } = string.Empty;

    public int NumStart { get; set; }

    public int NumEnd { get; set; }

    public int Years { get; set; }

    public int Period { get; set; }

    public bool Available { get; set; }

    public int InvoiceNow { get; set; }

}
