using System.Collections.Generic;

namespace EWHQ.Api.Auditing;

public class RequestAuditEvent
{
    public string SchemaVersion { get; set; } = "1.0";
    public string EventType { get; set; } = "request_audit";
    public string Environment { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
    public string TraceId { get; set; } = string.Empty;
    public string OperationId { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    public string ExternalUserId { get; set; } = string.Empty;
    public string UserEmailHash { get; set; } = string.Empty;
    public int? BrandId { get; set; }
    public int? CompanyId { get; set; }
    public int? ShopId { get; set; }
    public string HttpMethod { get; set; } = string.Empty;
    public string RouteTemplate { get; set; } = string.Empty;
    public string RequestPath { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public double DurationMs { get; set; }
    public string ClientIpMasked { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public bool IsAuthenticated { get; set; }
    public string FailureCategory { get; set; } = string.Empty;
}

public class MutationAuditEvent
{
    public string SchemaVersion { get; set; } = "1.0";
    public string EventType { get; set; } = "mutation_audit";
    public string EventId { get; set; } = Guid.NewGuid().ToString("N");
    public string Environment { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
    public string TraceId { get; set; } = string.Empty;
    public string OperationId { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string EntityKey { get; set; } = string.Empty;
    public string Result { get; set; } = "success";
    public IReadOnlyList<string> ChangedFields { get; set; } = Array.Empty<string>();
    public IReadOnlyDictionary<string, object?> BeforeState { get; set; } = new Dictionary<string, object?>();
    public IReadOnlyDictionary<string, object?> AfterState { get; set; } = new Dictionary<string, object?>();
    public IReadOnlyDictionary<string, object?> BusinessDetails { get; set; } = new Dictionary<string, object?>();
    public string ActorType { get; set; } = "system";
    public string ActorId { get; set; } = string.Empty;
    public string ActorDisplay { get; set; } = string.Empty;
    public int? AccountId { get; set; }
    public int? BrandId { get; set; }
    public int? CompanyId { get; set; }
    public int? ShopId { get; set; }
}
