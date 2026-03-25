using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ShopPrinterMaster")]
public class ShopPrinterMaster
{
    [Key]
    [Column(Order = 0)]
    public int ShopPrinterMasterId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string PrinterName { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? IsKds { get; set; }

    [MaxLength(200)]
    public string Remark { get; set; } = null!;

    [MaxLength(50)]
    public string RedirectToPrinterName { get; set; } = null!;

    public DateTime? RedirectDateTime { get; set; }

    public bool? IsDinein { get; set; }

    public bool? IsTakeaway { get; set; }

    public bool? IsLabelPrinter { get; set; }

}
