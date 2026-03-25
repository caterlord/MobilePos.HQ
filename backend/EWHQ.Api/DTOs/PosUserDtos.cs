using System;

namespace EWHQ.Api.DTOs;

// ── User Groups ──

public class PosUserGroupSummaryDto
{
    public int GroupId { get; set; }
    public int AccountId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AltName { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public string? GroupType { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class UpsertPosUserGroupDto
{
    public string Name { get; set; } = string.Empty;
    public string AltName { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
}

// ── Users ──

public class PosUserSummaryDto
{
    public int UserId { get; set; }
    public int AccountId { get; set; }
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? UserAltName { get; set; }
    public string? StaffCode { get; set; }
    public string? CardNo { get; set; }
    public bool InactiveUserAccount { get; set; }
    public bool Enabled { get; set; }
    public bool EnableUserIdLogin { get; set; }
    public bool EnableCardNoLogin { get; set; }
    public bool EnableStaffCodeLogin { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
    public List<int> GroupIds { get; set; } = new();
    public List<string> GroupNames { get; set; } = new();
}

public class UpsertPosUserDto
{
    public string UserName { get; set; } = string.Empty;
    public string? UserAltName { get; set; }
    public string Password { get; set; } = string.Empty;
    public string? StaffCode { get; set; }
    public string? CardNo { get; set; }
    public int ShopId { get; set; }
    public bool Enabled { get; set; } = true;
    public bool InactiveUserAccount { get; set; }
    public bool EnableUserIdLogin { get; set; } = true;
    public bool EnableCardNoLogin { get; set; }
    public bool EnableStaffCodeLogin { get; set; }
    public List<int>? GroupIds { get; set; }
}
