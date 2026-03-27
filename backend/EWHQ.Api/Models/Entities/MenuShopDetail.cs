using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("MenuShopDetail")]
public class MenuShopDetail
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int MenuId { get; set; }

    [MaxLength(100)]
    public string? DaysOfWeek { get; set; }

    [MaxLength(150)]
    public string? Dates { get; set; }

    [MaxLength(100)]
    public string? Months { get; set; }

    public TimeSpan? DisplayFromTime { get; set; }

    public TimeSpan? DisplayToTime { get; set; }

    public bool IsPublicDisplay { get; set; }

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
