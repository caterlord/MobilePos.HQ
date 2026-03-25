using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ReportAccountMappingOnline")]
public class ReportAccountMappingOnline
{
    public int AccountId { get; set; }

    public int SeqNo { get; set; }

    public int SubSeqNo { get; set; }

    [MaxLength(50)]
    [Required]
    public string AcctCode { get; set; } = string.Empty;

    [MaxLength(50)]
    [Required]
    public string MappingPosType { get; set; } = string.Empty;

    public int MappingPosId { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; } = null!;

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; } = null!;

    public DateTime? ModifiedDate { get; set; }

    public int? Multiplier { get; set; }

}
