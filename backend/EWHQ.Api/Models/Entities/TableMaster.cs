#nullable disable warnings

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("TableMaster")]
public class TableMaster
{
    [Key]
    [Column(Order = 0)]
    public int TableId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    [MaxLength(10)]
    [Required]
    public string TableCode { get; set; } = string.Empty;

    public int SectionId { get; set; }

    [MaxLength(50)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? DescriptionAlt { get; set; }

    public int TableTypeId { get; set; }

    public int TableStatusId { get; set; }

    [MaxLength(50)]
    public string? PosCode { get; set; }

    public bool ShowPosCode { get; set; }

    public bool IsTakeAway { get; set; }

    public bool IsTempTable { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public int? DisplayIndex { get; set; }

    public int? ParentTableId { get; set; }

    public int? TableIconTypeId { get; set; }

    public int? PositionX { get; set; }

    public int? PositionY { get; set; }

    public bool? IsAppearOnFloorPlan { get; set; }

    public int? AutoAssignDayCount { get; set; }

    public int? ShopPrinterMasterId { get; set; }

    [MaxLength(50)]
    public string? ShapeType { get; set; }

    public int? IconWidth { get; set; }

    public int? IconHeight { get; set; }

    public int? Rotation { get; set; }

    public int? SeatNum { get; set; }

}
