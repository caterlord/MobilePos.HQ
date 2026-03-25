using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("DbMasterTableTranslation")]
public class DbMasterTableTranslation
{
    public int AccountId { get; set; }

    [MaxLength(100)]
    [Required]
    public string DbTableName { get; set; } = string.Empty;

    [MaxLength(100)]
    [Required]
    public string DbFieldName { get; set; } = string.Empty;

    public int DbFieldId { get; set; }

    [MaxLength(50)]
    [Required]
    public string LanguageCode { get; set; } = string.Empty;

    [MaxLengthUnlimited]
    [Required]
    public string ParamValue { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
