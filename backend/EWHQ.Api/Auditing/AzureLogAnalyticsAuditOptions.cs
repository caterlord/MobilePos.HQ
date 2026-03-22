namespace EWHQ.Api.Auditing;

public class AzureLogAnalyticsAuditOptions
{
    public bool Enabled { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string DataCollectionRuleImmutableId { get; set; } = string.Empty;
    public string RequestStreamName { get; set; } = "Custom-HqRequestAudit";
    public string MutationStreamName { get; set; } = "Custom-HqDataMutationAudit";
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string Environment { get; set; } = "development";
    public string ServiceName { get; set; } = "ewhq-api";
}
