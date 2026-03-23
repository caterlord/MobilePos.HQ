using System.Text.Json;
using Clerk.BackendAPI;
using Clerk.BackendAPI.Models.Components;
using Clerk.BackendAPI.Models.Operations;

namespace EWHQ.Api.Services;

public record ClerkUserProfile(
    string UserId,
    string Email,
    string FirstName,
    string LastName,
    string IdentityProvider,
    string UserType);

public record ClerkInvitationResult(
    string InvitationId,
    string Email,
    string? InvitationUrl);

public interface IClerkUserService
{
    Task<ClerkUserProfile?> GetUserAsync(string userId);
    Task<bool> UpdateUserProfileAsync(string userId, string firstName, string lastName);
    Task<bool> UpdateUserPublicMetadataAsync(string userId, IReadOnlyDictionary<string, object?> metadata);
    Task<ClerkInvitationResult> InviteUserAsync(string email, string firstName, string lastName, string userType);
}

public class ClerkUserService : IClerkUserService
{
    private readonly ClerkBackendApi _clerkApi;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ClerkUserService> _logger;

    public ClerkUserService(
        ClerkBackendApi clerkApi,
        IConfiguration configuration,
        ILogger<ClerkUserService> logger)
    {
        _clerkApi = clerkApi;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ClerkUserProfile?> GetUserAsync(string userId)
    {
        try
        {
            var response = await _clerkApi.Users.GetAsync(userId);
            return response.User == null ? null : MapUserProfile(response.User);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load Clerk user {UserId}", userId);
            return null;
        }
    }

    public async Task<bool> UpdateUserProfileAsync(string userId, string firstName, string lastName)
    {
        try
        {
            await _clerkApi.Users.UpdateAsync(
                userId,
                new UpdateUserRequestBody
                {
                    FirstName = firstName,
                    LastName = lastName
                });

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update Clerk profile for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> UpdateUserPublicMetadataAsync(string userId, IReadOnlyDictionary<string, object?> metadata)
    {
        try
        {
            var response = await _clerkApi.Users.GetAsync(userId);
            if (response.User == null)
            {
                return false;
            }

            var mergedMetadata = response.User.PublicMetadata != null
                ? new Dictionary<string, object>(response.User.PublicMetadata, StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            foreach (var (key, value) in metadata)
            {
                if (value == null)
                {
                    mergedMetadata.Remove(key);
                    continue;
                }

                mergedMetadata[key] = value;
            }

            await _clerkApi.Users.UpdateAsync(
                userId,
                new UpdateUserRequestBody
                {
                    PublicMetadata = mergedMetadata
                });

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update Clerk public metadata for user {UserId}", userId);
            return false;
        }
    }

    public async Task<ClerkInvitationResult> InviteUserAsync(string email, string firstName, string lastName, string userType)
    {
        var redirectUrl = ResolveInvitationRedirectUrl();

        var response = await _clerkApi.Invitations.CreateAsync(
            new CreateInvitationRequestBody
            {
                EmailAddress = email,
                RedirectUrl = redirectUrl,
                ExpiresInDays = 7,
                Notify = true,
                PublicMetadata = new Dictionary<string, object>
                {
                    ["firstName"] = firstName,
                    ["lastName"] = lastName,
                    ["userType"] = userType,
                    ["adminPortalAccess"] = true
                }
            });

        if (response.Invitation == null)
        {
            throw new InvalidOperationException("Clerk invitation API returned no invitation payload.");
        }

        return new ClerkInvitationResult(
            response.Invitation.Id,
            response.Invitation.EmailAddress,
            response.Invitation.Url);
    }

    private string ResolveInvitationRedirectUrl()
    {
        var configuredUrl = Environment.GetEnvironmentVariable("CLERK_INVITATION_REDIRECT_URL")
            ?? _configuration["Clerk:InvitationRedirectUrl"];

        if (!string.IsNullOrWhiteSpace(configuredUrl))
        {
            return configuredUrl;
        }

        var appBaseUrl = Environment.GetEnvironmentVariable("APP_BASE_URL")
            ?? _configuration["App:BaseUrl"]
            ?? "http://localhost:5173";

        return $"{appBaseUrl.TrimEnd('/')}/sign-up";
    }

    private static ClerkUserProfile MapUserProfile(User user)
    {
        var firstName = user.FirstName ?? GetMetadataString(user.PublicMetadata, "firstName");
        var lastName = user.LastName ?? GetMetadataString(user.PublicMetadata, "lastName");

        return new ClerkUserProfile(
            user.Id,
            ResolvePrimaryEmail(user),
            firstName ?? string.Empty,
            lastName ?? string.Empty,
            ResolveIdentityProvider(user),
            GetMetadataString(user.PublicMetadata, "userType")
                ?? GetMetadataString(user.PublicMetadata, "role")
                ?? "Standard");
    }

    private static string ResolvePrimaryEmail(User user)
    {
        if (user.EmailAddresses == null || user.EmailAddresses.Count == 0)
        {
            return string.Empty;
        }

        if (!string.IsNullOrWhiteSpace(user.PrimaryEmailAddressId))
        {
            var primaryEmail = user.EmailAddresses.FirstOrDefault(email => email.Id == user.PrimaryEmailAddressId);
            if (!string.IsNullOrWhiteSpace(primaryEmail?.EmailAddressValue))
            {
                return primaryEmail.EmailAddressValue;
            }
        }

        return user.EmailAddresses.FirstOrDefault()?.EmailAddressValue ?? string.Empty;
    }

    private static string ResolveIdentityProvider(User user)
    {
        var provider = user.ExternalAccounts?.FirstOrDefault()?.Provider;
        if (!string.IsNullOrWhiteSpace(provider))
        {
            return provider;
        }

        if (user.PasswordEnabled || (user.EmailAddresses?.Count ?? 0) > 0)
        {
            return "email";
        }

        return "clerk";
    }

    private static string? GetMetadataString(IReadOnlyDictionary<string, object>? metadata, string key)
    {
        if (metadata == null || !metadata.TryGetValue(key, out var value) || value == null)
        {
            return null;
        }

        return value switch
        {
            string stringValue => stringValue,
            JsonElement jsonElement when jsonElement.ValueKind == JsonValueKind.String => jsonElement.GetString(),
            JsonElement jsonElement when jsonElement.ValueKind == JsonValueKind.Number => jsonElement.ToString(),
            JsonElement jsonElement when jsonElement.ValueKind == JsonValueKind.True || jsonElement.ValueKind == JsonValueKind.False => jsonElement.GetBoolean().ToString(),
            _ => value.ToString()
        };
    }
}
