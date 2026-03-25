using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("Department")]
public class Department
{
    [Key]
    [Column(Order = 0)]
    public int DepartmentId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(100)]
    [Required]
    public string DepartmentName { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string? DepartmentCode { get; set; }

    [MaxLength(50)]
    public string? RevenueCenterCode { get; set; }

    public bool? IsSubDepartment { get; set; }

    public int? ParentDepartmentId { get; set; }

}
