# Azure Log Analytics Audit Setup Guide

Last updated: 2026-02-27
Owner: backend platform
Applies to: `backend/EWHQ.Api`

## Purpose
This guide is for teammates who need to provision Azure-side resources for HQ audit ingestion and fill the backend `.env` values.

The API already emits:
- request audit events
- mutation audit events

and sends them through Azure Logs Ingestion API when configured.

## Prerequisites
- Azure subscription access (Contributor or equivalent for monitoring resources)
- Permission to create App Registrations (or use an existing managed identity)
- Access to the target Log Analytics Workspace

## Step 1: Create/Confirm Log Analytics Workspace
1. In Azure Portal, create or select a Log Analytics Workspace for HQ audit data.
2. Keep region consistent with DCE/DCR resources.

## Step 2: Create Custom Tables
Create these custom tables in the workspace:
- `HqRequestAudit_CL`
- `HqDataMutationAudit_CL`

Use the audit contract as source of truth for column schema:
- [AZURE_LOG_ANALYTICS_AUDIT_CONTRACT.md](/Users/michaelyung/RiderProjects/ewhq-new/docs/execution-plan/AZURE_LOG_ANALYTICS_AUDIT_CONTRACT.md)

## Step 3: Create Data Collection Endpoint (DCE)
1. Create one DCE in the same region.
2. Copy its Logs Ingestion endpoint URL.
3. This value will be used for `AZURE_LOG_AUDIT_ENDPOINT`.

## Step 4: Create Data Collection Rule (DCR)
Create one DCR that includes:

1. Stream declarations (exact names):
- `Custom-HqRequestAudit`
- `Custom-HqDataMutationAudit`

2. Data flows:
- `Custom-HqRequestAudit` -> `HqRequestAudit_CL`
- `Custom-HqDataMutationAudit` -> `HqDataMutationAudit_CL`

3. Transform (minimum):
- Ensure `TimeGenerated` is populated from `OccurredAtUtc`
- Keep payload fields aligned with API event property names

Recommended minimal transform KQL:

```kusto
source
| extend TimeGenerated = todatetime(OccurredAtUtc)
```

After creation, copy the DCR immutable ID (`dcr-...`).
This value will be used for `AZURE_LOG_AUDIT_DCR_IMMUTABLE_ID`.

## Step 5: Configure Ingestion Identity
Use one of these:
- App Registration + client secret (current recommended for explicit server config)
- Managed Identity (if API host supports it and identity is attached)

If using App Registration:
1. Create app registration.
2. Create client secret.
3. Record:
- Tenant ID
- Client ID
- Client Secret

## Step 6: Assign RBAC on DCR
Grant the ingestion identity this role on the DCR scope:
- `Monitoring Metrics Publisher`

Reference: Azure Logs Ingestion tutorial role requirement.

## Step 7: Fill Backend Environment Variables
File:
- [backend/EWHQ.Api/.env](/Users/michaelyung/RiderProjects/ewhq-new/backend/EWHQ.Api/.env)

Required values:

```env
AZURE_LOG_AUDIT_ENABLED=true
AZURE_LOG_AUDIT_ENDPOINT=https://<your-ingestion-endpoint>.ingest.monitor.azure.com
AZURE_LOG_AUDIT_DCR_IMMUTABLE_ID=dcr-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_LOG_AUDIT_REQUEST_STREAM=Custom-HqRequestAudit
AZURE_LOG_AUDIT_MUTATION_STREAM=Custom-HqDataMutationAudit
AZURE_LOG_AUDIT_TENANT_ID=<tenant-guid>
AZURE_LOG_AUDIT_CLIENT_ID=<client-id-guid>
AZURE_LOG_AUDIT_CLIENT_SECRET=<client-secret>
```

Optional (Azure Monitor OpenTelemetry export):

```env
APPLICATIONINSIGHTS_CONNECTION_STRING=
AZURE_MONITOR_SAMPLING_RATIO=1.0
AZURE_MONITOR_ENABLE_LIVE_METRICS=false
```

## Step 8: Restart and Validate
1. Restart API:
```bash
dotnet run --project backend/EWHQ.Api
```
2. Trigger a few API reads/writes from UI.
3. Query logs:

```kusto
HqRequestAudit_CL
| order by TimeGenerated desc
| take 50
```

```kusto
HqDataMutationAudit_CL
| order by TimeGenerated desc
| take 50
```

Optional correlation query:

```kusto
let req = HqRequestAudit_CL | project ReqTime=TimeGenerated, TraceId, RequestPath, StatusCode;
let mut = HqDataMutationAudit_CL | project MutTime=TimeGenerated, TraceId, Module, Action, Entity;
req
| join kind=inner mut on TraceId
| order by ReqTime desc
| take 100
```

## Troubleshooting
- 403/Authorization errors:
  - Check RBAC role assignment on DCR for the configured identity.
- 400 ingestion errors:
  - Check DCR stream names match `.env` exactly.
  - Check stream schema/transform matches payload property names.
- No data in tables:
  - Confirm `AZURE_LOG_AUDIT_ENABLED=true`.
  - Confirm endpoint and DCR immutable ID are correct.
  - Check API logs for `Failed to publish ... audit event`.

## Notes
- DB-backed HQ settings/access audit writes are intentionally disabled for Azure-first mode.
- Existing read endpoints for historical audit may return empty until Azure-backed read APIs are implemented.

## References
- Azure Logs Ingestion API overview:
  - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-ingestion-api-overview
- Azure Logs Ingestion tutorial (RBAC + DCR/DCE setup):
  - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/tutorial-logs-ingestion-portal
