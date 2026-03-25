#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ReportTurnoverDetail")]
public class ReportTurnoverDetail
{
    [Key]
    [Column(Order = 0)]
    public int ReportTurnoverDetailId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int ReportTurnoverHeaderId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int ItemTypeId { get; set; }

    [MaxLength(200)]
    [Required]
    public string ItemName { get; set; } = string.Empty;

    public int ItemCount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal ItemValue { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ItemCode { get; set; }

}
