using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("PromoDetail")]
public class PromoDetail
{
    [Key]
    [Column(Order = 0)]
    public int PromoDetailId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int PromoHeaderId { get; set; }

    public int? PromoItemId { get; set; }

    public int? ParentItemId { get; set; }

    public int ParentCategoryId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PriceSpecific { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? IsOptionalItem { get; set; }

    public bool? IsReplaceItem { get; set; }

    public bool? IsItemCanReplace { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? PriceReplace { get; set; }

    public int? GroupIndex { get; set; }

    public int? RuleDeductTypeId { get; set; }

    public bool? IsDepartmentRevenue { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? DepartmentRevenue { get; set; }

}
