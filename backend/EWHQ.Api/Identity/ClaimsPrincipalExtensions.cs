using System.Security.Claims;
using EWHQ.Api.Constants;

namespace EWHQ.Api.Identity;

public static class ClaimsPrincipalExtensions
{
    public static string? GetExternalUserId(this ClaimsPrincipal principal)
    {
        return principal.FindFirst("sub")?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    public static string? GetLocalUserId(this ClaimsPrincipal principal)
    {
        return principal.FindFirst(HqClaimTypes.LocalUserId)?.Value;
    }

    public static string? GetEmailAddress(this ClaimsPrincipal principal)
    {
        return principal.FindFirst(ClaimTypes.Email)?.Value
            ?? principal.FindFirst("email")?.Value
            ?? principal.FindFirst("https://ewhq.com/email")?.Value
            ?? principal.FindFirst("https://posx.one/email")?.Value;
    }
}
