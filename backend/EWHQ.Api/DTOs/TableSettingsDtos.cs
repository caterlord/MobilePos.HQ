using System.Collections.Generic;

namespace EWHQ.Api.DTOs;

public class TableSectionDto
{
    public int SectionId { get; set; }
    public string SectionName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public int TableCount { get; set; }
}

public class TableSectionLibraryDto
{
    public int SectionId { get; set; }
    public string SectionName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public int ShopCount { get; set; }
}

public class TableSectionShopLinkDto
{
    public int SectionId { get; set; }
    public int ShopId { get; set; }
    public string SectionName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public int TableCount { get; set; }
    public string TableMapBackgroundImagePath { get; set; } = string.Empty;
    public int? TableMapBackgroundImageWidth { get; set; }
    public int? TableMapBackgroundImageHeight { get; set; }
}

public class SectionShopRuleDto
{
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public bool Linked { get; set; }
    public string TableMapBackgroundImagePath { get; set; } = string.Empty;
    public int? TableMapBackgroundImageWidth { get; set; }
    public int? TableMapBackgroundImageHeight { get; set; }
}

public class UpsertTableSectionRequestDto
{
    public string SectionName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<SectionShopRuleDto>? ShopRules { get; set; }
}

public class LinkTableSectionToShopRequestDto
{
    public int SectionId { get; set; }
    public string TableMapBackgroundImagePath { get; set; } = string.Empty;
    public int? TableMapBackgroundImageWidth { get; set; }
    public int? TableMapBackgroundImageHeight { get; set; }
}

public class UpdateTableSectionShopLinkRequestDto
{
    public string TableMapBackgroundImagePath { get; set; } = string.Empty;
    public int? TableMapBackgroundImageWidth { get; set; }
    public int? TableMapBackgroundImageHeight { get; set; }
}

public class TableTypeOptionDto
{
    public int TableTypeId { get; set; }
    public string TypeName { get; set; } = string.Empty;
}

public class TableStatusOptionDto
{
    public int TableStatusId { get; set; }
    public string StatusName { get; set; } = string.Empty;
}

public class TablePrinterOptionDto
{
    public int ShopPrinterMasterId { get; set; }
    public string PrinterName { get; set; } = string.Empty;
}

public class TableSettingsMetadataDto
{
    public IReadOnlyList<TableTypeOptionDto> TableTypes { get; set; } = [];
    public IReadOnlyList<TableStatusOptionDto> TableStatuses { get; set; } = [];
    public IReadOnlyList<TablePrinterOptionDto> Printers { get; set; } = [];
}

public class TableMasterDto
{
    public int TableId { get; set; }
    public int ShopId { get; set; }
    public string TableCode { get; set; } = string.Empty;
    public int SectionId { get; set; }
    public string SectionName { get; set; } = string.Empty;
    public int TableTypeId { get; set; }
    public string TableTypeName { get; set; } = string.Empty;
    public int? DisplayIndex { get; set; }
    public bool IsTakeAway { get; set; }
    public int? SeatNum { get; set; }
    public int? ShopPrinterMasterId { get; set; }
    public string ShopPrinterName { get; set; } = string.Empty;
    public int? PositionX { get; set; }
    public int? PositionY { get; set; }
    public bool IsAppearOnFloorPlan { get; set; }
    public string ShapeType { get; set; } = string.Empty;
    public int? IconWidth { get; set; }
    public int? IconHeight { get; set; }
    public int? Rotation { get; set; }
    public bool Enabled { get; set; }
}

public class UpsertTableMasterRequestDto
{
    public string TableCode { get; set; } = string.Empty;
    public int SectionId { get; set; }
    public int TableTypeId { get; set; }
    public int? DisplayIndex { get; set; }
    public bool IsTakeAway { get; set; }
    public int? SeatNum { get; set; }
    public int? ShopPrinterMasterId { get; set; }
    public int? PositionX { get; set; }
    public int? PositionY { get; set; }
    public bool IsAppearOnFloorPlan { get; set; }
    public string ShapeType { get; set; } = string.Empty;
    public int? IconWidth { get; set; }
    public int? IconHeight { get; set; }
    public int? Rotation { get; set; }
}
