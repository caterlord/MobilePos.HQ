using EWHQ.Api.Data;
using EWHQ.Api.Auditing;
using EWHQ.Api.Models.AdminPortal;
using Microsoft.EntityFrameworkCore;

namespace EWHQ.Api.Services;

public interface IPOSDbContextService
{
    Task<EWHQDbContext> GetContextForBrandAsync(int brandId);
    Task<(EWHQDbContext context, int accountId)> GetContextAndAccountIdForBrandAsync(int brandId);
}

public class POSDbContextService : IPOSDbContextService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly AdminPortalDbContext _adminContext;
    private readonly IConfiguration _configuration;
    private readonly AuditSaveChangesInterceptor _auditSaveChangesInterceptor;
    private readonly ILogger<POSDbContextService> _logger;

    public POSDbContextService(
        IServiceProvider serviceProvider,
        AdminPortalDbContext adminContext,
        IConfiguration configuration,
        AuditSaveChangesInterceptor auditSaveChangesInterceptor,
        ILogger<POSDbContextService> logger)
    {
        _serviceProvider = serviceProvider;
        _adminContext = adminContext;
        _configuration = configuration;
        _auditSaveChangesInterceptor = auditSaveChangesInterceptor;
        _logger = logger;
    }

    public async Task<EWHQDbContext> GetContextForBrandAsync(int brandId)
    {
        var (context, _) = await GetContextAndAccountIdForBrandAsync(brandId);
        return context;
    }

    public async Task<(EWHQDbContext context, int accountId)> GetContextAndAccountIdForBrandAsync(int brandId)
    {
        // Get brand information
        var brand = await _adminContext.Brands
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == brandId && b.IsActive);

        if (brand == null)
        {
            throw new InvalidOperationException($"Brand with ID {brandId} not found or is inactive");
        }

        // If brand uses legacy POS and has a legacy account ID, create context with legacy connection
        if (brand.UseLegacyPOS && brand.LegacyAccountId.HasValue)
        {
            var legacyContext = CreateLegacyPOSContext();
            return (legacyContext, brand.LegacyAccountId.Value);
        }

        // Otherwise use the default EWHQ context
        var defaultContext = _serviceProvider.GetRequiredService<EWHQDbContext>();
        return (defaultContext, brandId);
    }

    private EWHQDbContext CreateLegacyPOSContext()
    {
        var legacyDbProviderString = Environment.GetEnvironmentVariable("LEGACY_DB_PROVIDER") ?? "SqlServer";

        if (!Enum.TryParse<DatabaseProvider>(legacyDbProviderString, out var legacyDbProvider))
        {
            throw new InvalidOperationException($"Invalid legacy database provider: {legacyDbProviderString}");
        }

        IDatabaseConfiguration legacyDbConfig;

        if (legacyDbProvider == DatabaseProvider.SqlServer)
        {
            var legacyDbParams = new Dictionary<string, string>
            {
                ["Server"] = Environment.GetEnvironmentVariable("LEGACY_DB_SERVER")
                    ?? throw new InvalidOperationException("LEGACY_DB_SERVER not configured"),
                ["Database"] = Environment.GetEnvironmentVariable("LEGACY_DB_NAME")
                    ?? throw new InvalidOperationException("LEGACY_DB_NAME not configured"),
                ["UserId"] = Environment.GetEnvironmentVariable("LEGACY_DB_USER")
                    ?? throw new InvalidOperationException("LEGACY_DB_USER not configured"),
                ["Password"] = Environment.GetEnvironmentVariable("LEGACY_DB_PASSWORD")
                    ?? throw new InvalidOperationException("LEGACY_DB_PASSWORD not configured"),
                ["ConnectionTimeout"] = "30",
                ["MaxPoolSize"] = "100",
                ["MinPoolSize"] = "5"
            };

            legacyDbConfig = DatabaseConfigurationFactory.Create(DatabaseProvider.SqlServer, legacyDbParams);
        }
        else // PostgreSQL
        {
            var legacyDbParams = new Dictionary<string, string>
            {
                ["Host"] = Environment.GetEnvironmentVariable("LEGACY_DB_HOST")
                    ?? throw new InvalidOperationException("LEGACY_DB_HOST not configured"),
                ["Database"] = Environment.GetEnvironmentVariable("LEGACY_DB_NAME")
                    ?? throw new InvalidOperationException("LEGACY_DB_NAME not configured"),
                ["Username"] = Environment.GetEnvironmentVariable("LEGACY_DB_USER")
                    ?? throw new InvalidOperationException("LEGACY_DB_USER not configured"),
                ["Password"] = Environment.GetEnvironmentVariable("LEGACY_DB_PASSWORD")
                    ?? throw new InvalidOperationException("LEGACY_DB_PASSWORD not configured"),
                ["Port"] = Environment.GetEnvironmentVariable("LEGACY_DB_PORT") ?? "5432",
                ["ConnectionTimeout"] = "30",
                ["MaxPoolSize"] = "100",
                ["MinPoolSize"] = "5",
                ["SslMode"] = Environment.GetEnvironmentVariable("LEGACY_DB_SSL_MODE") ?? "Require",
                ["ChannelBinding"] = Environment.GetEnvironmentVariable("LEGACY_DB_CHANNEL_BINDING") ?? "Prefer"
            };

            legacyDbConfig = DatabaseConfigurationFactory.Create(DatabaseProvider.PostgreSQL, legacyDbParams);
        }

        var connectionString = legacyDbConfig.BuildConnectionString();
        var optionsBuilder = new DbContextOptionsBuilder<EWHQDbContext>();
        legacyDbConfig.ConfigureDbContext(optionsBuilder, connectionString);
        optionsBuilder.AddInterceptors(_auditSaveChangesInterceptor);

        return new EWHQDbContext(optionsBuilder.Options);
    }
}
