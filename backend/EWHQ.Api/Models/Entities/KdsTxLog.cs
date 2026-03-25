using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("KdsTxLog")]
public class KdsTxLog
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int KdsTxHeaderId { get; set; }

    public int KdsTxDetailId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int KdsTxLogId { get; set; }

    public int PreviousStatusId { get; set; }

    public int StatusId { get; set; }

    public int LogUserId { get; set; }

    [MaxLength(50)]
    [Required]
    public string LogUserName { get; set; } = string.Empty;

    public DateTime LogDateTime { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
