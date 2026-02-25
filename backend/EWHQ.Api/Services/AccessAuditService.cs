using EWHQ.Api.Data;
using EWHQ.Api.Models.AdminPortal;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Services;

public class AccessAuditService : IAccessAuditService
{
    private readonly AdminDbContext _context;

    public AccessAuditService(AdminDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(AccessAuditLog entry)
    {
        entry.Id = string.IsNullOrWhiteSpace(entry.Id) ? Guid.NewGuid().ToString() : entry.Id;
        entry.CreatedAt = entry.CreatedAt == default ? DateTime.UtcNow : entry.CreatedAt;
        _context.AccessAuditLogs.Add(entry);
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<AccessAuditLog>> GetTeamLogsAsync(string teamId, int limit = 50)
    {
        var safeLimit = Math.Clamp(limit, 1, 200);
        return await _context.AccessAuditLogs
            .Where(log => log.TeamId == teamId)
            .OrderByDescending(log => log.CreatedAt)
            .Take(safeLimit)
            .ToListAsync();
    }
}
