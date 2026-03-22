using EWHQ.Api.Auditing;
using EWHQ.Api.Models.AdminPortal;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Security.Claims;

namespace EWHQ.Api.Services;

public class AccessAuditService : IAccessAuditService
{
    private readonly IAuditIngestionService _auditIngestionService;
    private readonly IOptions<AzureLogAnalyticsAuditOptions> _options;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<AccessAuditService> _logger;

    public AccessAuditService(
        IAuditIngestionService auditIngestionService,
        IOptions<AzureLogAnalyticsAuditOptions> options,
        IHttpContextAccessor httpContextAccessor,
        ILogger<AccessAuditService> logger)
    {
        _auditIngestionService = auditIngestionService;
        _options = options;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task LogAsync(AccessAuditLog entry)
    {
        entry.Id = string.IsNullOrWhiteSpace(entry.Id) ? Guid.NewGuid().ToString() : entry.Id;
        entry.CreatedAt = entry.CreatedAt == default ? DateTime.UtcNow : entry.CreatedAt;

        // Database-backed access audit persistence is intentionally disabled.
        // Access audit events are emitted to Azure Log Analytics (when enabled) and structured app logs.
        _logger.LogInformation(
            "HQAccessAudit teamId={TeamId} actionType={ActionType} actorUserId={ActorUserId} targetUserId={TargetUserId} targetEmail={TargetEmail} details={Details}",
            Clip(entry.TeamId, 120),
            Clip(entry.ActionType, 120),
            Clip(entry.ActorUserId, 120),
            Clip(entry.TargetUserId, 120),
            Clip(entry.TargetEmail, 200),
            Clip(entry.Details, 2000));

        if (!_auditIngestionService.IsEnabled)
        {
            return;
        }

        var context = _httpContextAccessor.HttpContext;
        var actorId = !string.IsNullOrWhiteSpace(entry.ActorUserId)
            ? entry.ActorUserId
            : context?.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

        var mutation = new MutationAuditEvent
        {
            Environment = _options.Value.Environment,
            ServiceName = _options.Value.ServiceName,
            OccurredAtUtc = entry.CreatedAt,
            TraceId = Activity.Current?.TraceId.ToString() ?? string.Empty,
            OperationId = Activity.Current?.RootId ?? string.Empty,
            RequestId = context?.TraceIdentifier ?? string.Empty,
            Module = "access_management",
            Action = NormalizeAction(entry.ActionType),
            Entity = "AccessAuditLog",
            EntityKey = $"teamId:{Clip(entry.TeamId, 120)}|entryId:{entry.Id}",
            ChangedFields = BuildChangedFields(entry),
            BeforeState = new Dictionary<string, object?>(),
            AfterState = BuildAfterState(entry),
            BusinessDetails = BuildBusinessDetails(entry),
            ActorType = string.IsNullOrWhiteSpace(actorId) ? "system" : "user",
            ActorId = actorId,
            ActorDisplay = !string.IsNullOrWhiteSpace(entry.TargetEmail) ? Clip(entry.TargetEmail, 200) : actorId
        };

        await _auditIngestionService.PublishMutationAuditAsync(mutation);
    }

    public async Task<IReadOnlyList<AccessAuditLog>> GetTeamLogsAsync(string teamId, int limit = 50)
    {
        _ = limit;
        _logger.LogInformation(
            "Access audit DB query skipped in Azure-only mode for teamId={TeamId}",
            Clip(teamId, 120));
        await Task.CompletedTask;
        return Array.Empty<AccessAuditLog>();
    }

    private static string NormalizeAction(string? actionType)
    {
        if (string.IsNullOrWhiteSpace(actionType))
        {
            return "access_audit";
        }

        return actionType.Trim().ToLowerInvariant();
    }

    private static IReadOnlyList<string> BuildChangedFields(AccessAuditLog entry)
    {
        var fields = new List<string>();
        if (!string.IsNullOrWhiteSpace(entry.ActionType))
        {
            fields.Add(nameof(entry.ActionType));
        }

        if (!string.IsNullOrWhiteSpace(entry.TargetUserId))
        {
            fields.Add(nameof(entry.TargetUserId));
        }

        if (!string.IsNullOrWhiteSpace(entry.TargetEmail))
        {
            fields.Add(nameof(entry.TargetEmail));
        }

        if (!string.IsNullOrWhiteSpace(entry.Details))
        {
            fields.Add(nameof(entry.Details));
        }

        return fields;
    }

    private static IReadOnlyDictionary<string, object?> BuildAfterState(AccessAuditLog entry)
    {
        return new Dictionary<string, object?>
        {
            ["teamId"] = Clip(entry.TeamId, 120),
            ["actionType"] = Clip(entry.ActionType, 120),
            ["targetUserId"] = Clip(entry.TargetUserId, 120),
            ["targetEmail"] = Clip(entry.TargetEmail, 200)
        };
    }

    private static IReadOnlyDictionary<string, object?> BuildBusinessDetails(AccessAuditLog entry)
    {
        return new Dictionary<string, object?>
        {
            ["teamId"] = Clip(entry.TeamId, 120),
            ["details"] = Clip(entry.Details, 2000)
        };
    }

    private static string Clip(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}
