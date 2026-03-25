using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("TaiwanUniformInvoiceBasic")]
public class TaiwanUniformInvoiceBasic
{
    public int SerialNumber { get; set; }

    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public DateTime CreateDate { get; set; }

    [MaxLength(200)]
    [Required]
    public string ShopName { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string Tel { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string Address { get; set; } = string.Empty;

    public int Identifier { get; set; }

    public int InvoiceType { get; set; }

    [MaxLength(50)]
    [Required]
    public string PlatformAccount { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string PlatformPassword { get; set; } = string.Empty;

    public bool IsOfficialPlatform { get; set; }

    public bool IsPrintDetail { get; set; }

    public bool IsPrintThirdForm { get; set; }

    public bool IsSingleItem { get; set; }

    [MaxLength(50)]
    [Required]
    public string SingleItem { get; set; } = string.Empty;

    [MaxLengthUnlimited]
    [Required]
    public string Detail { get; set; } = string.Empty;

    [MaxLengthUnlimited]
    [Required]
    public string ThirdForm { get; set; } = string.Empty;

    public int DetailFontSize { get; set; }

    public int ThirdFormFontSize { get; set; }

}
