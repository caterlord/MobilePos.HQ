using System.Diagnostics;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EWHQ.Api.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace EWHQ.Api.Auditing;

public class RequestAuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IAuditIngestionService _auditIngestionService;
    private readonly IOptions<AzureLogAnalyticsAuditOptions> _options;
    private readonly ILogger<RequestAuditMiddleware> _logger;

    public RequestAuditMiddleware(
        RequestDelegate next,
        IAuditIngestionService auditIngestionService,
        IOptions<AzureLogAnalyticsAuditOptions> options,
        ILogger<RequestAuditMiddleware> logger)
    {
        _next = next;
        _auditIngestionService = auditIngestionService;
        _options = options;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        var startedAt = DateTime.UtcNow;
        var stopwatch = Stopwatch.StartNew();
        Exception? requestException = null;

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            requestException = ex;
            throw;
        }
        finally
        {
            stopwatch.Stop();
            if (_auditIngestionService.IsEnabled)
            {
                try
                {
                    var endpoint = context.GetEndpoint();
                    var routeTemplate = endpoint is Microsoft.AspNetCore.Routing.RouteEndpoint routeEndpoint
                        ? routeEndpoint.RoutePattern.RawText ?? string.Empty
                        : endpoint?.DisplayName ?? context.Request.Path.Value ?? string.Empty;

                    var externalUserId = context.User.GetExternalUserId() ?? string.Empty;
                    var email = context.User.GetEmailAddress() ?? string.Empty;
                    var emailHash = HashEmail(email);

                    var requestAuditEvent = new RequestAuditEvent
                    {
                        Environment = _options.Value.Environment,
                        ServiceName = _options.Value.ServiceName,
                        OccurredAtUtc = startedAt,
                        TraceId = Activity.Current?.TraceId.ToString() ?? string.Empty,
                        OperationId = Activity.Current?.RootId ?? string.Empty,
                        RequestId = context.TraceIdentifier,
                        ExternalUserId = externalUserId,
                        UserEmailHash = emailHash,
                        BrandId = ParseRouteInt(context, "brandId"),
                        CompanyId = ParseRouteInt(context, "companyId"),
                        ShopId = ParseRouteInt(context, "shopId"),
                        HttpMethod = context.Request.Method,
                        RouteTemplate = Clip(routeTemplate, 500),
                        RequestPath = Clip(context.Request.Path.Value ?? string.Empty, 500),
                        StatusCode = context.Response.StatusCode,
                        DurationMs = stopwatch.Elapsed.TotalMilliseconds,
                        ClientIpMasked = MaskIp(context.Connection.RemoteIpAddress?.ToString()),
                        UserAgent = Clip(context.Request.Headers.UserAgent.ToString(), 500),
                        IsAuthenticated = context.User.Identity?.IsAuthenticated ?? false,
                        FailureCategory = ResolveFailureCategory(context.Response.StatusCode, requestException)
                    };

                    await _auditIngestionService.PublishRequestAuditAsync(requestAuditEvent, CancellationToken.None);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to publish request audit event.");
                }
            }
        }
    }

    private static int? ParseRouteInt(HttpContext context, string key)
    {
        if (!context.Request.RouteValues.TryGetValue(key, out var raw) || raw == null)
        {
            return null;
        }

        return int.TryParse(raw.ToString(), out var parsed) ? parsed : null;
    }

    private static string ResolveFailureCategory(int statusCode, Exception? exception)
    {
        if (exception != null)
        {
            return "exception";
        }

        if (statusCode >= 500)
        {
            return "server_error";
        }

        if (statusCode == StatusCodes.Status401Unauthorized || statusCode == StatusCodes.Status403Forbidden)
        {
            return "authorization";
        }

        if (statusCode >= 400)
        {
            return "validation";
        }

        return string.Empty;
    }

    private static string HashEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return string.Empty;
        }

        var normalized = email.Trim().ToLowerInvariant();
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string MaskIp(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip))
        {
            return string.Empty;
        }

        if (ip.Contains('.'))
        {
            var segments = ip.Split('.');
            if (segments.Length == 4)
            {
                return $"{segments[0]}.{segments[1]}.{segments[2]}.0";
            }
        }

        if (ip.Contains(':'))
        {
            var segments = ip.Split(':', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length >= 2)
            {
                return $"{segments[0]}:{segments[1]}::";
            }
        }

        return string.Empty;
    }

    private static string Clip(string value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}
