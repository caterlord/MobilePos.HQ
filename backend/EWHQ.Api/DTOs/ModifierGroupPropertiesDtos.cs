using System;

namespace EWHQ.Api.DTOs;

public class ModifierGroupMemberDto
{
    public int ItemId { get; set; }
    public int DisplayIndex { get; set; }
    public bool Enabled { get; set; }
    public MenuItemSummaryDto Item { get; set; } = new();
}

public class ModifierGroupPropertiesDto
{
    public int GroupHeaderId { get; set; }
    public int AccountId { get; set; }
    public string GroupBatchName { get; set; } = string.Empty;
    public string? GroupBatchNameAlt { get; set; }
    public bool Enabled { get; set; }
    public bool IsFollowSet { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public string? ModifiedBy { get; set; }
    public IReadOnlyList<ModifierGroupMemberDto> Items { get; set; } = Array.Empty<ModifierGroupMemberDto>();
}

public class UpdateModifierGroupPropertiesDto
{
    public string GroupBatchName { get; set; } = string.Empty;
    public string? GroupBatchNameAlt { get; set; }
    public bool Enabled { get; set; }
    public IReadOnlyList<UpdateModifierGroupMemberDto> Items { get; set; } = Array.Empty<UpdateModifierGroupMemberDto>();
}

public class CreateModifierGroupDto
{
    public string GroupBatchName { get; set; } = string.Empty;
    public string? GroupBatchNameAlt { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsFollowSet { get; set; } = false;
    public IReadOnlyList<UpdateModifierGroupMemberDto> Items { get; set; } = Array.Empty<UpdateModifierGroupMemberDto>();
}

public class UpdateModifierGroupMemberDto
{
    public int ItemId { get; set; }
    public int DisplayIndex { get; set; }
    public bool Enabled { get; set; }
}
