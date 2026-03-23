using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EWHQ.Api.Models.AdminPortal;
using EWHQ.Api.Services;
using EWHQ.Api.Constants;
using EWHQ.Api.Identity;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CompaniesController : ControllerBase
{
    private readonly ICompanyService _companyService;
    private readonly UserProfileDbContext _userContext;
    private readonly ILogger<CompaniesController> _logger;

    public CompaniesController(ICompanyService companyService, UserProfileDbContext userContext, ILogger<CompaniesController> logger)
    {
        _companyService = companyService;
        _userContext = userContext;
        _logger = logger;
    }

    private async Task<string> GetCurrentUserIdAsync()
    {
        var localUserId = User.FindFirst(HqClaimTypes.LocalUserId)?.Value;
        if (!string.IsNullOrWhiteSpace(localUserId))
        {
            return localUserId;
        }

        var externalUserId = User.GetExternalUserId();

        if (string.IsNullOrWhiteSpace(externalUserId))
        {
            return string.Empty;
        }

        var user = await _userContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.ExternalUserId == externalUserId);

        return user?.Id ?? string.Empty;
    }

    private bool IsSuperAdmin()
    {
        return User.IsInRole("SuperAdmin") || User.FindFirst(HqClaimTypes.UserType)?.Value == "SuperAdmin";
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Company>>> GetCompanies()
    {
        var userId = await GetCurrentUserIdAsync();
        var companies = await _companyService.GetCompaniesAsync(userId, IsSuperAdmin());
        return Ok(companies);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Company>> GetCompany(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var company = await _companyService.GetCompanyByIdAsync(id, userId, IsSuperAdmin());
        
        if (company == null)
            return NotFound();

        return Ok(company);
    }

    [HttpPost]
    public async Task<ActionResult<Company>> CreateCompany(CreateCompanyRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = await GetCurrentUserIdAsync();
        var company = new Company
        {
            Name = request.Name,
            Description = request.Description,
            RegistrationNumber = request.RegistrationNumber,
            TaxId = request.TaxId,
            Address = request.Address,
            City = request.City,
            State = request.State,
            Country = request.Country,
            PostalCode = request.PostalCode,
            Phone = request.Phone,
            Email = request.Email,
            Website = request.Website,
            SubscriptionPlan = request.SubscriptionPlan,
            SubscriptionStartDate = request.SubscriptionStartDate,
            SubscriptionEndDate = request.SubscriptionEndDate,
            IsActive = true
        };

        var createdCompany = await _companyService.CreateCompanyAsync(company, userId);
        return CreatedAtAction(nameof(GetCompany), new { id = createdCompany.Id }, createdCompany);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCompany(int id, UpdateCompanyRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = await GetCurrentUserIdAsync();
        var company = new Company
        {
            Name = request.Name,
            Description = request.Description,
            RegistrationNumber = request.RegistrationNumber,
            TaxId = request.TaxId,
            Address = request.Address,
            City = request.City,
            State = request.State,
            Country = request.Country,
            PostalCode = request.PostalCode,
            Phone = request.Phone,
            Email = request.Email,
            Website = request.Website,
            SubscriptionPlan = request.SubscriptionPlan,
            SubscriptionStartDate = request.SubscriptionStartDate,
            SubscriptionEndDate = request.SubscriptionEndDate,
            IsActive = request.IsActive
        };

        var updatedCompany = await _companyService.UpdateCompanyAsync(id, company, userId, IsSuperAdmin());
        if (updatedCompany == null)
            return NotFound();

        return Ok(updatedCompany);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var success = await _companyService.DeleteCompanyAsync(id, userId, IsSuperAdmin());
        
        if (!success)
            return NotFound();

        return NoContent();
    }
}

// Request DTOs
public class CreateCompanyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? TaxId { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? SubscriptionPlan { get; set; }
    public DateTime? SubscriptionStartDate { get; set; }
    public DateTime? SubscriptionEndDate { get; set; }
}

public class UpdateCompanyRequest : CreateCompanyRequest
{
    public bool IsActive { get; set; }
}
