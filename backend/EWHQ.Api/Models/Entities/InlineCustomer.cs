using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("InlineCustomer")]
public class InlineCustomer
{
    public int AccountId { get; set; }

    public int ShopId { get; set; }

    [MaxLength(200)]
    [Required]
    public string CustomerId { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Name { get; set; } = null!;

    [MaxLength(200)]
    public string PhoneNubmer { get; set; } = null!;

    [MaxLength(200)]
    public string Email { get; set; } = null!;

    [MaxLength(10)]
    public string Gender { get; set; } = null!;

    [MaxLength(10)]
    public string Language { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

}
