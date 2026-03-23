namespace EWHQ.Api.DTOs;

public class OnlineOrderingLookupItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? AltName { get; set; }
    public string? Code { get; set; }
}

public class OnlineOrderingMenuSummaryDto
{
    public int OdoCategoryCount { get; set; }
    public int OdoItemCount { get; set; }
    public int OdoModifierGroupCount { get; set; }
    public int OdoMealSetCount { get; set; }
}

public class OnlineOrderingLookupsDto
{
    public IReadOnlyList<OnlineOrderingLookupItemDto> Shops { get; set; } = Array.Empty<OnlineOrderingLookupItemDto>();
    public IReadOnlyList<OnlineOrderingLookupItemDto> OrderChannels { get; set; } = Array.Empty<OnlineOrderingLookupItemDto>();
    public IReadOnlyList<OnlineOrderingLookupItemDto> SmartCategories { get; set; } = Array.Empty<OnlineOrderingLookupItemDto>();
    public IReadOnlyList<string> Languages { get; set; } = Array.Empty<string>();
    public OnlineOrderingMenuSummaryDto Summary { get; set; } = new();
}

public class OnlineOrderingDisplayOrderNodeDto
{
    public int SmartCategoryId { get; set; }
    public int? ParentSmartCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? NameAlt { get; set; }
    public int DisplayIndex { get; set; }
    public int ItemCount { get; set; }
    public IReadOnlyList<OnlineOrderingDisplayOrderNodeDto> Children { get; set; } = Array.Empty<OnlineOrderingDisplayOrderNodeDto>();
}

public class OnlineOrderingDisplayOrderEntryDto
{
    public int SmartCategoryId { get; set; }
    public int? ParentSmartCategoryId { get; set; }
    public int DisplayIndex { get; set; }
}

public class OnlineOrderingDisplayOrderUpdateRequest
{
    public IReadOnlyList<OnlineOrderingDisplayOrderEntryDto> Categories { get; set; } = Array.Empty<OnlineOrderingDisplayOrderEntryDto>();
}

public class OnlineOrderingBusinessDaySectionDto
{
    public string Label { get; set; } = string.Empty;
    public string? DaysOfWeek { get; set; }
    public string? FromTime { get; set; }
    public string? ToTime { get; set; }
}

public class OnlineOrderingGeneralSettingsDto
{
    public string WebsiteUrl { get; set; } = string.Empty;
    public string CountryCode { get; set; } = "852";
    public decimal TimeZone { get; set; } = 8;
    public int OrderTokenValidTime { get; set; } = 30;
    public bool DisableNavigateWhenTokenExpired { get; set; }
    public string? WhenTokenExpiredTips { get; set; }
    public int Quota { get; set; }
    public int QuotaOfItem { get; set; }
    public int QuotaOfEachItem { get; set; }
    public bool ModifySetQuantity { get; set; } = true;
    public string RoundingMethod { get; set; } = string.Empty;
    public int? RoundingPlace { get; set; }
    public IReadOnlyList<OnlineOrderingBusinessDaySectionDto> BusinessDaySections { get; set; } = Array.Empty<OnlineOrderingBusinessDaySectionDto>();
}

public class OnlineOrderingCallToActionSlotDto
{
    public string Placement { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? TitleAlt { get; set; }
    public string? Description { get; set; }
    public string? DescriptionAlt { get; set; }
    public string ActionLabel { get; set; } = string.Empty;
    public string? ActionLabelAlt { get; set; }
    public string? ActionUrl { get; set; }
    public int? SmartCategoryId { get; set; }
}

public class OnlineOrderingCallToActionSettingsDto
{
    public IReadOnlyList<OnlineOrderingCallToActionSlotDto> Slots { get; set; } = Array.Empty<OnlineOrderingCallToActionSlotDto>();
}

public class OnlineOrderingUiI18nEntryDto
{
    public int OrderChannelId { get; set; }
    public string LanguageCode { get; set; } = string.Empty;
    public string Content { get; set; } = "{}";
}

public class OnlineOrderingUiI18nDocumentDto
{
    public int OrderChannelId { get; set; }
    public string OrderChannelName { get; set; } = string.Empty;
    public IReadOnlyList<OnlineOrderingUiI18nEntryDto> Entries { get; set; } = Array.Empty<OnlineOrderingUiI18nEntryDto>();
}

public class OnlineOrderingUiI18nResponseDto
{
    public IReadOnlyList<string> Languages { get; set; } = Array.Empty<string>();
    public IReadOnlyList<OnlineOrderingUiI18nDocumentDto> Documents { get; set; } = Array.Empty<OnlineOrderingUiI18nDocumentDto>();
}

public class OnlineOrderingUiI18nUpdateRequest
{
    public IReadOnlyList<OnlineOrderingUiI18nEntryDto> Entries { get; set; } = Array.Empty<OnlineOrderingUiI18nEntryDto>();
}

public class OnlineOrderingMenuCombinationCategoryDto
{
    public int CategoryId { get; set; }
    public bool IsSmartCategory { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class OnlineOrderingMenuCombinationShopDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public bool IsPublicDisplay { get; set; }
    public string? DaysOfWeek { get; set; }
    public string? Dates { get; set; }
    public string? Months { get; set; }
    public string? DisplayFromTime { get; set; }
    public string? DisplayToTime { get; set; }
}

public class OnlineOrderingMenuCombinationDto
{
    public int MenuId { get; set; }
    public string MenuName { get; set; } = string.Empty;
    public string? MenuNameAlt { get; set; }
    public string? MenuCode { get; set; }
    public int DisplayOrder { get; set; }
    public bool Enabled { get; set; }
    public bool IsPublished { get; set; }
    public bool IsOdoDisplay { get; set; }
    public bool IsFoodpandaMealForOne { get; set; }
    public IReadOnlyList<OnlineOrderingMenuCombinationCategoryDto> Categories { get; set; } = Array.Empty<OnlineOrderingMenuCombinationCategoryDto>();
    public IReadOnlyList<OnlineOrderingMenuCombinationShopDto> Shops { get; set; } = Array.Empty<OnlineOrderingMenuCombinationShopDto>();
}

public class UpsertOnlineOrderingMenuCombinationCategoryDto
{
    public int CategoryId { get; set; }
    public bool IsSmartCategory { get; set; }
}

public class UpsertOnlineOrderingMenuCombinationShopDto
{
    public int ShopId { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsPublicDisplay { get; set; } = true;
    public string? DaysOfWeek { get; set; }
    public string? Dates { get; set; }
    public string? Months { get; set; }
    public string? DisplayFromTime { get; set; }
    public string? DisplayToTime { get; set; }
}

public class UpsertOnlineOrderingMenuCombinationRequest
{
    public string MenuName { get; set; } = string.Empty;
    public string? MenuNameAlt { get; set; }
    public string? MenuCode { get; set; }
    public int DisplayOrder { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsPublished { get; set; }
    public bool IsOdoDisplay { get; set; } = true;
    public bool IsFoodpandaMealForOne { get; set; }
    public IReadOnlyList<UpsertOnlineOrderingMenuCombinationCategoryDto> Categories { get; set; } = Array.Empty<UpsertOnlineOrderingMenuCombinationCategoryDto>();
    public IReadOnlyList<UpsertOnlineOrderingMenuCombinationShopDto> Shops { get; set; } = Array.Empty<UpsertOnlineOrderingMenuCombinationShopDto>();
}
