using System.Security.Claims;
using EWHQ.Api.Constants;
using EWHQ.Api.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Authorization;

public sealed class LocalUserClaimsTransformation : IClaimsTransformation
{
    private readonly UserProfileDbContext _userContext;

    public LocalUserClaimsTransformation(UserProfileDbContext userContext)
    {
        _userContext = userContext;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
        {
            return principal;
        }

        if (principal.HasClaim(claim => claim.Type == HqClaimTypes.LocalUserId)
            && principal.HasClaim(claim => claim.Type == HqClaimTypes.UserType))
        {
            return principal;
        }

        var externalUserId = principal.GetExternalUserId();

        if (string.IsNullOrWhiteSpace(externalUserId))
        {
            return principal;
        }

        var user = await _userContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.ExternalUserId == externalUserId);

        if (user == null)
        {
            return principal;
        }

        var identity = principal.Identity as ClaimsIdentity;
        if (identity == null)
        {
            return principal;
        }

        var clone = new ClaimsPrincipal(new ClaimsIdentity(identity));
        if (clone.Identity is not ClaimsIdentity clonedIdentity)
        {
            return principal;
        }

        AddClaimIfMissing(clonedIdentity, HqClaimTypes.LocalUserId, user.Id);
        AddClaimIfMissing(clonedIdentity, HqClaimTypes.UserType, user.UserType);
        AddClaimIfMissing(clonedIdentity, ClaimTypes.Role, user.UserType);

        return clone;
    }

    private static void AddClaimIfMissing(ClaimsIdentity identity, string claimType, string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || identity.HasClaim(claimType, value))
        {
            return;
        }

        identity.AddClaim(new Claim(claimType, value));
    }
}
