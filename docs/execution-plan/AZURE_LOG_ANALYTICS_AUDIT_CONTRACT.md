# Azure Audit Contract (ALA-001)

## Document Control
- Contract version: `v1.0`
- Date: `2026-02-27`
- Scope: `EWHQ.Api` request + mutation audit events
- Status: `active`

## Objectives
- Define a stable, versioned audit schema for Azure Log Analytics.
- Ensure request-level and mutation-level audits can be correlated.
- Enforce consistent sensitive-data masking rules.

## Event Types
1. `request_audit`
- One event per API request.
- Sink: Azure Monitor request telemetry (`AppRequests` + dimensions).

2. `mutation_audit`
- One event per successful business write mutation.
- Sink: custom table `HqDataMutationAudit_CL`.

## Correlation Keys (Required)
- `trace_id`: W3C trace id from OpenTelemetry.
- `operation_id`: request operation id (same request context).
- `request_id`: ASP.NET request identifier.
- `event_id`: unique id for mutation event (GUID/ULID).

## Common Fields (Both Event Types)
| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | string | yes | Start with `1.0` |
| `environment` | string | yes | `dev`/`staging`/`prod` |
| `service_name` | string | yes | `ewhq-api` |
| `occurred_at_utc` | datetime | yes | ISO 8601 UTC |
| `trace_id` | string | yes | 32-hex trace id |
| `operation_id` | string | yes | correlation operation |
| `request_id` | string | yes | HTTP request id |
| `external_user_id` | string | no | if authenticated |
| `user_email_hash` | string | no | SHA-256 lowercase email |
| `brand_id` | int | no | app brand context |
| `company_id` | int | no | if available |
| `shop_id` | int | no | if scoped |

## Request Audit Schema (`request_audit`)
| Field | Type | Required | Notes |
|---|---|---|---|
| `event_type` | string | yes | `request_audit` |
| `http_method` | string | yes | `GET`/`POST`... |
| `route_template` | string | yes | normalized route |
| `request_path` | string | yes | raw path without query masking leaks |
| `status_code` | int | yes | HTTP status |
| `duration_ms` | double | yes | request latency |
| `client_ip_masked` | string | no | masked/anonymized |
| `user_agent` | string | no | clipped max length |
| `is_authenticated` | bool | yes | auth check result |
| `failure_category` | string | no | validation/authz/exception |

## Mutation Audit Schema (`mutation_audit`)
Target table: `HqDataMutationAudit_CL`

| Field | Type | Required | Notes |
|---|---|---|---|
| `event_type` | string | yes | `mutation_audit` |
| `event_id` | string | yes | unique event key |
| `module` | string | yes | `store_settings`/`device_settings`/`table_settings`... |
| `action` | string | yes | `create`/`update`/`delete`/`replace` |
| `entity` | string | yes | e.g. `ShopSystemParameter` |
| `entity_key` | string | yes | compact business key |
| `result` | string | yes | `success` |
| `changed_fields` | dynamic(json) | yes | list of field names |
| `before_state` | dynamic(json) | no | masked snapshot |
| `after_state` | dynamic(json) | no | masked snapshot |
| `business_details` | dynamic(json) | no | contextual data |
| `actor_type` | string | yes | `user`/`system` |
| `actor_id` | string | no | user id |
| `actor_display` | string | no | display name/email masked |

## Data Masking Policy (Mandatory)
- Never log raw secrets/tokens/passwords/credentials.
- Never log full PII values in clear text unless explicitly approved.
- Apply field-level transforms:
  - `email` -> `user_email_hash`
  - `phone` -> masked (`***` + last 2)
  - `address` -> redact full text unless required for legal auditing
  - `token`, `secret`, `password`, `authorization`, `cookie` -> drop
- Query strings and headers must pass denylist sanitization.

## Logging Rules
- Emit `mutation_audit` only after a successful write commit.
- Emit exactly one mutation event per logical write operation.
- Batch/replace operations may emit:
  - one aggregate event (preferred first iteration), or
  - one per item (future refinement)
- If sink unavailable, queue in outbox and retry asynchronously.

## Example Payloads

### request_audit
```json
{
  "schema_version": "1.0",
  "event_type": "request_audit",
  "environment": "prod",
  "service_name": "ewhq-api",
  "occurred_at_utc": "2026-02-27T09:10:11Z",
  "trace_id": "f8b9d1e18f1941ec9d4c1fbeab2276d2",
  "operation_id": "8d4f2f4c9e9f4c0b",
  "request_id": "0HNABC123XYZ:00000001",
  "http_method": "PUT",
  "route_template": "/api/store-settings/brand/{brandId}/shops/{shopId}/info",
  "request_path": "/api/store-settings/brand/1/shops/101/info",
  "status_code": 200,
  "duration_ms": 86.3,
  "is_authenticated": true,
  "external_user_id": "user_12345",
  "brand_id": 1,
  "shop_id": 101
}
```

### mutation_audit
```json
{
  "schema_version": "1.0",
  "event_type": "mutation_audit",
  "event_id": "01JXYZABCDEF0123456789",
  "environment": "prod",
  "service_name": "ewhq-api",
  "occurred_at_utc": "2026-02-27T09:10:11Z",
  "trace_id": "f8b9d1e18f1941ec9d4c1fbeab2276d2",
  "operation_id": "8d4f2f4c9e9f4c0b",
  "request_id": "0HNABC123XYZ:00000001",
  "module": "store_settings",
  "action": "update",
  "entity": "Shop",
  "entity_key": "account:12466|shop:101",
  "result": "success",
  "changed_fields": ["name", "currencyCode", "currencySymbol"],
  "before_state": {
    "name": "Old Name"
  },
  "after_state": {
    "name": "New Name"
  },
  "actor_type": "user",
  "actor_id": "google-oauth2|12345",
  "brand_id": 1,
  "shop_id": 101
}
```

## Acceptance Criteria for ALA-001
- Contract is versioned and committed in docs.
- Required fields are unambiguous and implementable in backend.
- Masking rules explicitly documented.
- Correlation requirements documented for KQL joins.

## Next Step
- Proceed to `ALA-002` (workspace/table/DCR foundation) using this contract as source of truth.
