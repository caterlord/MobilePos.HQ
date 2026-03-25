using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("Taxation")]
public class Taxation
{
    [Key]
    [Column(Order = 0)]
    public int TaxationId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    [Required]
    public string TaxationCode { get; set; } = string.Empty;

    [MaxLength(200)]
    [Required]
    public string TaxationName { get; set; } = string.Empty;

    public int Priority { get; set; }

    public bool IsDateSpecific { get; set; }

    public bool IsFixedAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TaxationPercent { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? TaxationAmount { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public TimeSpan? StartTime { get; set; }

    public TimeSpan? EndTime { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsAutoCalculate { get; set; }

    public bool IsOpenAmount { get; set; }

}
