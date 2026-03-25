using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("PreprintedCouponAvtivityLog")]
public class PreprintedCouponAvtivityLog
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int ActivityLogId { get; set; }

    public DateTime LogDateTime { get; set; }

    public int ActivityTypeId { get; set; }

    [MaxLength(200)]
    [Required]
    public string CouponStartCode { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string CouponEndCode { get; set; } = string.Empty;

    public int? RefTxSalesHeaderId { get; set; }

    [MaxLength(50)]
    public string TargetShopCode { get; set; } = null!;

    public bool IsSuccess { get; set; }

    public int? UserId { get; set; }

    [MaxLength(100)]
    public string UserName { get; set; } = null!;

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
