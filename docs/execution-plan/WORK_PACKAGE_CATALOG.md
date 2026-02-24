# Work Package Catalog

Each work package is atomic and execution-ready.

## WP-001 Contract Alignment: Invitations
- Sprint: S01
- Priority: P0
- Depends on: none
- Scope: Align invitation route and payload contracts between frontend and backend.
- Deliverables: Fixed endpoint paths, request DTO mapping, response schema alignment.
- Verification: Onboarding join flow succeeds end-to-end.

## WP-002 Contract Alignment: Profile Security API
- Sprint: S01
- Priority: P0
- Depends on: none
- Scope: Resolve `/auth0/change-password` behavior mismatch.
- Deliverables: Implement endpoint or reroute frontend to Auth0-compliant flow.
- Verification: Password change UX no longer hits missing API.

## WP-003 Route Integrity Cleanup
- Sprint: S01
- Priority: P0
- Depends on: none
- Scope: Fix broken route references (`/dashboard`, missing sidebar pages).
- Deliverables: Valid route map, hidden/disabled unfinished links.
- Verification: No dead navigation path from main UI.

## WP-004 Legacy Auth Artifact Cleanup
- Sprint: S01
- Priority: P1
- Depends on: none
- Scope: Remove stale docs/scripts assuming `/api/auth/login` local auth.
- Deliverables: Updated scripts and docs for Auth0-only login.
- Verification: Scripts/docs match current backend endpoints.

## WP-005 API Contract Test Baseline
- Sprint: S01
- Priority: P1
- Depends on: WP-001, WP-002
- Scope: Add basic API contract checks for auth0/profile/invitation/tenant setup.
- Deliverables: Contract test suite or scripted checks in repo.
- Verification: CI/local contract checks pass.

## WP-006 Environment Template Standardization
- Sprint: S01
- Priority: P1
- Depends on: none
- Scope: Document required env vars for API + frontend.
- Deliverables: Checked-in `.env.example` equivalents.
- Verification: Fresh setup succeeds from docs only.

## WP-007 P0 Smoke Suite
- Sprint: S01
- Priority: P0
- Depends on: WP-001, WP-002, WP-003
- Scope: Add smoke test path for login -> onboarding -> brand load.
- Deliverables: Repeatable smoke script/playwright spec.
- Verification: Green run in local/staging.

## WP-008 Organization CRUD API Completion
- Sprint: S02
- Priority: P0
- Depends on: WP-007
- Scope: Ensure companies/brands/shops CRUD endpoints are complete and permission-checked.
- Deliverables: Backend API completeness for org management.
- Verification: CRUD calls pass role-based tests.

## WP-009 Organization Management UI Wiring
- Sprint: S02
- Priority: P0
- Depends on: WP-008
- Scope: Replace placeholder org page with real data + actions.
- Deliverables: Fully wired `OrganizationManagementPage`.
- Verification: User can create/edit company/brand/shop from UI.

## WP-010 Brand Session Consistency
- Sprint: S02
- Priority: P0
- Depends on: WP-008
- Scope: Stabilize selected brand behavior across reload/navigation.
- Deliverables: Deterministic brand context lifecycle.
- Verification: No cross-brand data bleed in API calls.

## WP-011 Org Validation and UX Hardening
- Sprint: S02
- Priority: P1
- Depends on: WP-009
- Scope: Input validation, error states, optimistic updates rollback.
- Deliverables: Production-safe org UX.
- Verification: Invalid data paths produce controlled feedback.

## WP-012 Org E2E Coverage
- Sprint: S02
- Priority: P1
- Depends on: WP-009, WP-011
- Scope: E2E tests for org create/edit/delete with role constraints.
- Deliverables: Automated org flow tests.
- Verification: Tests pass in CI.

## WP-013 Team List/Detail API + UI
- Sprint: S03
- Priority: P0
- Depends on: WP-012
- Scope: Teams list/detail/member pages end-to-end.
- Deliverables: Functional Teams module.
- Verification: Team leader/admin views behave correctly.

## WP-014 Invitation Lifecycle UX
- Sprint: S03
- Priority: P0
- Depends on: WP-013
- Scope: Invite/resend/cancel/pending states and join flow UX.
- Deliverables: Complete invitation UI lifecycle.
- Verification: Invitation lifecycle fully testable.

## WP-015 Email Verification Branch in Invitation Flow
- Sprint: S03
- Priority: P1
- Depends on: WP-014
- Scope: Support verify-email + resend-verification when email mismatch occurs.
- Deliverables: UI and API integration for verification code path.
- Verification: End-to-end mismatch-email scenario passes.

## WP-016 Role Assignment and Member Management
- Sprint: S03
- Priority: P0
- Depends on: WP-013
- Scope: Update member role/remove member flows.
- Deliverables: Admin/team-lead role management features.
- Verification: Permissions enforced and audited.

## WP-017 Access Audit Trail V1
- Sprint: S03
- Priority: P1
- Depends on: WP-016
- Scope: Audit log entries for invite/accept/role changes.
- Deliverables: Queryable audit records for access operations.
- Verification: Audit rows created for all protected actions.

## WP-018 Menu Module Completion: Modifiers
- Sprint: S04
- Priority: P0
- Depends on: WP-017
- Scope: Finalize modifier groups/properties UX and API behavior.
- Deliverables: Stable modifier management.
- Verification: Create/update modifier group and membership passes.

## WP-019 Menu Module Completion: Meal Set
- Sprint: S04
- Priority: P1
- Depends on: WP-018
- Scope: Implement meal set management page + API.
- Deliverables: Meal set CRUD and relations.
- Verification: Meal set flow works with category/item constraints.

## WP-020 Menu Module Completion: Promotions
- Sprint: S04
- Priority: P1
- Depends on: WP-018
- Scope: Promotions management module.
- Deliverables: Promotion CRUD and enable/disable lifecycle.
- Verification: Promotions persist and apply expected metadata.

## WP-021 Menu Module Completion: Discounts
- Sprint: S04
- Priority: P1
- Depends on: WP-018
- Scope: Discounts configuration module.
- Deliverables: Discount CRUD and validation.
- Verification: Discount setup flows pass regression.

## WP-022 Menu Regression Suite
- Sprint: S04
- Priority: P0
- Depends on: WP-019, WP-020, WP-021
- Scope: Build regression checks for menu categories/items/smart-categories/modifiers.
- Deliverables: Automated menu regression pack.
- Verification: Full pack green.

## WP-023 Store Settings Core Port
- Sprint: S05
- Priority: P0
- Depends on: WP-022
- Scope: Port key store settings (workday, service area, system params).
- Deliverables: Store settings API + page set.
- Verification: Settings read/write parity with expected legacy behaviors.

## WP-024 Device and Printer Configuration Port
- Sprint: S05
- Priority: P0
- Depends on: WP-023
- Scope: Device/printer/cash drawer configuration flows.
- Deliverables: Device management module.
- Verification: Device settings persist and validate.

## WP-025 Table and Section Management Port
- Sprint: S05
- Priority: P1
- Depends on: WP-023
- Scope: Table/section setup UX and APIs.
- Deliverables: Table management module.
- Verification: Table/section CRUD works per shop scope.

## WP-026 Settings Audit Trail and Guardrails
- Sprint: S05
- Priority: P1
- Depends on: WP-024, WP-025
- Scope: Add protected change logs and role restrictions for settings.
- Deliverables: Auditable settings mutations.
- Verification: Unauthorized writes rejected; logs captured.

## WP-027 Staff/User Group Management Port
- Sprint: S06
- Priority: P0
- Depends on: WP-026
- Scope: Staff and user group CRUD with permission matrix.
- Deliverables: Staff/user settings module.
- Verification: Role matrix and assignment tests pass.

## WP-028 POS Rights and Overrides
- Sprint: S06
- Priority: P0
- Depends on: WP-027
- Scope: Shop-level rights and override controls.
- Deliverables: Fine-grained operational permission model.
- Verification: Permission checks enforced in APIs.

## WP-029 User Import/Export and Ops Utilities
- Sprint: S06
- Priority: P1
- Depends on: WP-027
- Scope: CSV export/import and operational tools.
- Deliverables: Batch ops tooling for user administration.
- Verification: Import/export roundtrip validated.

## WP-030 Orders Core API Port
- Sprint: S07
- Priority: P0
- Depends on: WP-029
- Scope: Order lifecycle APIs and core views.
- Deliverables: Order read/update flow with statuses.
- Verification: End-to-end order status transitions pass.

## WP-031 Payment Config and Methods Port
- Sprint: S07
- Priority: P0
- Depends on: WP-030
- Scope: Payment methods/settings and shop mappings.
- Deliverables: Payment configuration module.
- Verification: Payment setup persisted per tenant/shop.

## WP-032 Callback/Webhook Reliability
- Sprint: S07
- Priority: P0
- Depends on: WP-031
- Scope: Idempotency, retry, and failure-safe webhook processing.
- Deliverables: Hardened callback processing path.
- Verification: Duplicate callback tests pass without double effects.

## WP-033 Orders/Payments E2E Pack
- Sprint: S07
- Priority: P1
- Depends on: WP-032
- Scope: Automated tests for order->payment critical path.
- Deliverables: E2E suite for transactional flows.
- Verification: Green transactional suite on staging.

## WP-034 Inventory Overview and Stock Levels Port
- Sprint: S08
- Priority: P0
- Depends on: WP-033
- Scope: Inventory overview and stock level APIs/pages.
- Deliverables: Inventory baseline module.
- Verification: Stock reads and updates are accurate.

## WP-035 Stock Orders + Stock Take Port
- Sprint: S08
- Priority: P0
- Depends on: WP-034
- Scope: Stock order and stock take workflows.
- Deliverables: Procurement/count workflows.
- Verification: End-to-end stock order/take scenario passes.

## WP-036 Supplier and Inventory Audit Controls
- Sprint: S08
- Priority: P1
- Depends on: WP-035
- Scope: Supplier management and inventory action logging.
- Deliverables: Supplier CRUD + audit.
- Verification: Every inventory mutation has audit trace.

## WP-037 Reporting V1: Sales and Payments
- Sprint: S09
- Priority: P0
- Depends on: WP-036
- Scope: Sales summary and payment summary reports.
- Deliverables: Core report endpoints and UI.
- Verification: Key report totals match sampled legacy outputs.

## WP-038 Reporting V1: Item/Category/Shift
- Sprint: S09
- Priority: P1
- Depends on: WP-037
- Scope: Item/category/shift-level operational reports.
- Deliverables: Additional high-demand reports.
- Verification: Filtered report correctness validated.

## WP-039 Report Export and Performance Optimization
- Sprint: S09
- Priority: P1
- Depends on: WP-038
- Scope: CSV export and query optimization for large date ranges.
- Deliverables: Usable report exports and acceptable latency.
- Verification: Performance baseline met for agreed dataset.

## WP-040 Third-Party Integration Framework
- Sprint: S10
- Priority: P0
- Depends on: WP-039
- Scope: Standardized connector framework and credential handling.
- Deliverables: Integration management foundation.
- Verification: Connector health checks and retries work.

## WP-041 Delivery/Online Order Integrations
- Sprint: S10
- Priority: P0
- Depends on: WP-040
- Scope: Port required delivery/online integrations.
- Deliverables: Operational integration set for launch.
- Verification: Test transactions succeed with partner sandboxes.

## WP-042 Integration Observability and Failure Ops
- Sprint: S10
- Priority: P1
- Depends on: WP-041
- Scope: API logs, error dashboards, retry controls.
- Deliverables: Troubleshooting-ready integration observability.
- Verification: Failed call path has visible diagnostics.

## WP-043 Migration Tooling and Data Mapping
- Sprint: S11
- Priority: P0
- Depends on: WP-042
- Scope: Build migration scripts/mappers for org/users/menu/critical domains.
- Deliverables: Repeatable migration toolkit.
- Verification: Dry-run completes with report artifacts.

## WP-044 Reconciliation Reporting
- Sprint: S11
- Priority: P0
- Depends on: WP-043
- Scope: Compare old vs new outputs for key aggregates and entities.
- Deliverables: Reconciliation reports and thresholds.
- Verification: Variance report reviewed and accepted.

## WP-045 Security and Performance Hardening
- Sprint: S11
- Priority: P1
- Depends on: WP-044
- Scope: Address high-risk security/performance issues and warning hotspots.
- Deliverables: Hardened release candidate baseline.
- Verification: Security/perf checklist signed off.

## WP-046 Migration Rehearsal Runbooks
- Sprint: S11
- Priority: P1
- Depends on: WP-044
- Scope: Two rehearsal cutovers with documented timings/issues.
- Deliverables: Finalized migration/cutover runbook.
- Verification: Rehearsal #2 within target window.

## WP-047 UAT Execution and Defect Burn-down
- Sprint: S12
- Priority: P0
- Depends on: WP-046
- Scope: Business UAT and final critical bug fixes.
- Deliverables: UAT sign-off package.
- Verification: No open critical/blocker defects.

## WP-048 Go-Live Readiness and Rollback Controls
- Sprint: S12
- Priority: P0
- Depends on: WP-047
- Scope: Release checklist, rollback plan, on-call and incident protocol.
- Deliverables: Go-live runbook and rollback tested path.
- Verification: Go/no-go checklist fully green.

## WP-049 Hypercare and Stabilization Window
- Sprint: S12
- Priority: P1
- Depends on: WP-048
- Scope: Post-launch monitoring and rapid fix loop.
- Deliverables: Hypercare dashboard and incident log cadence.
- Verification: First stabilization window completed.
