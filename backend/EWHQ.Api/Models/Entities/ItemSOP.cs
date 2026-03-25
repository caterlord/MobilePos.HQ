using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ItemSOP")]
public class ItemSOP
{
    [Key]
    [Column(Order = 0)]
    public int ItemSOPId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    public int ItemId { get; set; }

    [MaxLength(200)]
    [Required]
    public string SOPPath { get; set; } = string.Empty;

    [MaxLength(2000)]
    [Required]
    public string SOPDesc { get; set; } = string.Empty;

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
