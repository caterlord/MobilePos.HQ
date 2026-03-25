#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("PayInOut")]
public class PayInOut
{
    [Key]
    [Column(Order = 0)]
    public int PayInOutId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int WorkdayDetailId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Amount { get; set; }

    [MaxLength(10)]
    [Required]
    public string ReasonCode { get; set; } = string.Empty;

    [MaxLength(500)]
    [Required]
    public string ReasonDesc { get; set; } = string.Empty;

    public int PayUserId { get; set; }

    [MaxLength(50)]
    [Required]
    public string PayUserName { get; set; } = string.Empty;

    public DateTime PayDateTime { get; set; }

    [MaxLength(10)]
    [Required]
    public string CashDrawerCode { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? IsCashPayment { get; set; }

    [MaxLengthUnlimited]
    public string RemarkData { get; set; }

    [MaxLength(4000)]
    public string RemarkString { get; set; }

}
