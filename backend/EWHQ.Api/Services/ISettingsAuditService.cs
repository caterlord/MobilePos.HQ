using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EWHQ.Api.Data;
using EWHQ.Api.Models.Entities;

namespace EWHQ.Api.Services;

public class SettingsAuditMutation
{
    public int AccountId { get; set; }
    public int ShopId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string ActionRefId { get; set; } = string.Empty;
    public string ActionRefDescription { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string Actor { get; set; } = "System";
}

public interface ISettingsAuditService
{
    Task LogMutationAsync(
        EWHQDbContext context,
        SettingsAuditMutation mutation,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditTrailLog>> GetRecentMutationsAsync(
        EWHQDbContext context,
        int accountId,
        int? shopId,
        int limit,
        CancellationToken cancellationToken = default);
}
