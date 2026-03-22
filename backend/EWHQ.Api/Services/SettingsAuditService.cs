using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EWHQ.Api.Data;
using EWHQ.Api.Models.Entities;
using Microsoft.Extensions.Logging;

namespace EWHQ.Api.Services;

public class SettingsAuditService : ISettingsAuditService
{
    private readonly ILogger<SettingsAuditService> _logger;

    public SettingsAuditService(ILogger<SettingsAuditService> logger)
    {
        _logger = logger;
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

    public async Task LogMutationAsync(
        EWHQDbContext context,
        SettingsAuditMutation mutation,
        CancellationToken cancellationToken = default)
    {
        _ = context;
        _ = cancellationToken;

        if (mutation.AccountId <= 0 || mutation.ShopId <= 0)
        {
            return;
        }

        var category = Clip(mutation.Category, 50).ToUpperInvariant();
        var actionType = Clip(mutation.ActionType, 120).ToUpperInvariant();
        var actor = Clip(mutation.Actor, 200);

        if (string.IsNullOrWhiteSpace(actor))
        {
            actor = "System";
        }

        _logger.LogInformation(
            "HQSettingsAudit category={Category} action={ActionType} accountId={AccountId} shopId={ShopId} actionRefId={ActionRefId} actionRefDescription={ActionRefDescription} actor={Actor} details={Details}",
            category,
            actionType,
            mutation.AccountId,
            mutation.ShopId,
            Clip(mutation.ActionRefId, 50),
            Clip(mutation.ActionRefDescription, 200),
            actor,
            Clip(mutation.Details, 2000));

        await Task.CompletedTask;
    }

    public async Task<IReadOnlyList<AuditTrailLog>> GetRecentMutationsAsync(
        EWHQDbContext context,
        int accountId,
        int? shopId,
        int limit,
        CancellationToken cancellationToken = default)
    {
        _ = context;
        _ = accountId;
        _ = shopId;
        _ = limit;
        _ = cancellationToken;

        // Database-backed settings audit has been intentionally disabled.
        // Azure Log Analytics is the target sink for this audit stream.
        await Task.CompletedTask;
        return Array.Empty<AuditTrailLog>();
    }
}
