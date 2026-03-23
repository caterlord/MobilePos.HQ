using System.Security.Claims;
using System.Text.Encodings.Web;
using Clerk.BackendAPI.Helpers.Jwks;
using EWHQ.Api.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace EWHQ.Api.Authorization;

public sealed class ClerkAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Clerk";

    private readonly ClerkAuthenticationSettings _settings;

    public ClerkAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISystemClock clock,
        ClerkAuthenticationSettings settings)
        : base(options, logger, encoder, clock)
    {
        _settings = settings;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.ContainsKey("Authorization") && !Request.Cookies.ContainsKey("__session"))
        {
            return AuthenticateResult.NoResult();
        }

        try
        {
            var requestState = await AuthenticateRequest.AuthenticateRequestAsync(
                Request,
                new AuthenticateRequestOptions(
                    secretKey: _settings.SecretKey,
                    machineSecretKey: _settings.MachineSecretKey,
                    jwtKey: _settings.JwtKey,
                    audiences: _settings.Audiences,
                    authorizedParties: _settings.AllowedParties));

            if (!requestState.IsAuthenticated || requestState.Claims == null)
            {
                return AuthenticateResult.Fail("Invalid Clerk session token.");
            }

            var principal = BuildPrincipal(requestState.Claims, Scheme.Name);
            return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Clerk request authentication failed.");
            return AuthenticateResult.Fail("Clerk request authentication failed.");
        }
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
