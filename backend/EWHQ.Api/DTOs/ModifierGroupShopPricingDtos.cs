using System;

namespace EWHQ.Api.DTOs;

public class ModifierGroupShopPricingDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public int ItemId { get; set; }
    public decimal OriginalPrice { get; set; }
    public decimal? Price { get; set; }
    public bool Enabled { get; set; }
}

public class UpdateModifierGroupShopPricingEntryDto
{
    public int ShopId { get; set; }
    public decimal? Price { get; set; }
}

public class UpdateModifierGroupShopPricingDto
{
    public IReadOnlyList<UpdateModifierGroupShopPricingEntryDto> Entries { get; set; } = Array.Empty<UpdateModifierGroupShopPricingEntryDto>();
}
