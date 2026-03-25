using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("PromoHeader")]
public class PromoHeader
{
    [Key]
    [Column(Order = 0)]
    public int PromoHeaderId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string PromoCode { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string PromoName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal PromoSaveAmount { get; set; }

    public int? Priority { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsCoexistPromo { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public TimeSpan? StartTime { get; set; }

    public TimeSpan? EndTime { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? FlatPrice { get; set; }

    public bool? IsAmountDeductEvenly { get; set; }

    [MaxLength(100)]
    public string? DayOfWeeks { get; set; }

    [MaxLength(100)]
    public string? Months { get; set; }

    [MaxLength(150)]
    public string? Dates { get; set; }

    public bool? IsPromoDetailMatchMustExist { get; set; }

}
