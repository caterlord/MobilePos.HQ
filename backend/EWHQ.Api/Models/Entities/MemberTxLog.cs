using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("MemberTxLog")]
public class MemberTxLog
{
    public int TxSalesHeaderId { get; set; }

    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int MemberDetailId { get; set; }

    [MaxLength(50)]
    [Required]
    public string MemberTypeName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal DeductAmount { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PointEarn { get; set; }

    public bool? IsExpired { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? ValueChanged { get; set; }

    public bool? IsPointEarnTx { get; set; }

    public bool? IsValueChangedTx { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MemberPointOpen { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MemberValueOpen { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MemberValueRemain { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MemberPointRemain { get; set; }

}
