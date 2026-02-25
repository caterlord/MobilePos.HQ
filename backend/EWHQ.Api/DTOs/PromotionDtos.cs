using System;

namespace EWHQ.Api.DTOs;

public class PromotionSummaryDto
{
    public int PromoHeaderId { get; set; }
    public int AccountId { get; set; }
    public string PromoCode { get; set; } = string.Empty;
    public string PromoName { get; set; } = string.Empty;
    public decimal PromoSaveAmount { get; set; }
    public int? Priority { get; set; }
    public bool Enabled { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class UpsertPromotionDto
{
    public string PromoCode { get; set; } = string.Empty;
    public string PromoName { get; set; } = string.Empty;
    public decimal PromoSaveAmount { get; set; }
    public int? Priority { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
}
