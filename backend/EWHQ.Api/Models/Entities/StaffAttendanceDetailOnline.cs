using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("StaffAttendanceDetailOnline")]
public class StaffAttendanceDetailOnline
{
    [Key]
    [Column(Order = 0)]
    public int StaffAttendanceDetailId { get; set; }

    public int StaffAttendanceHeaderId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [Key]
    [Column(Order = 2)]
    public int ShopId { get; set; }

    public int Slot { get; set; }

    [MaxLength(50)]
    public string LeaveType { get; set; } = null!;

    public int UserId { get; set; }

    [MaxLength(50)]
    public string UserName { get; set; } = null!;

    [MaxLength(50)]
    public string StaffCode { get; set; } = null!;

    public int? RefRosterId { get; set; }

    public DateTime? OriginalOnDateTime { get; set; }

    public DateTime? OriginalOffDateTime { get; set; }

    public DateTime? FinalOnDateTime { get; set; }

    public DateTime? FinalOffDateTime { get; set; }

    public DateTime? AdjustedOnDate { get; set; }

    public TimeSpan? AdjustedOnTime { get; set; }

    public DateTime? AdjustedOffDate { get; set; }

    public TimeSpan? AdjustedOffTime { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? AdjustedWorkHour { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? AdjustedLateMinute { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? TrainingHour { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? RCHour { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool IsCopiedFromRoster { get; set; }

}
