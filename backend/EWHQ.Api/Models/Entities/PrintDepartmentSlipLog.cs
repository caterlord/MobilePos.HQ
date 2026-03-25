using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("PrintDepartmentSlipLog")]
public class PrintDepartmentSlipLog
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    public int TxSalesHeaderId { get; set; }

    public int TxSalesDetailId { get; set; }

    public int DeptRunningIndex { get; set; }

    public int PrintCount { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
