namespace EWHQ.Api.Authorization;

public sealed class ClerkAuthenticationSettings
{
    public string SecretKey { get; init; } = string.Empty;
    public string? MachineSecretKey { get; init; }
    public string? JwtKey { get; init; }
    public IReadOnlyList<string> Audiences { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> AllowedParties { get; init; } = Array.Empty<string>();
}
