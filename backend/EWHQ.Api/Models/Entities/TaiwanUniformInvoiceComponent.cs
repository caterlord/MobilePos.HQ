using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TaiwanUniformInvoiceComponent")]
public class TaiwanUniformInvoiceComponent
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
    public string CustomName { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string MachineType { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string MachineModel { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string ConnectType { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string ConnectContent { get; set; } = string.Empty;

    public int BaudRate { get; set; }

    public bool IsPrintInvoice { get; set; }

    public bool IsCashBox { get; set; }

    public bool IsCheckMode { get; set; }

    public bool IsPrintLogo { get; set; }

}
