#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TaiwanUniformInvoiceHeader")]
public class TaiwanUniformInvoiceHeader
{
    public int SerialNumber { get; set; }

    public int AccountId { get; set; }

    public int ShopId { get; set; }

    [MaxLength(50)]
    [Required]
    public string POSNumber { get; set; } = string.Empty;

    [MaxLength(10)]
    public string InvoiceNumber { get; set; }

    [MaxLength(50)]
    [Required]
    public string InvoiceDate { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string InvoiceTime { get; set; } = string.Empty;

    public int? BuyerIdentifier { get; set; }

    [MaxLength(60)]
    [Required]
    public string BuyerName { get; set; } = string.Empty;

    [MaxLength(100)]
    [Required]
    public string BuyerAddress { get; set; } = string.Empty;

    [MaxLength(26)]
    [Required]
    public string BuyerTelephoneNumber { get; set; } = string.Empty;

    [MaxLength(80)]
    [Required]
    public string BuyerEmailAddress { get; set; } = string.Empty;

    public int SalesAmount { get; set; }

    public int FreeTaxAmount { get; set; }

    public int ZeroTaxAmount { get; set; }

    public int TaxType { get; set; }

    [Column(TypeName = "decimal(3, 2)")]
    public decimal TaxRate { get; set; }

    public int TaxAmount { get; set; }

    public int TotalAmount { get; set; }

    [MaxLength(1)]
    [Required]
    public string PrintMark { get; set; } = string.Empty;

    [MaxLength(4)]
    [Required]
    public string RandomNumber { get; set; } = string.Empty;

    [MaxLength(200)]
    public string MainRemark { get; set; }

    [MaxLength(50)]
    public string CarrierType { get; set; }

    [MaxLength(200)]
    public string CarrierId1 { get; set; }

    [MaxLength(200)]
    public string CarrierId2 { get; set; }

    [MaxLength(8)]
    public string NPOBAN { get; set; }

    [MaxLength(50)]
    [Required]
    public string TableCode { get; set; } = string.Empty;

    public DateTime CheckinDate { get; set; }

    public DateTime BillingDate { get; set; }

    public int TxSalesHeaderId { get; set; }

    public int? TxInvalidHeaderId { get; set; }

    public int InvoiceType { get; set; }

    public int InvoiceOrder { get; set; }

    public int Clearance { get; set; }

    public int SubtotalAmount { get; set; }

    public int ServiceAmount { get; set; }

    public int DiscountAmount { get; set; }

    public int? MinChargeOffectAmount { get; set; }

    public bool IsNoInvoice { get; set; }

    public bool IsUploaded { get; set; }

    public bool IsInvalid { get; set; }

    public bool IsCancelled { get; set; }

    [MaxLength(1000)]
    [Required]
    public string PaymentString { get; set; } = string.Empty;

    [MaxLength(1000)]
    [Required]
    public string ReceivedAmountString { get; set; } = string.Empty;

    [MaxLength(1000)]
    [Required]
    public string ChangeString { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string TakewayCode { get; set; } = string.Empty;

    [MaxLength(1000)]
    [Required]
    public string MemberData { get; set; } = string.Empty;

    [MaxLength(1000)]
    [Required]
    public string RechargeCardData { get; set; } = string.Empty;

}
