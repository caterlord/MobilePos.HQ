#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TaiwanUniformInvoiceBody")]
public class TaiwanUniformInvoiceBody
{
    public int SerialNumber { get; set; }

    public int AccountId { get; set; }

    public int ShopId { get; set; }

    [MaxLength(10)]
    public string InvoiceNumber { get; set; }

    [MaxLength(256)]
    [Required]
    public string ItemName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(12, 7)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(19, 7)")]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "decimal(19, 7)")]
    public decimal Amount { get; set; }

    [MaxLength(40)]
    [Required]
    public string Remark { get; set; } = string.Empty;

    public DateTime BillingDate { get; set; }

    public int TxSalesHeaderId { get; set; }

    public int ItemOrder { get; set; }

    public bool? IsNonTaxableItem { get; set; }

}
