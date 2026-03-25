using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using EWHQ.Api.Data.Attributes;

namespace EWHQ.Api.Models.Entities;

[Table("CommandLog")]
public class CommandLog
{
    public int ID { get; set; }

    public string? DatabaseName { get; set; }

    public string? SchemaName { get; set; }

    public string? ObjectName { get; set; }

    [MaxLength(2)]
    public string ObjectType { get; set; } = null!;

    public string? IndexName { get; set; }

    public byte? IndexType { get; set; }

    public string? StatisticsName { get; set; }

    public int? PartitionNumber { get; set; }

    public string? ExtendedInfo { get; set; }

    [MaxLengthUnlimited]
    [Required]
    public string Command { get; set; } = string.Empty;

    [MaxLength(60)]
    [Required]
    public string CommandType { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }

    public DateTime? EndTime { get; set; }

    public int? ErrorNumber { get; set; }

    [MaxLengthUnlimited]
    public string ErrorMessage { get; set; } = null!;

}
