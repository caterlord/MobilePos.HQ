#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("AddressMasterStreet")]
public class AddressMasterStreet
{
    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 0)]
    public int StreetId { get; set; }

    [MaxLength(400)]
    [Required]
    public string StreetName { get; set; } = string.Empty;

    [MaxLength(400)]
    public string StreetNameAlt { get; set; }

    [MaxLength(400)]
    public string StreetPath { get; set; }

    [MaxLength(400)]
    public string StreetPathAlt { get; set; }

    [MaxLength(400)]
    public string StreetDesc { get; set; }

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

    public bool IsReadOnly { get; set; }

}
