#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TxSalesHeaderAddress")]
public class TxSalesHeaderAddress
{
    public int TxSalesHeaderId { get; set; }

    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string PhoneNum { get; set; } = string.Empty;

    [MaxLength(100)]
    public string CusName { get; set; }

    [MaxLength(500)]
    public string Line1 { get; set; }

    [MaxLength(500)]
    public string Line2 { get; set; }

    [MaxLength(500)]
    public string Line3 { get; set; }

    [MaxLength(500)]
    public string Line4 { get; set; }

    [MaxLength(500)]
    public string Line5 { get; set; }

    [MaxLength(500)]
    public string Remark1 { get; set; }

    [MaxLength(500)]
    public string Remark2 { get; set; }

    [MaxLength(500)]
    public string Remark3 { get; set; }

    [MaxLength(500)]
    public string Remark4 { get; set; }

    [MaxLength(500)]
    public string Remark5 { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int ShopId { get; set; }

}
