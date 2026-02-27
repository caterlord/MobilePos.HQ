using System.Diagnostics;
using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Options;

namespace EWHQ.Api.Auditing;

public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly IAuditIngestionService _auditIngestionService;
    private readonly IOptions<AzureLogAnalyticsAuditOptions> _options;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<AuditSaveChangesInterceptor> _logger;
    private readonly Dictionary<Guid, List<PendingMutation>> _pendingByContextId = new();

    public AuditSaveChangesInterceptor(
        IAuditIngestionService auditIngestionService,
        IOptions<AzureLogAnalyticsAuditOptions> options,
        IHttpContextAccessor httpContextAccessor,
        ILogger<AuditSaveChangesInterceptor> logger)
    {
        _auditIngestionService = auditIngestionService;
        _options = options;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        CapturePendingMutations(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        CapturePendingMutations(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        PublishPendingMutationsAsync(eventData.Context, CancellationToken.None).GetAwaiter().GetResult();
        return base.SavedChanges(eventData, result);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        await PublishPendingMutationsAsync(eventData.Context, cancellationToken);
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData)
    {
        ClearPendingMutations(eventData.Context);
        base.SaveChangesFailed(eventData);
    }

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        ClearPendingMutations(eventData.Context);
        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    private void CapturePendingMutations(DbContext? context)
    {
        if (!_auditIngestionService.IsEnabled || context == null)
        {
            return;
        }

        try
        {
            var pendingMutations = context.ChangeTracker
                .Entries()
                .Where(entry =>
                    entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted
                    && !entry.Metadata.IsOwned()
                    && !IsExcludedEntity(entry.Metadata))
                .Select(BuildPendingMutation)
                .ToList();

            _pendingByContextId[context.ContextId.InstanceId] = pendingMutations;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to capture pending EF mutations for audit.");
        }
    }

    private async Task PublishPendingMutationsAsync(DbContext? context, CancellationToken cancellationToken)
    {
        if (!_auditIngestionService.IsEnabled || context == null)
        {
            return;
        }

        if (!_pendingByContextId.TryGetValue(context.ContextId.InstanceId, out var pendingMutations) || pendingMutations.Count == 0)
        {
            return;
        }

        _pendingByContextId.Remove(context.ContextId.InstanceId);

        var httpContext = _httpContextAccessor.HttpContext;
        var traceId = Activity.Current?.TraceId.ToString() ?? string.Empty;
        var operationId = Activity.Current?.RootId ?? string.Empty;
        var requestId = httpContext?.TraceIdentifier ?? string.Empty;
        var actorId = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var actorEmail = httpContext?.User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        var actorDisplay = !string.IsNullOrWhiteSpace(actorEmail) ? actorEmail : actorId;

        foreach (var mutation in pendingMutations)
        {
            var eventPayload = new MutationAuditEvent
            {
                Environment = _options.Value.Environment,
                ServiceName = _options.Value.ServiceName,
                OccurredAtUtc = DateTime.UtcNow,
                TraceId = traceId,
                OperationId = operationId,
                RequestId = requestId,
                Module = mutation.Module,
                Action = mutation.Action,
                Entity = mutation.Entity,
                EntityKey = mutation.EntityKey,
                ChangedFields = mutation.ChangedFields,
                BeforeState = mutation.BeforeState,
                AfterState = mutation.AfterState,
                BusinessDetails = mutation.BusinessDetails,
                ActorType = string.IsNullOrWhiteSpace(actorId) ? "system" : "user",
                ActorId = actorId,
                ActorDisplay = actorDisplay,
                AccountId = mutation.AccountId,
                BrandId = ParseRouteInt(httpContext, "brandId"),
                CompanyId = ParseRouteInt(httpContext, "companyId"),
                ShopId = mutation.ShopId
            };

            await _auditIngestionService.PublishMutationAuditAsync(eventPayload, cancellationToken);
        }
    }

    private void ClearPendingMutations(DbContext? context)
    {
        if (context == null)
        {
            return;
        }

        _pendingByContextId.Remove(context.ContextId.InstanceId);
    }

    private static int? ParseRouteInt(HttpContext? context, string key)
    {
        if (context == null)
        {
            return null;
        }

        if (!context.Request.RouteValues.TryGetValue(key, out var raw) || raw == null)
        {
            return null;
        }

        return int.TryParse(raw.ToString(), out var parsed) ? parsed : null;
    }

    private static bool IsExcludedEntity(IReadOnlyEntityType entityType)
    {
        var name = entityType.ClrType.Name;
        return name is "AuditTrailLog" or "AccessAuditLog";
    }

    private static PendingMutation BuildPendingMutation(EntityEntry entry)
    {
        var entityType = entry.Metadata.ClrType;
        var entityName = entityType.Name;
        var tableName = entry.Metadata.GetTableName() ?? entityName;
        var action = entry.State switch
        {
            EntityState.Added => "create",
            EntityState.Modified => "update",
            EntityState.Deleted => "delete",
            _ => "unknown"
        };

        var changedProperties = entry.State == EntityState.Modified
            ? entry.Properties.Where(p => p.IsModified).ToList()
            : entry.Properties.ToList();

        var changedFieldNames = changedProperties
            .Select(p => p.Metadata.Name)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var beforeState = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        var afterState = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var property in changedProperties)
        {
            var propertyName = property.Metadata.Name;
            var originalValue = property.OriginalValue;
            var currentValue = property.CurrentValue;

            if (entry.State == EntityState.Added)
            {
                afterState[propertyName] = Sanitize(propertyName, currentValue);
                continue;
            }

            if (entry.State == EntityState.Deleted)
            {
                beforeState[propertyName] = Sanitize(propertyName, originalValue);
                continue;
            }

            beforeState[propertyName] = Sanitize(propertyName, originalValue);
            afterState[propertyName] = Sanitize(propertyName, currentValue);
        }

        var keyValues = entry.Properties
            .Where(p => p.Metadata.IsPrimaryKey())
            .ToDictionary(
                p => p.Metadata.Name,
                p => entry.State == EntityState.Added ? p.CurrentValue : p.OriginalValue,
                StringComparer.OrdinalIgnoreCase);

        var entityKey = string.Join(
            "|",
            keyValues.Select(kv => $"{kv.Key}:{FormatValue(kv.Value)}"));

        var businessDetails = new Dictionary<string, object?>
        {
            ["table"] = tableName,
            ["dbContext"] = entry.Context.GetType().Name
        };

        var accountId = TryGetIntProperty(entry, "AccountId");
        var shopId = TryGetIntProperty(entry, "ShopId");

        if (accountId.HasValue)
        {
            businessDetails["accountId"] = accountId.Value;
        }

        if (shopId.HasValue)
        {
            businessDetails["shopId"] = shopId.Value;
        }

        return new PendingMutation
        {
            Module = ResolveModule(tableName),
            Action = action,
            Entity = entityName,
            EntityKey = entityKey,
            ChangedFields = changedFieldNames,
            BeforeState = beforeState,
            AfterState = afterState,
            BusinessDetails = businessDetails,
            AccountId = accountId,
            ShopId = shopId
        };
    }

    private static string ResolveModule(string tableName)
    {
        var normalized = tableName.ToUpperInvariant();
        if (normalized.Contains("TABLE"))
        {
            return "table_settings";
        }

        if (normalized.Contains("PRINTER")
            || normalized.Contains("TERMINAL")
            || normalized.Contains("DRAWER")
            || normalized.Contains("DEVICE"))
        {
            return "device_settings";
        }

        if (normalized.Contains("SHOP")
            || normalized.Contains("WORKDAY")
            || normalized.Contains("PARAMETER")
            || normalized.Contains("SERVICEAREA"))
        {
            return "store_settings";
        }

        return "database_mutation";
    }

    private static int? TryGetIntProperty(EntityEntry entry, string propertyName)
    {
        var property = entry.Properties.FirstOrDefault(p =>
            string.Equals(p.Metadata.Name, propertyName, StringComparison.OrdinalIgnoreCase));

        if (property == null)
        {
            return null;
        }

        var value = entry.State == EntityState.Added ? property.CurrentValue : property.OriginalValue;
        return value switch
        {
            int intValue => intValue,
            long longValue => (int)longValue,
            short shortValue => shortValue,
            string stringValue when int.TryParse(stringValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) => parsed,
            _ => null
        };
    }

    private static object? Sanitize(string propertyName, object? value)
    {
        if (value == null)
        {
            return null;
        }

        var property = propertyName.ToUpperInvariant();
        if (property.Contains("PASSWORD")
            || property.Contains("SECRET")
            || property.Contains("TOKEN")
            || property.Contains("AUTHORIZATION")
            || property.Contains("COOKIE"))
        {
            return "[REDACTED]";
        }

        return value switch
        {
            string str => Clip(str, 500),
            _ => value
        };
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

    private static string FormatValue(object? value)
    {
        if (value == null)
        {
            return string.Empty;
        }

        return value switch
        {
            DateTime dateTime => dateTime.ToString("O", CultureInfo.InvariantCulture),
            _ => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty
        };
    }

    private class PendingMutation
    {
        public string Module { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string Entity { get; set; } = string.Empty;
        public string EntityKey { get; set; } = string.Empty;
        public IReadOnlyList<string> ChangedFields { get; set; } = Array.Empty<string>();
        public IReadOnlyDictionary<string, object?> BeforeState { get; set; } = new Dictionary<string, object?>();
        public IReadOnlyDictionary<string, object?> AfterState { get; set; } = new Dictionary<string, object?>();
        public IReadOnlyDictionary<string, object?> BusinessDetails { get; set; } = new Dictionary<string, object?>();
        public int? AccountId { get; set; }
        public int? ShopId { get; set; }
    }
}
