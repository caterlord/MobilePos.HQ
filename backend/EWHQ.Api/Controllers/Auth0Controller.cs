using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EWHQ.Api.Identity;
using EWHQ.Api.Data;
using EWHQ.Api.Models.DTOs;
using System.Security.Claims;
using Newtonsoft.Json;
using System.Net.Http.Headers;
using System.Text;
using EWHQ.Api.Services;

namespace EWHQ.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class Auth0Controller : ControllerBase
{
    private readonly UserProfileDbContext _context;
    private readonly AdminPortalDbContext _adminPortalContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<Auth0Controller> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAuth0ManagementService _auth0ManagementService;

    public Auth0Controller(
        UserProfileDbContext context,
        AdminPortalDbContext adminPortalContext,
        IConfiguration configuration,
        ILogger<Auth0Controller> logger,
        IHttpClientFactory httpClientFactory,
        IAuth0ManagementService auth0ManagementService)
    {
        _context = context;
        _adminPortalContext = adminPortalContext;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _auth0ManagementService = auth0ManagementService;
    }

    [HttpPost("sync-user")]
    [Authorize]
    public async Task<IActionResult> SyncUser()
    {
        // Log all claims for debugging
        _logger.LogInformation("Claims in token:");
        foreach (var claim in User.Claims)
        {
            _logger.LogInformation($"  {claim.Type}: {claim.Value}");
        }

        // Get Auth0 user ID from the token
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(auth0UserId))
        {
            return BadRequest(new { message = "User ID not found in token" });
        }

        // Get the access token from the request header
        var accessToken = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

        // Call Auth0 userinfo endpoint to get user profile
        var auth0Domain = Environment.GetEnvironmentVariable("AUTH0_DOMAIN") ?? _configuration["Auth0:Domain"];
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var userinfoResponse = await httpClient.GetAsync($"https://{auth0Domain}/userinfo");
        if (!userinfoResponse.IsSuccessStatusCode)
        {
            _logger.LogError($"Failed to get userinfo from Auth0: {userinfoResponse.StatusCode}");
            return BadRequest(new { message = "Failed to get user profile from Auth0" });
        }

        var userinfoJson = await userinfoResponse.Content.ReadAsStringAsync();
        dynamic userinfo = JsonConvert.DeserializeObject(userinfoJson);

        var email = (string)userinfo.email;
        var name = (string)userinfo.name;

        if (string.IsNullOrEmpty(email))
        {
            return BadRequest(new { message = "Email not found in user profile" });
        }

        // Get full user profile from Auth0 Management API to access app_metadata
        var managementToken = await _auth0ManagementService.GetManagementApiTokenAsync();
        var managementClient = _httpClientFactory.CreateClient();
        managementClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managementToken);

        var userProfileResponse = await managementClient.GetAsync($"https://{auth0Domain}/api/v2/users/{Uri.EscapeDataString(auth0UserId)}");
        dynamic fullUserProfile = null;
        string userType = "Standard";

        string customFirstName = null;
        string customLastName = null;

        if (userProfileResponse.IsSuccessStatusCode)
        {
            var profileJson = await userProfileResponse.Content.ReadAsStringAsync();
            fullUserProfile = JsonConvert.DeserializeObject(profileJson);

            // Check for custom profile in user_metadata (for social login users who updated their name)
            var userMetadata = fullUserProfile?.user_metadata;
            if (userMetadata != null)
            {
                if (userMetadata.custom_profile == true)
                {
                    customFirstName = (string)userMetadata.first_name;
                    customLastName = (string)userMetadata.last_name;
                    _logger.LogInformation($"Found custom profile for {auth0UserId}: {customFirstName} {customLastName}");
                }
            }

            // Check if user is authorized for Admin Portal
            var adminClientId = Environment.GetEnvironmentVariable("AUTH0_ADMIN_CLIENT_ID");
            var appMetadata = fullUserProfile?.app_metadata;

            if (appMetadata != null)
            {
                var authorizedApps = appMetadata.authorized_applications;
                var appRoles = appMetadata.roles;

                // Check if user is authorized for Admin Portal
                if (authorizedApps != null && adminClientId != null)
                {
                    foreach (var app in authorizedApps)
                    {
                        if (app.ToString() == adminClientId)
                        {
                            // User is authorized for Admin Portal, set UserType from roles
                            if (appRoles != null && appRoles.Count > 0)
                            {
                                userType = appRoles[0].ToString();
                            }
                            break;
                        }
                    }
                }
            }
        }

        // Extract identity provider from Auth0UserId (e.g., "auth0", "google-oauth2", "facebook")
        var identityProvider = ExtractIdentityProvider(auth0UserId);

        // Check if user already exists in local database by Auth0UserId (not email, as same email can have multiple auth providers)
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId);

        if (user == null)
        {
            user = new ApplicationUser
            {
                Email = email,
                FirstName = !string.IsNullOrEmpty(customFirstName) ? customFirstName : ExtractFirstName(name),
                LastName = !string.IsNullOrEmpty(customLastName) ? customLastName : ExtractLastName(name),
                UserType = userType,
                Auth0UserId = auth0UserId,
                IdentityProvider = identityProvider,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow // Set initial login time
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created new user {Email} with Auth0 ID {Auth0UserId}, IdentityProvider {IdentityProvider}, and UserType {UserType}",
                email, auth0UserId, identityProvider, userType);
        }
        else
        {
            // Update existing user
            user.Email = email;
            // Use custom name from user_metadata if available, otherwise use Auth0 profile name
            user.FirstName = !string.IsNullOrEmpty(customFirstName) ? customFirstName : ExtractFirstName(name);
            user.LastName = !string.IsNullOrEmpty(customLastName) ? customLastName : ExtractLastName(name);
            user.UserType = userType;
            user.IdentityProvider = identityProvider;
            user.UpdatedAt = DateTime.UtcNow;
            user.LastLoginAt = DateTime.UtcNow; // Update last login time
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated user {Auth0UserId} with Email {Email}, IdentityProvider {IdentityProvider}, and UserType {UserType}",
                auth0UserId, email, identityProvider, userType);
        }

        // Get user roles from database (not Auth0)
        var roles = new List<string> { user.UserType ?? "Standard" };

        return Ok(new
        {
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = roles,
            Auth0UserId = auth0UserId,
            Message = "User synchronized successfully"
        });
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        // Get Auth0 user ID from the token
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(auth0UserId))
        {
            return BadRequest(new { message = "User ID not found in token" });
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId);

        if (user == null)
        {
            return NotFound(new { message = "User profile not found. Please sync your account first." });
        }

        var roles = new List<string> { user.UserType ?? "Standard" };

        // Get user's tenant associations from new multi-tenant system
        var userCompanies = await _adminPortalContext.UserCompanies
            .Where(uc => uc.UserId == user.Id && uc.IsActive)
            .Include(uc => uc.Company)
            .ToListAsync();

        int? accountId = null;
        int? shopId = null;

        if (userCompanies.Any())
        {
            var firstCompany = userCompanies.First();
            // Use company ID as accountId for compatibility with frontend
            accountId = firstCompany.CompanyId;

            // Get the first shop for this company
            var firstShop = await _adminPortalContext.Shops
                .Where(s => s.Brand.CompanyId == firstCompany.CompanyId && s.IsActive)
                .FirstOrDefaultAsync();

            if (firstShop != null)
            {
                shopId = firstShop.Id;
            }
        }

        // Determine identity provider from Auth0UserId
        string identityProvider = "Auth0";
        if (auth0UserId.StartsWith("google-oauth2|"))
            identityProvider = "Google";
        else if (auth0UserId.StartsWith("facebook|"))
            identityProvider = "Facebook";
        else if (auth0UserId.StartsWith("linkedin|"))
            identityProvider = "LinkedIn";
        else if (auth0UserId.StartsWith("github|"))
            identityProvider = "GitHub";
        else if (auth0UserId.StartsWith("twitter|"))
            identityProvider = "Twitter";
        else if (auth0UserId.StartsWith("auth0|"))
            identityProvider = "Email/Password";

        // Determine portal access based on UserType and company associations
        bool canAccessAdminPortal = user.UserType == "SuperAdmin" || user.UserType == "Admin";
        bool canAccessHQPortal = userCompanies.Any();

        return Ok(new
        {
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            UserType = user.UserType,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            Roles = roles,
            Auth0UserId = auth0UserId,
            IdentityProvider = identityProvider,
            // Portal access permissions
            PortalAccess = new
            {
                CanAccessAdminPortal = canAccessAdminPortal,
                CanAccessHQPortal = canAccessHQPortal,
                IsInternalStaff = canAccessAdminPortal,
                IsCustomer = canAccessHQPortal && !canAccessAdminPortal
            },
            // Tenant information from database
            AccountId = accountId,
            ShopId = shopId,
            // New multi-tenant associations
            Companies = userCompanies.Select(uc => new
            {
                uc.CompanyId,
                uc.Company?.Name,
                Role = uc.Role.ToString(),
                uc.AcceptedAt,
                uc.IsActive
            })
        });
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto model)
    {
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(auth0UserId))
        {
            return BadRequest(new { message = "User ID not found in token" });
        }

        // Get the access token from the request header
        var accessToken = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

        // Call Auth0 userinfo endpoint to get email
        var auth0Domain = Environment.GetEnvironmentVariable("AUTH0_DOMAIN") ?? _configuration["Auth0:Domain"];
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var userinfoResponse = await httpClient.GetAsync($"https://{auth0Domain}/userinfo");
        if (!userinfoResponse.IsSuccessStatusCode)
        {
            _logger.LogError($"Failed to get userinfo from Auth0: {userinfoResponse.StatusCode}");
            return BadRequest(new { message = "Failed to get user profile from Auth0" });
        }

        var userinfoJson = await userinfoResponse.Content.ReadAsStringAsync();
        dynamic userinfo = JsonConvert.DeserializeObject(userinfoJson);
        var email = (string)userinfo.email;

        if (string.IsNullOrEmpty(email))
        {
            return BadRequest(new { message = "Email not found in user profile" });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId);

        if (user == null)
        {
            return NotFound(new { message = "User profile not found" });
        }

        // Update user profile in local database
        if (!string.IsNullOrEmpty(model.FirstName))
            user.FirstName = model.FirstName;

        if (!string.IsNullOrEmpty(model.LastName))
            user.LastName = model.LastName;

        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Update profile in Auth0
        if (!string.IsNullOrEmpty(auth0UserId))
        {
            var auth0Updated = await _auth0ManagementService.UpdateUserProfileAsync(
                auth0UserId,
                user.FirstName ?? "",
                user.LastName ?? ""
            );

            if (!auth0Updated)
            {
                _logger.LogWarning($"Profile updated in local database but failed to sync with Auth0 for user {email}");
                return Ok(new
                {
                    Message = "Profile updated successfully in local database",
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Warning = "Auth0 user_metadata update failed. Your changes are saved locally."
                });
            }

            // For Google OAuth2 users, inform them about the limitation
            if (auth0UserId.StartsWith("google-oauth2|"))
            {
                return Ok(new
                {
                    Message = "Profile updated successfully",
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Info = "Your custom name has been saved. Note: Auth0 dashboard will still show your Google account name due to social login sync settings, but your custom name is stored in user_metadata."
                });
            }
        }

        return Ok(new
        {
            Message = "Profile updated successfully",
            FirstName = user.FirstName,
            LastName = user.LastName
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto _)
    {
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(auth0UserId))
        {
            return BadRequest(new { message = "User ID not found in token" });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId);
        if (user == null || string.IsNullOrWhiteSpace(user.Email))
        {
            return NotFound(new { message = "User profile not found or missing email" });
        }

        var identityProvider = user.IdentityProvider?.ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(identityProvider) && identityProvider != "auth0")
        {
            return BadRequest(new
            {
                message = "Password management is handled by your identity provider"
            });
        }

        var auth0Domain = Environment.GetEnvironmentVariable("AUTH0_DOMAIN") ?? _configuration["Auth0:Domain"];
        var auth0ClientId = Environment.GetEnvironmentVariable("AUTH0_ADMIN_CLIENT_ID")
                            ?? Environment.GetEnvironmentVariable("AUTH0_CLIENT_ID")
                            ?? _configuration["Auth0:AdminClientId"]
                            ?? _configuration["Auth0:ClientId"];
        var dbConnection = Environment.GetEnvironmentVariable("AUTH0_DB_CONNECTION")
                           ?? _configuration["Auth0:DbConnection"]
                           ?? "Username-Password-Authentication";

        if (string.IsNullOrWhiteSpace(auth0Domain) || string.IsNullOrWhiteSpace(auth0ClientId))
        {
            _logger.LogError("Auth0 password reset settings are not configured properly");
            return StatusCode(500, new { message = "Password reset is not configured" });
        }

        var httpClient = _httpClientFactory.CreateClient();
        var payload = new
        {
            client_id = auth0ClientId,
            email = user.Email,
            connection = dbConnection
        };

        var response = await httpClient.PostAsync(
            $"https://{auth0Domain}/dbconnections/change_password",
            new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to trigger Auth0 password reset for {Email}: {StatusCode} - {Error}",
                user.Email, response.StatusCode, errorContent);
            return StatusCode((int)response.StatusCode, new { message = "Failed to initiate password reset" });
        }

        return Ok(new { message = "Password reset email sent successfully" });
    }

    private string ExtractIdentityProvider(string? auth0UserId)
    {
        if (string.IsNullOrEmpty(auth0UserId))
            return "unknown";

        var parts = auth0UserId.Split('|');
        return parts.Length > 0 ? parts[0] : "unknown";
    }

    private string ExtractFirstName(string? fullName)
    {
        if (string.IsNullOrEmpty(fullName))
            return "";

        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 0 ? parts[0] : "";
    }

    private string ExtractLastName(string? fullName)
    {
        if (string.IsNullOrEmpty(fullName))
            return "";

        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 1 ? string.Join(" ", parts.Skip(1)) : "";
    }

    [HttpGet("admin-users")]
    [Authorize]
    public async Task<IActionResult> GetAllAdminUsers()
    {
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(auth0UserId))
        {
            return BadRequest(new { message = "User ID not found in token" });
        }

        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId);
        if (currentUser == null || (currentUser.UserType != "SuperAdmin" && currentUser.UserType != "Admin"))
        {
            return Forbid();
        }

        var users = await _context.Users
            .Where(u => u.UserType == "SuperAdmin" || u.UserType == "Admin" || u.UserType == "Manager")
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var userDtos = users.Select(u => new
        {
            Id = u.Id,
            Name = $"{u.FirstName} {u.LastName}".Trim(),
            Email = u.Email,
            Roles = new[] { u.UserType ?? "Standard" },
            Status = string.IsNullOrEmpty(u.LastLoginAt?.ToString()) ? "pending" :
                     (u.LastLoginAt > DateTime.UtcNow.AddDays(-30) ? "active" : "inactive"),
            LastActive = u.LastLoginAt.HasValue
                ? GetRelativeTime(u.LastLoginAt.Value)
                : "Never",
            CreatedAt = u.CreatedAt.ToString("yyyy-MM-dd"),
            IdentityProvider = GetProviderDisplayName(u.IdentityProvider),
            Auth0UserId = u.Auth0UserId
        }).ToList();

        return Ok(userDtos);
    }

    private string GetRelativeTime(DateTime dateTime)
    {
        var diff = DateTime.UtcNow - dateTime;

        if (diff.TotalMinutes < 1)
            return "Just now";
        if (diff.TotalMinutes < 60)
            return $"{(int)diff.TotalMinutes} minute{((int)diff.TotalMinutes != 1 ? "s" : "")} ago";
        if (diff.TotalHours < 24)
            return $"{(int)diff.TotalHours} hour{((int)diff.TotalHours != 1 ? "s" : "")} ago";
        if (diff.TotalDays < 30)
            return $"{(int)diff.TotalDays} day{((int)diff.TotalDays != 1 ? "s" : "")} ago";
        if (diff.TotalDays < 365)
            return $"{(int)(diff.TotalDays / 30)} month{((int)(diff.TotalDays / 30) != 1 ? "s" : "")} ago";

        return $"{(int)(diff.TotalDays / 365)} year{((int)(diff.TotalDays / 365) != 1 ? "s" : "")} ago";
    }

    private string GetProviderDisplayName(string? provider)
    {
        if (string.IsNullOrEmpty(provider))
            return "auth0";

        return provider.ToLower() switch
        {
            "google-oauth2" => "google",
            "auth0" => "auth0",
            "facebook" => "facebook",
            "linkedin" => "linkedin",
            "github" => "github",
            "twitter" => "twitter",
            _ => provider.ToLower()
        };
    }

    [HttpPut("admin-users/{userId}")]
    [Authorize]
    public async Task<IActionResult> UpdateAdminUser(string userId, [FromBody] UpdateAdminUserDto model)
    {
        // Check if the current user has permission
        var auth0UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(auth0UserId))
        {
            return BadRequest(new { message = "User ID not found in token" });
        }

        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId);
        if (currentUser == null || (currentUser.UserType != "SuperAdmin" && currentUser.UserType != "Admin"))
        {
            return Forbid();
        }

        // Get the target user (userId is a string, not a GUID)
        var targetUser = await _context.Users.FindAsync(userId);
        if (targetUser == null)
        {
            return NotFound(new { message = "User not found" });
        }

        // Update user profile in local database
        if (model.FirstName != null)
            targetUser.FirstName = model.FirstName;

        if (model.LastName != null)
            targetUser.LastName = model.LastName;

        if (model.UserType != null && (currentUser.UserType == "SuperAdmin" ||
            (currentUser.UserType == "Admin" && model.UserType != "SuperAdmin")))
        {
            targetUser.UserType = model.UserType;
        }

        targetUser.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Update profile in Auth0 if Auth0UserId exists
        if (!string.IsNullOrEmpty(targetUser.Auth0UserId))
        {
            var auth0Updated = await _auth0ManagementService.UpdateUserProfileAsync(
                targetUser.Auth0UserId,
                targetUser.FirstName ?? "",
                targetUser.LastName ?? ""
            );

            // Also update roles in Auth0 app_metadata if UserType changed
            if (model.UserType != null && auth0Updated)
            {
                await _auth0ManagementService.UpdateUserMetadataAsync(
                    targetUser.Auth0UserId,
                    new { roles = new[] { model.UserType } }
                );
            }

            if (!auth0Updated)
            {
                _logger.LogWarning($"Profile updated in local database but failed to sync with Auth0 for user {targetUser.Email}");
            }
        }

        return Ok(new
        {
            Message = "User updated successfully",
            User = new
            {
                Id = targetUser.Id,
                FirstName = targetUser.FirstName,
                LastName = targetUser.LastName,
                Name = $"{targetUser.FirstName} {targetUser.LastName}".Trim(),
                Email = targetUser.Email,
                UserType = targetUser.UserType,
                Roles = new[] { targetUser.UserType ?? "Standard" }
            }
        });
    }
}

public class UpdateProfileDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

public class UpdateAdminUserDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? UserType { get; set; }
}

public class ChangePasswordRequestDto
{
    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
}
