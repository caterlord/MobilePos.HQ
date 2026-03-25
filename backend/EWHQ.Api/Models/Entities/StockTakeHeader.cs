using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("StockTakeHeader")]
public class StockTakeHeader
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int StockTakeHeaderId { get; set; }

    [MaxLength(100)]
    public string ShopName { get; set; } = null!;

    public bool? IsFullCount { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLengthUnlimited]
    public string Remark { get; set; } = null!;

    [MaxLength(1000)]
    [Required]
    public string StockTakeRef { get; set; } = string.Empty;

    public int StockTakeStatusId { get; set; }

    public DateTime StartedDatetime { get; set; }

    public DateTime? CompletedDatetime { get; set; }

    [MaxLength(50)]
    public string SubmittedBy { get; set; } = null!;

}
