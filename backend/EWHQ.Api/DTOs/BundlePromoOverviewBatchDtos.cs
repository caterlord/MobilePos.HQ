using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EWHQ.Api.DTOs;

public class UpdateBundlePromoOverviewEntryDto
{
    [Range(1, int.MaxValue)]
    public int BundlePromoOverviewId { get; set; }

    [Range(1, int.MaxValue)]
    public int BundlePromoRefId { get; set; }

    [Range(1, int.MaxValue)]
    public int BundlePromoHeaderTypeId { get; set; }

    public bool IsAvailable { get; set; } = true;
}

public class UpdateBundlePromoOverviewsDto
{
    [MinLength(1)]
    public IReadOnlyList<UpdateBundlePromoOverviewEntryDto> Entries { get; set; } = Array.Empty<UpdateBundlePromoOverviewEntryDto>();
}

public class DeleteBundlePromoOverviewsDto
{
    [MinLength(1)]
    public IReadOnlyList<int> BundlePromoOverviewIds { get; set; } = Array.Empty<int>();
}

public class BundlePromoOverviewLifecycleDto
{
    public int BundlePromoOverviewId { get; set; }
    public int BundlePromoHeaderTypeId { get; set; }
    public int BundlePromoRefId { get; set; }
    public bool IsAvailable { get; set; }
    public bool Enabled { get; set; }
    public int Priority { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}
