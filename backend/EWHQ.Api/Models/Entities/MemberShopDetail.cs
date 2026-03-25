using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("MemberShopDetail")]
public class MemberShopDetail
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int MemberDetailId { get; set; }

    [MaxLength(100)]
    [Required]
    public string ShopName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal ShopTotalPointsBalance { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal ShopTotalPrepaidBalance { get; set; }

    public DateTime? LastTxDateTime { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? LastTxAmount { get; set; }

    public int? LastTxSalesHeaderId { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [Column(TypeName = "decimal(13, 2)")]
    public decimal? AccAmountTotal { get; set; }

}
