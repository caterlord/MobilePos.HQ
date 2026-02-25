using System;

namespace EWHQ.Api.DTOs;

public class DiscountSummaryDto
{
    public int DiscountId { get; set; }
    public int AccountId { get; set; }
    public string DiscountCode { get; set; } = string.Empty;
    public string DiscountName { get; set; } = string.Empty;
    public bool IsFixedAmount { get; set; }
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public int Priority { get; set; }
    public bool Enabled { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class UpsertDiscountDto
{
    public string DiscountCode { get; set; } = string.Empty;
    public string DiscountName { get; set; } = string.Empty;
    public bool IsFixedAmount { get; set; } = false;
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public int Priority { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
}
