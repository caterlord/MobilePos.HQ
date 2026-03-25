#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("CleanLocalSalesDataLog")]
public class CleanLocalSalesDataLog
{
    [Key]
    [Column(Order = 0)]
    public int CleanLocalSalesDataLogId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int WorkdayDetailId { get; set; }

    public DateTime WorkdayDate { get; set; }

    public byte Successful { get; set; }

    [MaxLength(150)]
    public string Message { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime ModifiedDate { get; set; }

    public int? RetryCount { get; set; }

}
