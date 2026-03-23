using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using EWHQ.Api.Data;
using EWHQ.Api.Identity;
using EWHQ.Api.Models.AdminPortal;
using System.Text.Json.Serialization;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/user-access")]
[Authorize]
public class UserAccessController : ControllerBase
{
    private readonly AdminPortalDbContext _context;
    private readonly UserProfileDbContext _userContext;
    private readonly ILogger<UserAccessController> _logger;

    public UserAccessController(
        AdminPortalDbContext context,
        UserProfileDbContext userContext,
        ILogger<UserAccessController> logger)
    {
        _context = context;
        _userContext = userContext;
        _logger = logger;
    }

    private async Task<ApplicationUser?> GetCurrentUserAsync()
    {
        var localUserId = User.GetLocalUserId();
        if (!string.IsNullOrWhiteSpace(localUserId))
        {
            return await _userContext.Users.FirstOrDefaultAsync(u => u.Id == localUserId);
        }

        var externalUserId = User.GetExternalUserId();

        if (string.IsNullOrWhiteSpace(externalUserId))
        {
            return null;
        }

        return await _userContext.Users.FirstOrDefaultAsync(u => u.ExternalUserId == externalUserId);
    }

    private async Task<string?> GetCurrentUserIdAsync()
    {
        var user = await GetCurrentUserAsync();
        return user?.Id;
    }

    private static string GetDisplayName(ApplicationUser user)
    {
        var displayName = $"{user.FirstName} {user.LastName}".Trim();
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            return displayName;
        }

        return user.Email ?? user.Id;
    }

    private static string? NormalizeRequiredName(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private async Task<bool> HasCompanyWriteAccessAsync(string userId, int companyId)
    {
        return await _context.UserCompanies
            .AnyAsync(uc => uc.UserId == userId && uc.CompanyId == companyId && uc.IsActive &&
                            (uc.Role == UserRole.Owner || uc.Role == UserRole.CompanyAdmin));
    }

    private async Task<bool> HasCompanyOwnerAccessAsync(string userId, int companyId)
    {
        return await _context.UserCompanies
            .AnyAsync(uc => uc.UserId == userId && uc.CompanyId == companyId && uc.IsActive &&
                            uc.Role == UserRole.Owner);
    }

    private async Task<bool> HasBrandWriteAccessAsync(string userId, int brandId, int companyId)
    {
        var hasBrandAccess = await _context.UserBrands
            .AnyAsync(ub => ub.UserId == userId && ub.BrandId == brandId && ub.IsActive &&
                            ub.Role == UserRole.BrandAdmin);

        if (hasBrandAccess)
        {
            return true;
        }

        return await HasCompanyWriteAccessAsync(userId, companyId);
    }

    private async Task<bool> HasShopWriteAccessAsync(string userId, int shopId, int brandId, int companyId)
    {
        var hasShopAccess = await _context.UserShops
            .AnyAsync(us => us.UserId == userId && us.ShopId == shopId && us.IsActive &&
                            us.Role == UserRole.ShopManager);

        if (hasShopAccess)
        {
            return true;
        }

        return await HasBrandWriteAccessAsync(userId, brandId, companyId);
    }

    [HttpGet("companies-brands")]
    public async Task<IActionResult> GetUserCompaniesAndBrands()
    {
        try
        {
            var userId = await GetCurrentUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            // Get all companies the user has access to with their brands
            var userCompanies = await _context.UserCompanies
                .Where(uc => uc.UserId == userId && uc.IsActive)
                .Include(uc => uc.Company)
                    .ThenInclude(c => c.Brands.Where(b => b.IsActive))
                .Select(uc => new
                {
                    Company = new
                    {
                        uc.Company.Id,
                        uc.Company.Name,
                        uc.Company.Description
                    },
                    Role = uc.Role.ToString(),
                    Brands = uc.Company.Brands.Select(b => new
                    {
                        b.Id,
                        b.Name,
                        b.Description,
                        b.LogoUrl,
                        b.LegacyAccountId,
                        b.UseLegacyPOS
                    })
                })
                .ToListAsync();

            // Get company IDs that user already has access to
            var companyIds = userCompanies.Select(uc => uc.Company.Id).ToList();

            // Also get brands the user has direct access to (without company access)
            var userBrands = await _context.UserBrands
                .Where(ub => ub.UserId == userId && ub.IsActive)
                .Include(ub => ub.Brand)
                    .ThenInclude(b => b.Company)
                .Where(ub => !companyIds.Contains(ub.Brand.CompanyId))
                .ToListAsync();

            // Convert userBrands to the same format as userCompanies
            var userBrandsFormatted = userBrands
                .Select(ub => new
                {
                    Company = new
                    {
                        ub.Brand.Company.Id,
                        ub.Brand.Company.Name,
                        ub.Brand.Company.Description
                    },
                    Role = ub.Role.ToString(),
                    Brands = new[]
                    {
                        new
                        {
                            ub.Brand.Id,
                            ub.Brand.Name,
                            ub.Brand.Description,
                            ub.Brand.LogoUrl,
                            ub.Brand.LegacyAccountId,
                            ub.Brand.UseLegacyPOS
                        }
                    }.AsEnumerable()
                })
                .ToList();

            // Combine and group results
            var allAccess = userCompanies
                .Concat(userBrandsFormatted)
                .GroupBy(x => x.Company.Id)
                .Select(g => new
                {
                    Company = g.First().Company,
                    Role = g.First().Role,
                    Brands = g.SelectMany(x => x.Brands).Distinct()
                })
                .OrderBy(x => x.Company.Name)
                .ToList();

            return Ok(new
            {
                Success = true,
                Data = allAccess
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user companies and brands");
            return StatusCode(500, new { Success = false, Message = "An error occurred while fetching data" });
        }
    }

    [HttpPost("select-brand")]
    public async Task<IActionResult> SelectBrand([FromBody] SelectBrandRequest request)
    {
        try
        {
            var userId = await GetCurrentUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            // Verify user has access to this brand
            var hasAccess = await _context.UserBrands
                .AnyAsync(ub => ub.UserId == userId && ub.BrandId == request.BrandId && ub.IsActive)
                || await _context.UserCompanies
                    .Include(uc => uc.Company)
                        .ThenInclude(c => c.Brands)
                    .AnyAsync(uc => uc.UserId == userId && uc.IsActive &&
                        uc.Company.Brands.Any(b => b.Id == request.BrandId && b.IsActive));

            if (!hasAccess)
            {
                return Forbid("You don't have access to this brand");
            }

            // Store selected brand in session or return brand details
            // For now, just return success with brand details
            var brand = await _context.Brands
                .Include(b => b.Company)
                .Include(b => b.Shops)
                .FirstOrDefaultAsync(b => b.Id == request.BrandId);

            if (brand == null)
            {
                return NotFound("Brand not found");
            }

            return Ok(new
            {
                Success = true,
                SelectedBrand = new
                {
                    brand.Id,
                    brand.Name,
                    brand.Description,
                    brand.LogoUrl,
                    CompanyId = brand.CompanyId,
                    CompanyName = brand.Company.Name,
                    ShopCount = brand.Shops.Count(s => s.IsActive)
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error selecting brand");
            return StatusCode(500, new { Success = false, Message = "An error occurred while selecting brand" });
        }
    }

    [HttpGet("hierarchical-data")]
    public async Task<IActionResult> GetHierarchicalData()
    {
        try
        {
            var userId = await GetCurrentUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            // Get all companies the user has access to with full hierarchy
            var userCompanies = await _context.UserCompanies
                .Where(uc => uc.UserId == userId && uc.IsActive)
                .Include(uc => uc.Company)
                    .ThenInclude(c => c.Brands.Where(b => b.IsActive))
                        .ThenInclude(b => b.Shops.Where(s => s.IsActive))
                .ToListAsync();

            var companies = new List<object>();

            foreach (var uc in userCompanies)
            {
                companies.Add(new
                {
                    Id = uc.Company.Id,
                    Name = uc.Company.Name,
                    Description = uc.Company.Description,
                    Role = uc.Role.ToString(),
                    IsActive = uc.Company.IsActive,
                    Brands = uc.Company.Brands.Select(b => new
                    {
                        b.Id,
                        b.Name,
                        b.Description,
                        b.LogoUrl,
                        b.IsActive,
                        Role = _context.UserBrands
                            .FirstOrDefault(ub => ub.UserId == userId && ub.BrandId == b.Id && ub.IsActive)?.Role.ToString(),
                        Shops = b.Shops.Select(s => new
                        {
                            s.Id,
                            s.Name,
                            s.Address,
                            s.IsActive,
                            Role = _context.UserShops
                                .FirstOrDefault(us => us.UserId == userId && us.ShopId == s.Id && us.IsActive)?.Role.ToString()
                        })
                    })
                });
            }

            // Also get brands the user has direct access to (without company access)
            var companyIds = userCompanies.Select(uc => uc.Company.Id).ToList();
            var userBrands = await _context.UserBrands
                .Where(ub => ub.UserId == userId && ub.IsActive)
                .Include(ub => ub.Brand)
                    .ThenInclude(b => b.Company)
                .Include(ub => ub.Brand)
                    .ThenInclude(b => b.Shops.Where(s => s.IsActive))
                .Where(ub => !companyIds.Contains(ub.Brand.CompanyId))
                .ToListAsync();

            foreach (var ub in userBrands)
            {
                var existingCompany = companies.FirstOrDefault(c => ((dynamic)c).Id == ub.Brand.CompanyId);
                if (existingCompany == null)
                {
                    companies.Add(new
                    {
                        Id = ub.Brand.Company.Id,
                        Name = ub.Brand.Company.Name,
                        Description = ub.Brand.Company.Description,
                        Role = (string?)null,
                        IsActive = ub.Brand.Company.IsActive,
                        Brands = new[]
                        {
                            new
                            {
                                ub.Brand.Id,
                                ub.Brand.Name,
                                ub.Brand.Description,
                                ub.Brand.LogoUrl,
                                ub.Brand.IsActive,
                                Role = ub.Role.ToString(),
                                Shops = ub.Brand.Shops.Select(s => new
                                {
                                    s.Id,
                                    s.Name,
                                    s.Address,
                                    s.IsActive,
                                    Role = _context.UserShops
                                        .FirstOrDefault(us => us.UserId == userId && us.ShopId == s.Id && us.IsActive)?.Role.ToString()
                                })
                            }
                        }
                    });
                }
            }

            return Ok(new
            {
                Success = true,
                Data = companies.OrderBy(c => ((dynamic)c).Name)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching hierarchical data");
            return StatusCode(500, new { Success = false, Message = "An error occurred while fetching data" });
        }
    }

    [HttpPost("create-company")]
    public async Task<IActionResult> CreateCompany([FromBody] UserAccessCreateCompanyRequest request)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return Unauthorized("User not found");
            }

            var companyName = NormalizeRequiredName(request.Name);
            if (companyName == null)
            {
                return BadRequest(new { Success = false, Message = "Company name is required" });
            }

            var companyNameLower = companyName.ToLower();
            var companyNameExists = await _context.Companies
                .AnyAsync(c => c.IsActive && c.Name.ToLower() == companyNameLower);
            if (companyNameExists)
            {
                return Conflict(new { Success = false, Message = "A company with this name already exists" });
            }

            // Create new company
            var company = new Company
            {
                Name = companyName,
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                CreatedByUserId = currentUser.Id,
                UpdatedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Companies.Add(company);
            await _context.SaveChangesAsync();

            // Add user as company owner
            var userCompany = new UserCompany
            {
                UserId = currentUser.Id,
                UserEmail = currentUser.Email ?? string.Empty,
                UserName = GetDisplayName(currentUser),
                CompanyId = company.Id,
                Role = UserRole.Owner,
                AcceptedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.UserCompanies.Add(userCompany);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Success = true,
                Data = new { company.Id, company.Name, company.Description }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating company");
            return StatusCode(500, new { Success = false, Message = "An error occurred while creating company" });
        }
    }

    [HttpPost("create-brand")]
    public async Task<IActionResult> CreateBrand([FromBody] UserAccessCreateBrandRequest request)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return Unauthorized("User not found");
            }

            var brandName = NormalizeRequiredName(request.Name);
            if (brandName == null)
            {
                return BadRequest(new { Success = false, Message = "Brand name is required" });
            }

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == request.ParentId && c.IsActive);
            if (company == null)
            {
                return NotFound("Company not found");
            }

            // Verify user has company admin access
            var hasAccess = await HasCompanyWriteAccessAsync(currentUser.Id, request.ParentId);

            if (!hasAccess)
            {
                return Forbid("You don't have permission to create brands for this company");
            }

            var brandNameLower = brandName.ToLower();
            var brandNameExists = await _context.Brands
                .AnyAsync(b => b.CompanyId == request.ParentId && b.IsActive && b.Name.ToLower() == brandNameLower);
            if (brandNameExists)
            {
                return Conflict(new { Success = false, Message = "A brand with this name already exists under the company" });
            }

            // Create new brand
            var brand = new Brand
            {
                Name = brandName,
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                CompanyId = request.ParentId,
                LegacyAccountId = request.LegacyAccountId,
                UseLegacyPOS = request.UseLegacyPOS,
                UpdatedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Brands.Add(brand);
            await _context.SaveChangesAsync();

            // Add user as brand admin
            var userBrand = new UserBrand
            {
                UserId = currentUser.Id,
                UserEmail = currentUser.Email ?? string.Empty,
                UserName = GetDisplayName(currentUser),
                BrandId = brand.Id,
                Role = UserRole.BrandAdmin,
                Source = PermissionSource.Direct,
                CreatedBy = currentUser.Id,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.UserBrands.Add(userBrand);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Success = true,
                Data = new { brand.Id, brand.Name, brand.Description }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating brand");
            return StatusCode(500, new { Success = false, Message = "An error occurred while creating brand" });
        }
    }

    [HttpPost("create-shop")]
    public async Task<IActionResult> CreateShop([FromBody] UserAccessCreateShopRequest request)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return Unauthorized("User not found");
            }

            var shopName = NormalizeRequiredName(request.Name);
            if (shopName == null)
            {
                return BadRequest(new { Success = false, Message = "Shop name is required" });
            }

            // Get the brand to check company access
            var brand = await _context.Brands
                .Include(b => b.Company)
                .FirstOrDefaultAsync(b => b.Id == request.ParentId && b.IsActive && b.Company.IsActive);

            if (brand == null)
            {
                return NotFound("Brand not found");
            }

            // Verify user has brand admin access or company admin access
            var hasAccess = await HasBrandWriteAccessAsync(currentUser.Id, request.ParentId, brand.CompanyId);
            if (!hasAccess)
            {
                return Forbid("You don't have permission to create shops for this brand");
            }

            var shopNameLower = shopName.ToLower();
            var shopNameExists = await _context.Shops
                .AnyAsync(s => s.BrandId == request.ParentId && s.IsActive && s.Name.ToLower() == shopNameLower);
            if (shopNameExists)
            {
                return Conflict(new { Success = false, Message = "A shop with this name already exists under the brand" });
            }

            // Create new shop
            var shop = new Shop
            {
                Name = shopName,
                Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
                BrandId = request.ParentId,
                CreatedBy = currentUser.Id,
                UpdatedBy = currentUser.Id,
                UpdatedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Shops.Add(shop);
            await _context.SaveChangesAsync();

            // Add user as shop manager
            var userShop = new UserShop
            {
                UserId = currentUser.Id,
                UserEmail = currentUser.Email ?? string.Empty,
                UserName = GetDisplayName(currentUser),
                ShopId = shop.Id,
                Role = UserRole.ShopManager,
                Source = PermissionSource.Direct,
                CreatedBy = currentUser.Id,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.UserShops.Add(userShop);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Success = true,
                Data = new { shop.Id, shop.Name, shop.Address }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating shop");
            return StatusCode(500, new { Success = false, Message = "An error occurred while creating shop" });
        }
    }

    [HttpPost("update-company")]
    public async Task<IActionResult> UpdateCompany([FromBody] UserAccessUpdateEntityRequest request)
    {
        try
        {
            var userId = await GetCurrentUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == request.Id && c.IsActive);
            if (company == null)
            {
                return NotFound("Company not found");
            }

            // Verify user has company admin access
            var hasAccess = await HasCompanyWriteAccessAsync(userId, request.Id);

            if (!hasAccess)
            {
                return Forbid("You don't have permission to update this company");
            }

            if (request.Name != null)
            {
                var normalizedName = NormalizeRequiredName(request.Name);
                if (normalizedName == null)
                {
                    return BadRequest(new { Success = false, Message = "Company name cannot be empty" });
                }

                var normalizedNameLower = normalizedName.ToLower();
                var nameExists = await _context.Companies
                    .AnyAsync(c => c.Id != request.Id && c.IsActive && c.Name.ToLower() == normalizedNameLower);
                if (nameExists)
                {
                    return Conflict(new { Success = false, Message = "A company with this name already exists" });
                }

                company.Name = normalizedName;
            }

            // Update company
            if (request.Description != null)
            {
                company.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            }
            company.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { Success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating company");
            return StatusCode(500, new { Success = false, Message = "An error occurred while updating company" });
        }
    }

    [HttpPost("update-brand")]
    public async Task<IActionResult> UpdateBrand([FromBody] UserAccessUpdateEntityRequest request)
    {
        try
        {
            var userId = await GetCurrentUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var brand = await _context.Brands
                .Include(b => b.Company)
                .FirstOrDefaultAsync(b => b.Id == request.Id && b.IsActive && b.Company.IsActive);

            if (brand == null)
            {
                return NotFound("Brand not found");
            }

            // Verify user has brand admin or company admin access
            var hasAccess = await HasBrandWriteAccessAsync(userId, request.Id, brand.CompanyId);
            if (!hasAccess)
            {
                return Forbid("You don't have permission to update this brand");
            }

            if (request.Name != null)
            {
                var normalizedName = NormalizeRequiredName(request.Name);
                if (normalizedName == null)
                {
                    return BadRequest(new { Success = false, Message = "Brand name cannot be empty" });
                }

                var normalizedNameLower = normalizedName.ToLower();
                var nameExists = await _context.Brands
                    .AnyAsync(b => b.Id != request.Id && b.CompanyId == brand.CompanyId && b.IsActive && b.Name.ToLower() == normalizedNameLower);
                if (nameExists)
                {
                    return Conflict(new { Success = false, Message = "A brand with this name already exists under the company" });
                }

                brand.Name = normalizedName;
            }

            // Update brand
            if (request.Description != null)
            {
                brand.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            }
            if (request.LegacyAccountIdSpecified)
                brand.LegacyAccountId = request.LegacyAccountId;
            if (request.UseLegacyPOS.HasValue)
                brand.UseLegacyPOS = request.UseLegacyPOS.Value;
            brand.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { Success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating brand");
            return StatusCode(500, new { Success = false, Message = "An error occurred while updating brand" });
        }
    }

    [HttpPost("update-shop")]
    public async Task<IActionResult> UpdateShop([FromBody] UserAccessUpdateShopRequest request)
    {
        try
        {
            var userId = await GetCurrentUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var shop = await _context.Shops
                .Include(s => s.Brand)
                    .ThenInclude(b => b.Company)
                .FirstOrDefaultAsync(s => s.Id == request.Id && s.IsActive && s.Brand.IsActive && s.Brand.Company.IsActive);

            if (shop == null)
            {
                return NotFound("Shop not found");
            }

            // Verify user has shop manager, brand admin, or company admin access
            var hasAccess = await HasShopWriteAccessAsync(userId, request.Id, shop.BrandId, shop.Brand.CompanyId);
            if (!hasAccess)
            {
                return Forbid("You don't have permission to update this shop");
            }

            if (request.Name != null)
            {
                var normalizedName = NormalizeRequiredName(request.Name);
                if (normalizedName == null)
                {
                    return BadRequest(new { Success = false, Message = "Shop name cannot be empty" });
                }

                var normalizedNameLower = normalizedName.ToLower();
                var nameExists = await _context.Shops
                    .AnyAsync(s => s.Id != request.Id && s.BrandId == shop.BrandId && s.IsActive && s.Name.ToLower() == normalizedNameLower);
                if (nameExists)
                {
                    return Conflict(new { Success = false, Message = "A shop with this name already exists under the brand" });
                }

                shop.Name = normalizedName;
            }

            // Update shop
            if (request.Address != null)
            {
                shop.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
            }
            shop.UpdatedAt = DateTime.UtcNow;
            shop.UpdatedBy = userId;

            await _context.SaveChangesAsync();

            return Ok(new { Success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating shop");
            return StatusCode(500, new { Success = false, Message = "An error occurred while updating shop" });
        }
    }

    [HttpDelete("delete-shop/{id:int}")]
    public async Task<IActionResult> DeleteShop(int id)
    {
        try
        {
            var userId = await GetCurrentUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var shop = await _context.Shops
                .Include(s => s.Brand)
                    .ThenInclude(b => b.Company)
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActive && s.Brand.IsActive && s.Brand.Company.IsActive);

            if (shop == null)
            {
                return NotFound("Shop not found");
            }

            var hasAccess = await HasShopWriteAccessAsync(userId, id, shop.BrandId, shop.Brand.CompanyId);
            if (!hasAccess)
            {
                return Forbid("You don't have permission to delete this shop");
            }

            shop.IsActive = false;
            shop.UpdatedAt = DateTime.UtcNow;
            shop.UpdatedBy = userId;

            var userShops = await _context.UserShops
                .Where(us => us.ShopId == id && us.IsActive)
                .ToListAsync();
            foreach (var userShop in userShops)
            {
                userShop.IsActive = false;
                userShop.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { Success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting shop");
            return StatusCode(500, new { Success = false, Message = "An error occurred while deleting shop" });
        }
    }

    [HttpDelete("delete-brand/{id:int}")]
    public async Task<IActionResult> DeleteBrand(int id)
    {
        try
        {
            var userId = await GetCurrentUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var brand = await _context.Brands
                .Include(b => b.Company)
                .FirstOrDefaultAsync(b => b.Id == id && b.IsActive && b.Company.IsActive);

            if (brand == null)
            {
                return NotFound("Brand not found");
            }

            var hasAccess = await HasBrandWriteAccessAsync(userId, id, brand.CompanyId);
            if (!hasAccess)
            {
                return Forbid("You don't have permission to delete this brand");
            }

            brand.IsActive = false;
            brand.UpdatedAt = DateTime.UtcNow;

            var shops = await _context.Shops
                .Where(s => s.BrandId == id && s.IsActive)
                .ToListAsync();
            foreach (var shop in shops)
            {
                shop.IsActive = false;
                shop.UpdatedAt = DateTime.UtcNow;
                shop.UpdatedBy = userId;
            }

            var userBrands = await _context.UserBrands
                .Where(ub => ub.BrandId == id && ub.IsActive)
                .ToListAsync();
            foreach (var userBrand in userBrands)
            {
                userBrand.IsActive = false;
                userBrand.UpdatedAt = DateTime.UtcNow;
            }

            var shopIds = shops.Select(s => s.Id).ToList();
            if (shopIds.Count > 0)
            {
                var userShops = await _context.UserShops
                    .Where(us => shopIds.Contains(us.ShopId) && us.IsActive)
                    .ToListAsync();
                foreach (var userShop in userShops)
                {
                    userShop.IsActive = false;
                    userShop.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { Success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting brand");
            return StatusCode(500, new { Success = false, Message = "An error occurred while deleting brand" });
        }
    }

    [HttpDelete("delete-company/{id:int}")]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        try
        {
            var userId = await GetCurrentUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
            if (company == null)
            {
                return NotFound("Company not found");
            }

            // Only company owner can delete company
            var hasAccess = await HasCompanyOwnerAccessAsync(userId, id);
            if (!hasAccess)
            {
                return Forbid("Only company owner can delete company");
            }

            company.IsActive = false;
            company.UpdatedAt = DateTime.UtcNow;

            var brands = await _context.Brands
                .Where(b => b.CompanyId == id && b.IsActive)
                .ToListAsync();
            foreach (var brand in brands)
            {
                brand.IsActive = false;
                brand.UpdatedAt = DateTime.UtcNow;
            }

            var brandIds = brands.Select(b => b.Id).ToList();
            var shops = brandIds.Count == 0
                ? new List<Shop>()
                : await _context.Shops
                    .Where(s => brandIds.Contains(s.BrandId) && s.IsActive)
                    .ToListAsync();
            foreach (var shop in shops)
            {
                shop.IsActive = false;
                shop.UpdatedAt = DateTime.UtcNow;
                shop.UpdatedBy = userId;
            }

            var userCompanies = await _context.UserCompanies
                .Where(uc => uc.CompanyId == id && uc.IsActive)
                .ToListAsync();
            foreach (var userCompany in userCompanies)
            {
                userCompany.IsActive = false;
                userCompany.UpdatedAt = DateTime.UtcNow;
            }

            if (brandIds.Count > 0)
            {
                var userBrands = await _context.UserBrands
                    .Where(ub => brandIds.Contains(ub.BrandId) && ub.IsActive)
                    .ToListAsync();
                foreach (var userBrand in userBrands)
                {
                    userBrand.IsActive = false;
                    userBrand.UpdatedAt = DateTime.UtcNow;
                }
            }

            var shopIds = shops.Select(s => s.Id).ToList();
            if (shopIds.Count > 0)
            {
                var userShops = await _context.UserShops
                    .Where(us => shopIds.Contains(us.ShopId) && us.IsActive)
                    .ToListAsync();
                foreach (var userShop in userShops)
                {
                    userShop.IsActive = false;
                    userShop.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { Success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting company");
            return StatusCode(500, new { Success = false, Message = "An error occurred while deleting company" });
        }
    }
}

public class SelectBrandRequest
{
    public int BrandId { get; set; }
}

public class UserAccessCreateCompanyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UserAccessCreateBrandRequest
{
    public int ParentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? LegacyAccountId { get; set; }
    public bool UseLegacyPOS { get; set; } = false;
}

public class UserAccessCreateShopRequest
{
    public int ParentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
}

public class UserAccessUpdateEntityRequest
{
    private int? _legacyAccountId;
    private bool _legacyAccountIdSpecified;

    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }

    public int? LegacyAccountId
    {
        get => _legacyAccountId;
        set
        {
            _legacyAccountId = value;
            _legacyAccountIdSpecified = true;
        }
    }

    [JsonIgnore]
    public bool LegacyAccountIdSpecified => _legacyAccountIdSpecified;

    public bool? UseLegacyPOS { get; set; }
}

public class UserAccessUpdateShopRequest
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Address { get; set; }
}
