using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AddressMasterBuilding")]
public class AddressMasterBuilding
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int BuildingId { get; set; }

    [MaxLength(400)]
    [Required]
    public string BuildingName { get; set; } = string.Empty;

    [MaxLength(400)]
    public string BuildingNameAlt { get; set; } = null!;

    [MaxLength(400)]
    public string BuildingPath { get; set; } = null!;

    [MaxLength(400)]
    public string BuildingPathAlt { get; set; } = null!;

    [MaxLength(400)]
    public string BuildingDesc { get; set; } = null!;

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

    public int? EstateId { get; set; }

    public bool IsReadOnly { get; set; }

}
