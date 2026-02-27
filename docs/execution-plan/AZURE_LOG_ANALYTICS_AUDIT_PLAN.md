# Azure Log Analytics Audit Plan

## Goal
Move HQ audit from database table storage to Azure Log Analytics, covering:
- Every API request
- Every settings/business data mutation

This plan is AI-agent-friendly and executable in independent work packages.

## Scope
- In scope:
  - `backend/EWHQ.Api` request-level audit telemetry
  - mutation audit event pipeline (structured, searchable)
  - Azure Log Analytics ingestion, dashboards, alerts
- Out of scope:
  - Frontend-only clickstream analytics
  - historical backfill from legacy DB audit tables

## Architecture
1. Request Audit Stream
- Capture all API requests through OpenTelemetry + Azure Monitor exporter.
- Required fields: method, route, status, duration, traceId, userId, brandId, shopId.

2. Mutation Audit Stream
- Emit structured mutation events from API business write paths.
- Use outbox pattern to avoid data loss when Azure is temporarily unavailable.
- Ingest into custom table: `HqDataMutationAudit_CL`.

3. Correlation
- All mutation events must carry request correlation IDs (`traceId`, `operationId`).
- KQL must support pivot from request to mutation and vice versa.

## Work Packages

### ALA-001 Audit Contract Freeze
- Status: `done`
- Deliverables:
  - canonical field schema for request + mutation audits
  - masking policy for sensitive fields
- Exit criteria:
  - schema approved and versioned in docs

### ALA-002 Azure Foundation
- Status: `todo`
- Deliverables:
  - Log Analytics workspace confirmed
  - DCR + (if needed) DCE created
  - custom table `HqDataMutationAudit_CL` created
  - RBAC assigned for ingestion identity
- Exit criteria:
  - test ingestion from local script succeeds

### ALA-003 Request Audit Instrumentation
- Status: `todo`
- Deliverables:
  - OpenTelemetry pipeline enabled in `EWHQ.Api`
  - tenant/user enrichment middleware
  - sampling policy set for audit scope (target 100% for API requests)
- Exit criteria:
  - requests visible in Log Analytics with correlation fields

### ALA-004 Mutation Audit Publisher
- Status: `todo`
- Deliverables:
  - unified mutation event publisher abstraction
  - settings/menu/org write flows emitting normalized events
- Exit criteria:
  - all selected write endpoints emit mutation events

### ALA-005 Outbox + Dispatcher
- Status: `todo`
- Deliverables:
  - mutation outbox storage
  - background dispatcher to Azure ingestion endpoint
  - retry, dead-letter, backoff
- Exit criteria:
  - ingestion failures do not fail API writes; backlog drains automatically

### ALA-006 Security and Retention Controls
- Status: `todo`
- Deliverables:
  - central masking/sanitization rules
  - table retention and cost policy
  - query RBAC + operational access rules
- Exit criteria:
  - security review checklist passed

### ALA-007 Dashboard and Alerts
- Status: `todo`
- Deliverables:
  - workbook/dashboard for request and mutation audit
  - alert rules:
    - ingestion failures
    - outbox backlog age/size
    - audit silence (no events)
- Exit criteria:
  - alerts tested in non-prod

### ALA-008 Cutover and DB Audit Decommission
- Status: `todo`
- Deliverables:
  - dual-run evidence (Azure + legacy path if temporarily enabled)
  - parity report by endpoint/action volume
  - final switch-off checklist
- Exit criteria:
  - Azure-only audit mode active and validated

## Implementation Notes (Current Repo State)
- Current DB-backed settings audit writes have been disabled.
- Current `GET /api/store-settings/brand/{brandId}/audit-logs` may return empty until Azure-backed read path is implemented.
- Mutation details are currently emitted as structured application logs as transitional behavior.

## Validation Checklist
- [ ] API request telemetry visible with user + tenant context
- [ ] mutation events visible in `HqDataMutationAudit_CL`
- [ ] request and mutation logs are correlated by trace IDs
- [ ] temporary Azure ingestion outage does not drop mutation events
- [ ] dashboards and alerts operational
