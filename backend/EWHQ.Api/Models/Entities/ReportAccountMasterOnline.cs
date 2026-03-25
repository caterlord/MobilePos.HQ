#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ReportAccountMasterOnline")]
public class ReportAccountMasterOnline
{
    public int AccountId { get; set; }

    public int SeqNo { get; set; }

    public int SubSeqNo { get; set; }

    [MaxLength(50)]
    [Required]
    public string AcctCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string AcctName { get; set; }

    [MaxLength(10)]
    public string AcctType { get; set; }

    [MaxLength(50)]
    public string AcctTypeName { get; set; }

    [MaxLength(50)]
    public string RptType { get; set; }

    [MaxLength(50)]
    public string AcctProp { get; set; }

    public bool? Enabled { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string AcctClass { get; set; }

    [MaxLength(50)]
    public string Classifications { get; set; }

}
