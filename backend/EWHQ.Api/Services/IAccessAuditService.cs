using EWHQ.Api.Models.AdminPortal;

namespace EWHQ.Api.Services;

public interface IAccessAuditService
{
    Task LogAsync(AccessAuditLog entry);
    Task<IReadOnlyList<AccessAuditLog>> GetTeamLogsAsync(string teamId, int limit = 50);
}
