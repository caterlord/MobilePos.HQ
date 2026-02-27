# Azure Log Analytics Audit Progress

## Status Legend
- `todo`
- `in_progress`
- `blocked`
- `done`

## Work Package Tracker
| WP | Title | Status | Owner | Updated | Notes |
|---|---|---|---|---|---|
| ALA-001 | Audit Contract Freeze | done | codex | 2026-02-27 | Added `AZURE_LOG_ANALYTICS_AUDIT_CONTRACT.md` with request/mutation schema, correlation keys, masking rules, and payload examples |
| ALA-002 | Azure Foundation | in_progress | codex | 2026-02-27 | Added Azure ingestion dependencies and environment contract in `.env.example` + docs; runtime workspace/DCR provisioning pending Azure-side execution |
| ALA-003 | Request Audit Instrumentation | in_progress | codex | 2026-02-27 | Added `RequestAuditMiddleware` + optional Azure Monitor OTel export; captures method/route/status/duration/trace/user/tenant context for all API requests |
| ALA-004 | Mutation Audit Publisher | in_progress | codex | 2026-02-27 | Added `AuditSaveChangesInterceptor` and `IAuditIngestionService` pipeline; mutation events now emitted for EF writes across main/admin/legacy contexts |
| ALA-005 | Outbox + Dispatcher | todo | unassigned | - | Not started; current ingestion path is direct publish with non-blocking failure handling |
| ALA-006 | Security and Retention Controls | todo | unassigned | - | - |
| ALA-007 | Dashboard and Alerts | todo | unassigned | - | - |
| ALA-008 | Cutover and DB Audit Decommission | in_progress | codex | 2026-02-27 | Disabled DB-backed settings/access audit persistence; APIs currently return empty history until Azure-backed query/read model is implemented |

## Update Log
| Date | Update |
|---|---|
| 2026-02-27 | Initialized Azure Log Analytics audit plan tracking. |
| 2026-02-27 | Completed ALA-001 contract freeze with versioned schema, required fields, masking policy, and correlation model. |
| 2026-02-27 | Implemented Azure audit ingestion foundation in `EWHQ.Api` (config contract, ingestion client, request middleware, EF mutation interceptor, and legacy POS context coverage). |
| 2026-02-27 | Switched HQ settings/access audit persistence to Azure-first mode by disabling DB audit-table writes and retaining structured fallback logs when Azure ingestion is off. |
