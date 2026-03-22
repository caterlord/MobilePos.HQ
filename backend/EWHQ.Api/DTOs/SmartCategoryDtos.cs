using System;
using System.ComponentModel.DataAnnotations;

namespace EWHQ.Api.DTOs;

public class SmartCategoryTreeNodeDto
{
    public int SmartCategoryId { get; set; }
    public int? ParentSmartCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? NameAlt { get; set; }
    public int DisplayIndex { get; set; }
    public bool Enabled { get; set; }
    public int ButtonStyleId { get; set; }
    public int ItemCount { get; set; }
    public IReadOnlyList<SmartCategoryTreeNodeDto> Children { get; set; } = Array.Empty<SmartCategoryTreeNodeDto>();
}

public class SmartCategoryDto
{
    public int SmartCategoryId { get; set; }
    public int AccountId { get; set; }
    public int? ParentSmartCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? NameAlt { get; set; }
    public int DisplayIndex { get; set; }
    public bool Enabled { get; set; }
    public bool IsTerminal { get; set; }
    public bool IsPublicDisplay { get; set; }
    public int ButtonStyleId { get; set; }
    public string? Description { get; set; }
    public string? DescriptionAlt { get; set; }
    public string? ImageFileName { get; set; }
    public string? ImageFileName2 { get; set; }
    public string? ImageFileName3 { get; set; }
    public bool? IsSelfOrderingDisplay { get; set; }
    public bool? IsOnlineStoreDisplay { get; set; }
    public bool? IsOdoDisplay { get; set; }
    public bool? IsKioskDisplay { get; set; }
    public bool? IsTableOrderingDisplay { get; set; }
    public int? OnlineStoreRefCategoryId { get; set; }
    public string? Remark { get; set; }
    public string? RemarkAlt { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class SmartCategoryDetailDto
{
    public SmartCategoryDto Category { get; set; } = new();
    public IReadOnlyList<SmartCategoryItemAssignmentDto> Items { get; set; } = Array.Empty<SmartCategoryItemAssignmentDto>();
    public IReadOnlyList<SmartCategoryShopScheduleDto> ShopSchedules { get; set; } = Array.Empty<SmartCategoryShopScheduleDto>();
    public IReadOnlyList<SmartCategoryOrderChannelDto> OrderChannels { get; set; } = Array.Empty<SmartCategoryOrderChannelDto>();
}

public class SmartCategoryUpsertDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? NameAlt { get; set; }

    public int? ParentSmartCategoryId { get; set; }

    public int DisplayIndex { get; set; }

    public bool Enabled { get; set; } = true;

    public bool IsTerminal { get; set; }

    public bool IsPublicDisplay { get; set; }

    public int ButtonStyleId { get; set; }

    [MaxLength(100)]
    public string? Description { get; set; }

    [MaxLength(200)]
    public string? DescriptionAlt { get; set; }

    [MaxLength(200)]
    public string? ImageFileName { get; set; }

    [MaxLength(200)]
    public string? ImageFileName2 { get; set; }

    [MaxLength(200)]
    public string? ImageFileName3 { get; set; }

    public bool? IsSelfOrderingDisplay { get; set; }
    public bool? IsOnlineStoreDisplay { get; set; }
    public bool? IsOdoDisplay { get; set; }
    public bool? IsKioskDisplay { get; set; }
    public bool? IsTableOrderingDisplay { get; set; }
    public int? OnlineStoreRefCategoryId { get; set; }

    [MaxLength(4000)]
    public string? Remark { get; set; }

    [MaxLength(4000)]
    public string? RemarkAlt { get; set; }
}

public class SmartCategoryItemAssignmentDto
{
    public int ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? ItemNameAlt { get; set; }
    public int DisplayIndex { get; set; }
    public bool Enabled { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class SmartCategoryItemAssignmentEntryDto
{
    [Required]
    public int ItemId { get; set; }

    [Required]
    public int DisplayIndex { get; set; }

    public bool Enabled { get; set; } = true;
}

public class SmartCategoryItemAssignmentRequestDto
{
    [MinLength(1)]
    public IReadOnlyList<SmartCategoryItemAssignmentEntryDto> Items { get; set; } = Array.Empty<SmartCategoryItemAssignmentEntryDto>();
}

public class SmartCategoryShopScheduleDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public int DisplayIndex { get; set; }
    public DateTime? DisplayFromDate { get; set; }
    public DateTime? DisplayToDate { get; set; }
    public TimeSpan? DisplayFromTime { get; set; }
    public TimeSpan? DisplayToTime { get; set; }
    public DateTime? DisplayFromDateTime { get; set; }
    public DateTime? DisplayToDateTime { get; set; }
    public bool IsPublicDisplay { get; set; }
    public bool Enabled { get; set; }
    public int? DayOfWeek { get; set; }
    public bool? IsWeekdayHide { get; set; }
    public bool? IsWeekendHide { get; set; }
    public bool? IsHolidayHide { get; set; }
    public string? DaysOfWeek { get; set; }
    public string? Months { get; set; }
    public string? Dates { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class SmartCategoryShopScheduleUpsertDto
{
    [Required]
    public int ShopId { get; set; }

    public int DisplayIndex { get; set; }
    public DateTime? DisplayFromDate { get; set; }
    public DateTime? DisplayToDate { get; set; }
    public TimeSpan? DisplayFromTime { get; set; }
    public TimeSpan? DisplayToTime { get; set; }
    public DateTime? DisplayFromDateTime { get; set; }
    public DateTime? DisplayToDateTime { get; set; }
    public bool IsPublicDisplay { get; set; }
    public bool Enabled { get; set; } = true;
    public int? DayOfWeek { get; set; }
    public bool? IsWeekdayHide { get; set; }
    public bool? IsWeekendHide { get; set; }
    public bool? IsHolidayHide { get; set; }
    public string? DaysOfWeek { get; set; }
    public string? Months { get; set; }
    public string? Dates { get; set; }
}

public class SmartCategoryOrderChannelDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public int OrderChannelId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? NameAlt { get; set; }
    public bool Enabled { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class SmartCategoryOrderChannelUpsertDto
{
    [Required]
    public int ShopId { get; set; }

    [Required]
    public int OrderChannelId { get; set; }

    public bool Enabled { get; set; } = true;
}

public class SmartCategoryDisplaySettingsUpsertDto
{
    public IReadOnlyList<SmartCategoryShopScheduleUpsertDto> ShopSchedules { get; set; } = Array.Empty<SmartCategoryShopScheduleUpsertDto>();
    public IReadOnlyList<SmartCategoryOrderChannelUpsertDto> OrderChannels { get; set; } = Array.Empty<SmartCategoryOrderChannelUpsertDto>();
}

public class SmartCategoryReorderEntryDto
{
    [Required]
    public int SmartCategoryId { get; set; }

    public int? ParentSmartCategoryId { get; set; }

    [Required]
    public int DisplayIndex { get; set; }
}

public class SmartCategoryReorderRequestDto
{
    [MinLength(1)]
    public IReadOnlyList<SmartCategoryReorderEntryDto> Categories { get; set; } = Array.Empty<SmartCategoryReorderEntryDto>();
}
