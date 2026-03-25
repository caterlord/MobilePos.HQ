using System.Security.Claims;
using System.Text.Encodings.Web;
using EWHQ.Api.Identity;
using EWHQ.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;

namespace EWHQ.Api.Authorization;

public sealed class ClerkAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Clerk";

    private readonly ClerkAuthenticationSettings _settings;
    private readonly IClerkJwksService _jwksService;
    private readonly JwtSecurityTokenHandler _tokenHandler = new();

    public ClerkAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ClerkAuthenticationSettings settings,
        IClerkJwksService jwksService)
        : base(options, logger, encoder)
    {
        _settings = settings;
        _jwksService = jwksService;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var token = GetSessionToken();
        if (string.IsNullOrWhiteSpace(token))
        {
            return AuthenticateResult.NoResult();
        }

        try
        {
            var signingKeys = await _jwksService.GetSigningKeysAsync(Context.RequestAborted);
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = signingKeys,
                ValidateIssuer = false,
                ValidateAudience = _settings.Audiences.Count > 0,
                ValidAudiences = _settings.Audiences,
                ValidateLifetime = true,
                RequireExpirationTime = true,
                ClockSkew = TimeSpan.FromSeconds(5),
                NameClaimType = ClaimTypes.NameIdentifier,
                RoleClaimType = ClaimTypes.Role
            };

            var principal = _tokenHandler.ValidateToken(token, validationParameters, out _);
            if (!IsAuthorizedPartyAllowed(principal))
            {
                return AuthenticateResult.Fail("Invalid Clerk authorized party.");
            }

            principal = BuildPrincipal(principal, Scheme.Name);
            return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Clerk request authentication failed.");
            return AuthenticateResult.Fail("Clerk request authentication failed.");
        }
    }

    private string? GetSessionToken()
    {
        if (Request.Headers.TryGetValue("Authorization", out var authorizationHeader))
        {
            var bearerValue = authorizationHeader.ToString();
            const string bearerPrefix = "Bearer ";
            if (bearerValue.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
            {
                return bearerValue[bearerPrefix.Length..].Trim();
            }
        }

        if (Request.Cookies.TryGetValue("__session", out var cookieToken))
        {
            return cookieToken;
        }

        return null;
    }

    private bool IsAuthorizedPartyAllowed(ClaimsPrincipal principal)
    {
        var azp = principal.FindFirst("azp")?.Value;
        if (string.IsNullOrWhiteSpace(azp) || _settings.AllowedParties.Count == 0)
        {
            return true;
        }

        return _settings.AllowedParties.Contains(azp, StringComparer.OrdinalIgnoreCase);
    }

    private static ClaimsPrincipal BuildPrincipal(ClaimsPrincipal principal, string authenticationType)
    {
        var claims = principal.Claims.ToList();
        var externalUserId = principal.GetExternalUserId();
        var email = principal.GetEmailAddress();

        if (!string.IsNullOrWhiteSpace(externalUserId))
        {
            AddClaimIfMissing(claims, ClaimTypes.NameIdentifier, externalUserId);
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            AddClaimIfMissing(claims, ClaimTypes.Email, email);
        }

        var identity = new ClaimsIdentity(claims, authenticationType, ClaimTypes.NameIdentifier, ClaimTypes.Role);
        return new ClaimsPrincipal(identity);
    }

    private static void AddClaimIfMissing(List<Claim> claims, string claimType, string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || claims.Any(claim => claim.Type == claimType))
        {
            return;
        }

        claims.Add(new Claim(claimType, value));
    }
}
