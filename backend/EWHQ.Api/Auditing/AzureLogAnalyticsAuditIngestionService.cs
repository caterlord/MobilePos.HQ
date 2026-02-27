using Azure.Core;
using Azure.Identity;
using Azure.Monitor.Ingestion;
using Microsoft.Extensions.Options;

namespace EWHQ.Api.Auditing;

public class AzureLogAnalyticsAuditIngestionService : IAuditIngestionService
{
    private readonly AzureLogAnalyticsAuditOptions _options;
    private readonly LogsIngestionClient? _logsClient;
    private readonly ILogger<AzureLogAnalyticsAuditIngestionService> _logger;

    public AzureLogAnalyticsAuditIngestionService(
        IOptions<AzureLogAnalyticsAuditOptions> options,
        ILogger<AzureLogAnalyticsAuditIngestionService> logger)
    {
        _options = options.Value;
        _logger = logger;
        Uri? endpointUri = null;

        IsEnabled = _options.Enabled
            && Uri.TryCreate(_options.Endpoint, UriKind.Absolute, out endpointUri)
            && !string.IsNullOrWhiteSpace(_options.DataCollectionRuleImmutableId)
            && !string.IsNullOrWhiteSpace(_options.RequestStreamName)
            && !string.IsNullOrWhiteSpace(_options.MutationStreamName);

        if (!IsEnabled || endpointUri == null)
        {
            _logger.LogInformation("Azure Log Analytics audit ingestion disabled (missing config or explicitly disabled).");
            return;
        }

        var credential = BuildCredential();
        _logsClient = new LogsIngestionClient(endpointUri, credential);

        _logger.LogInformation(
            "Azure Log Analytics audit ingestion enabled. Endpoint={Endpoint}, DcrImmutableId={DcrImmutableId}, RequestStream={RequestStream}, MutationStream={MutationStream}",
            _options.Endpoint,
            _options.DataCollectionRuleImmutableId,
            _options.RequestStreamName,
            _options.MutationStreamName);
    }

    public bool IsEnabled { get; }

    public async Task PublishRequestAuditAsync(RequestAuditEvent auditEvent, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _logsClient == null)
        {
            return;
        }

        try
        {
            var payload = BinaryData.FromObjectAsJson(auditEvent);
            await _logsClient.UploadAsync(
                _options.DataCollectionRuleImmutableId,
                _options.RequestStreamName,
                new[] { payload },
                options: null,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish request audit event to Azure Log Analytics.");
        }
    }

    public async Task PublishMutationAuditAsync(MutationAuditEvent auditEvent, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _logsClient == null)
        {
            return;
        }

        try
        {
            var payload = BinaryData.FromObjectAsJson(auditEvent);
            await _logsClient.UploadAsync(
                _options.DataCollectionRuleImmutableId,
                _options.MutationStreamName,
                new[] { payload },
                options: null,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish mutation audit event to Azure Log Analytics.");
        }
    }

    private TokenCredential BuildCredential()
    {
        if (!string.IsNullOrWhiteSpace(_options.TenantId)
            && !string.IsNullOrWhiteSpace(_options.ClientId)
            && !string.IsNullOrWhiteSpace(_options.ClientSecret))
        {
            return new ClientSecretCredential(_options.TenantId, _options.ClientId, _options.ClientSecret);
        }

        return new DefaultAzureCredential();
    }
}
