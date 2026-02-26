using System;

namespace EWHQ.Api.DTOs;

public class PromotionSummaryDto
{
    public int PromoHeaderId { get; set; }
    public int AccountId { get; set; }
    public int? BundlePromoOverviewId { get; set; }
    public int BundlePromoHeaderTypeId { get; set; }
    public string PromoCode { get; set; } = string.Empty;
    public string PromoName { get; set; } = string.Empty;
    public string? BundlePromoDesc { get; set; }
    public decimal PromoSaveAmount { get; set; }
    public int? Priority { get; set; }
    public bool Enabled { get; set; }
    public bool IsAvailable { get; set; }
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
    public string? BundlePromoDesc { get; set; }
    public int BundlePromoHeaderTypeId { get; set; }
    public decimal PromoSaveAmount { get; set; }
    public int? Priority { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsAvailable { get; set; } = true;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
}
