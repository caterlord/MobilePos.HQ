using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AddressMasterDistrict")]
public class AddressMasterDistrict
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int DistrictId { get; set; }

    [MaxLength(400)]
    [Required]
    public string DistrictName { get; set; } = string.Empty;

    [MaxLength(400)]
    public string DistrictNameAlt { get; set; } = null!;

    [MaxLength(400)]
    public string DistrictPath { get; set; } = null!;

    [MaxLength(400)]
    public string DistrictPathAlt { get; set; } = null!;

    [MaxLength(400)]
    public string DistrictDesc { get; set; } = null!;

    public int ClickCount { get; set; }

    public int DisplayIndex { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int? AreaId { get; set; }

    public bool IsReadOnly { get; set; }

}
