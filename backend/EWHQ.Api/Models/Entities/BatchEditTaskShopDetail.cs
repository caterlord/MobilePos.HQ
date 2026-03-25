#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("BatchEditTaskShopDetail")]
public class BatchEditTaskShopDetail
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int TaskId { get; set; }

    public int StatusId { get; set; }

    [MaxLengthUnlimited]
    public string TaskShopDetailData { get; set; }

    public DateTime? ExecutionDatetime { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
