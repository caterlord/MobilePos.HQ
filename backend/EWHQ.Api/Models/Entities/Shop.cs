using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EWHQ.Api.Models.Entities;

[Table("Shop")]
public class Shop
{
    [Key]
    [Column(Order = 0)]
    public int ShopId { get; set; }

    [Key]
    [Column(Order = 1)]
    public int AccountId { get; set; }

    [MaxLength(100)]
    [Required]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? AltName { get; set; }

    [MaxLength(500)]
    public string? Desc { get; set; }

    [MaxLength(500)]
    public string? AltDesc { get; set; }

    [MaxLength(500)]
    public string? AddressLine1 { get; set; }

    [MaxLength(200)]
    public string? AddressLine2 { get; set; }

    [MaxLength(200)]
    public string? AddressLine3 { get; set; }

    [MaxLength(200)]
    public string? AddressLine4 { get; set; }

    [MaxLength(500)]
    public string? AltAddressLine1 { get; set; }

    [MaxLength(200)]
    public string? AltAddressLine2 { get; set; }

    [MaxLength(200)]
    public string? AltAddressLine3 { get; set; }

    [MaxLength(200)]
    public string? AltAddressLine4 { get; set; }

    [MaxLength(50)]
    public string? District { get; set; }

    [MaxLength(50)]
    public string? City { get; set; }

    [MaxLength(50)]
    public string? Country { get; set; }

    [MaxLength(20)]
    public string? Telephone { get; set; }

    [MaxLength(20)]
    public string? Fax { get; set; }

    [MaxLength(50)]
    public string? Contact1 { get; set; }

    [MaxLength(50)]
    public string? ContactTitle1 { get; set; }

    [MaxLength(50)]
    public string? Contact2 { get; set; }

    [MaxLength(50)]
    public string? ContactTitle2 { get; set; }

    public int ShopTypeId { get; set; }

    [MaxLength(10)]
    [Required]
    public string CurrencyCode { get; set; } = string.Empty;

    [MaxLength(10)]
    [Required]
    public string CurrencySymbol { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    public DateTime CreatedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime ModifiedDate { get; set; }

    [MaxLength(50)]
    [Required]
    public string ModifiedBy { get; set; } = string.Empty;

    public bool? IsOclEnabled { get; set; }

    [MaxLength(200)]
    public string? SelfOrderingBackgroundImagePath { get; set; }

    [MaxLength(200)]
    public string? SelfOrderingBannerImagePath { get; set; }

    [MaxLength(200)]
    public string? SelfOrderingLogoImagePath { get; set; }

    [MaxLength(200)]
    public string? SelfOrderingSplashImagePath { get; set; }

    [MaxLength(200)]
    public string? SelfOrderingDisclaimer { get; set; }

    public bool? IsOnlineStore { get; set; }

    public int? TimeZoneId { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? TimeZoneValue { get; set; }

    public bool? TimeZoneUseDaylightTime { get; set; }

    public bool? IsSuspended { get; set; }

    [MaxLength(10)]
    public string? IntCallingCode { get; set; }

    [MaxLength(1000)]
    public string? AddressForDelivery { get; set; }

    [Column(TypeName = "decimal(10, 7)")]
    public decimal? AddressLat { get; set; }

    [Column(TypeName = "decimal(10, 7)")]
    public decimal? AddressLong { get; set; }

    public int? ShopGroupId { get; set; }

    [MaxLength(50)]
    public string? ShopCode { get; set; }

}
