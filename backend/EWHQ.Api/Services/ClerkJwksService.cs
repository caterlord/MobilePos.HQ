using System.Net.Http.Headers;
using EWHQ.Api.Authorization;
using Microsoft.IdentityModel.Tokens;

namespace EWHQ.Api.Services;

public interface IClerkJwksService
{
    Task<IReadOnlyCollection<SecurityKey>> GetSigningKeysAsync(CancellationToken cancellationToken);
}

public sealed class ClerkJwksService : IClerkJwksService
{
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromMinutes(10);
    private const string ClerkJwksUrl = "https://api.clerk.com/v1/jwks";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ClerkAuthenticationSettings _settings;
    private readonly ILogger<ClerkJwksService> _logger;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private IReadOnlyCollection<SecurityKey>? _cachedKeys;
    private DateTimeOffset _cachedUntilUtc;

    public ClerkJwksService(
        IHttpClientFactory httpClientFactory,
        ClerkAuthenticationSettings settings,
        ILogger<ClerkJwksService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<SecurityKey>> GetSigningKeysAsync(CancellationToken cancellationToken)
    {
        if (_cachedKeys is { Count: > 0 } && _cachedUntilUtc > DateTimeOffset.UtcNow)
        {
            return _cachedKeys;
        }

        await _refreshLock.WaitAsync(cancellationToken);
        try
        {
            if (_cachedKeys is { Count: > 0 } && _cachedUntilUtc > DateTimeOffset.UtcNow)
            {
                return _cachedKeys;
            }

            using var request = new HttpRequestMessage(HttpMethod.Get, ClerkJwksUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.SecretKey);

            using var client = _httpClientFactory.CreateClient(nameof(ClerkJwksService));
            using var response = await client.SendAsync(request, cancellationToken);
            var payload = await response.Content.ReadAsStringAsync(cancellationToken);

            response.EnsureSuccessStatusCode();

            var jwks = new JsonWebKeySet(payload);
            var signingKeys = jwks.GetSigningKeys().ToArray();
            if (signingKeys.Length == 0)
            {
                throw new InvalidOperationException("Clerk JWKS response did not contain any signing keys.");
            }

            _cachedKeys = signingKeys;
            _cachedUntilUtc = DateTimeOffset.UtcNow.Add(CacheLifetime);

            return signingKeys;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to refresh Clerk JWKS signing keys.");

            if (_cachedKeys is { Count: > 0 })
            {
                return _cachedKeys;
            }

            throw;
        }
        finally
        {
            _refreshLock.Release();
        }
    }
}
