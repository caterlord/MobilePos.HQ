using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AddressMasterEstate")]
public class AddressMasterEstate
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int EstateId { get; set; }

    [MaxLength(400)]
    [Required]
    public string EstateName { get; set; } = string.Empty;

    [MaxLength(400)]
    public string EstateNameAlt { get; set; } = null!;

    [MaxLength(400)]
    public string EstatePath { get; set; } = null!;

    [MaxLength(400)]
    public string EstatePathAlt { get; set; } = null!;

    [MaxLength(400)]
    public string EstateDesc { get; set; } = null!;

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

    public int? DistrictId { get; set; }

    public int? StreetId { get; set; }

    public bool IsReadOnly { get; set; }

}
