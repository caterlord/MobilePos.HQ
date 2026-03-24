using System;

namespace EWHQ.Api.DTOs;

public class DepartmentSummaryDto
{
    public int DepartmentId { get; set; }
    public int AccountId { get; set; }
    public string? DepartmentCode { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? RevenueCenterCode { get; set; }
    public bool? IsSubDepartment { get; set; }
    public int? ParentDepartmentId { get; set; }
    public bool Enabled { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
}

public class UpsertDepartmentDto
{
    public string? DepartmentCode { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? RevenueCenterCode { get; set; }
    public bool? IsSubDepartment { get; set; }
    public int? ParentDepartmentId { get; set; }
}
