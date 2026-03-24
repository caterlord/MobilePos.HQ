using System;

namespace EWHQ.Api.DTOs;

public class ReasonSummaryDto
{
    public int ReasonId { get; set; }
    public int AccountId { get; set; }
    public string ReasonGroupCode { get; set; } = string.Empty;
    public string ReasonCode { get; set; } = string.Empty;
    public string ReasonDesc { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public bool? IsSystemReason { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class UpsertReasonDto
{
    public string ReasonGroupCode { get; set; } = string.Empty;
    public string ReasonCode { get; set; } = string.Empty;
    public string ReasonDesc { get; set; } = string.Empty;
}
