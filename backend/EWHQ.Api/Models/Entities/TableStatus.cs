using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TableStatus")]
public class TableStatus
{
    [Key]
    [Column(Order = 0)]
    public int TableStatusId { get; set; }

    [MaxLength(50)]
    [Required]
    public string StatusName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string StatusNameAlt { get; set; } = null!;

    public int? ButtonStyleId { get; set; }

    public bool Enabled { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string CreatedBy { get; set; } = null!;

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string ModifiedBy { get; set; } = null!;

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

}
