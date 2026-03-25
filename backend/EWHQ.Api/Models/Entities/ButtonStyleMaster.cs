using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("ButtonStyleMaster")]
public class ButtonStyleMaster
{
    [Key]
    [Column(Order = 0)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ButtonStyleId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(50)]
    public string? StyleName { get; set; }

    [MaxLength(100)]
    public string? StyleNameAlt { get; set; }

    [MaxLength(50)]
    public string? ResourceStyleName { get; set; }

    [MaxLength(9)]
    public string? BackgroundColorTop { get; set; }

    [MaxLength(9)]
    public string? BackgroundColorMiddle { get; set; }

    [MaxLength(9)]
    public string? BackgroundColorBottom { get; set; }

    public bool Enabled { get; set; }

    public DateTime? CreatedDate { get; set; }

    [MaxLength(50)]
    public string? CreatedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    [MaxLength(50)]
    public string? ModifiedBy { get; set; }

    public bool? IsSystemUse { get; set; }

    public int FontSize { get; set; }

    public int? Width { get; set; }

    public int? Height { get; set; }

    public int? ImageModeWidth { get; set; }

    public int? ImageModeHeight { get; set; }

    public int? ImageModeFontSize { get; set; }

    [MaxLength(50)]
    public string? ImageModeResourceStyleName { get; set; }

}
