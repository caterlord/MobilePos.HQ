# Master Sprint Plan

Planning baseline date: `2026-02-24`
Sprint cadence: `2 weeks`

## Timeline Overview
| Sprint | Dates (2026) | Goal |
|---|---|---|
| S01 | Mar 2 - Mar 15 | Contract fixes and baseline stabilization |
| S02 | Mar 16 - Mar 29 | Organization management end-to-end |
| S03 | Mar 30 - Apr 12 | Teams/invitations/access control completion |
| S04 | Apr 13 - Apr 26 | Menu domain completion and regression safety |
| S05 | Apr 27 - May 10 | Store settings, devices, tables |
| S06 | May 11 - May 24 | Staff, user groups, POS rights |
| S07 | May 25 - Jun 7 | Orders and payments core |
| S08 | Jun 8 - Jun 21 | Inventory and procurement core |
| S09 | Jun 22 - Jul 5 | Reporting V1 |
| S10 | Jul 6 - Jul 19 | Integrations and delivery/online |
| S11 | Jul 20 - Aug 2 | Migration tooling and hardening |
| S12 | Aug 3 - Aug 16 | UAT, go-live, hypercare prep |

---

## S01: Contract + Foundation
- Work packages: `WP-001` `WP-002` `WP-003` `WP-004` `WP-005` `WP-006` `WP-007`
- Primary outcome: No frontend/backend contract mismatches in onboarding/auth/profile critical paths.
- Exit criteria:
- Invitation create/join flow succeeds from UI.
- No dead links in main navigation.
- Smoke suite green.

## S02: Organization Management
- Work packages: `WP-008` `WP-009` `WP-010` `WP-011` `WP-012`
- Primary outcome: Companies/brands/shops are truly manageable from UI with permissions.
- Exit criteria:
- CRUD parity for core org entities.
- Brand context is stable and isolated.
- Org E2E tests green.

## S03: Teams + Invitations + Role Ops
- Work packages: `WP-013` `WP-014` `WP-015` `WP-016` `WP-017`
- Primary outcome: Team and invitation lifecycle is production-usable.
- Exit criteria:
- Team management fully works for admin/team leader.
- Verification-code invitation path works.
- Access audit trail V1 in place.

## S04: Menu Completion
- Work packages: `WP-018` `WP-019` `WP-020` `WP-021` `WP-022`
- Primary outcome: Menu domain is complete enough for daily operations.
- Exit criteria:
- Modifiers/meal set/promotions/discounts available.
- Regression pack prevents core menu breakage.

## S05: Store Ops Settings
- Work packages: `WP-023` `WP-024` `WP-025` `WP-026`
- Primary outcome: Store operational setup can be done without legacy fallback.
- Exit criteria:
- Store, device, printer, table setup pages work.
- Settings are permission-guarded and auditable.

## S06: Staff and POS Access
- Work packages: `WP-027` `WP-028` `WP-029`
- Primary outcome: Staff and rights administration is complete.
- Exit criteria:
- Staff/group/rights model enforceable in APIs/UI.
- Basic import/export operations available.

## S07: Orders and Payments
- Work packages: `WP-030` `WP-031` `WP-032` `WP-033`
- Primary outcome: Transaction-critical flow is stable.
- Exit criteria:
- Order lifecycle available.
- Payment config complete for required methods.
- Callback idempotency and E2E tests pass.

## S08: Inventory
- Work packages: `WP-034` `WP-035` `WP-036`
- Primary outcome: Inventory workflows are operational.
- Exit criteria:
- Stock levels, stock orders, stock take supported.
- Supplier + audit controls available.

## S09: Reporting V1
- Work packages: `WP-037` `WP-038` `WP-039`
- Primary outcome: Essential management reports available.
- Exit criteria:
- Sales/payment/item/category reports ship.
- Export and performance baseline met.

## S10: Integrations
- Work packages: `WP-040` `WP-041` `WP-042`
- Primary outcome: Required external integrations are manageable and observable.
- Exit criteria:
- Connector framework and required partner flows work.
- Failure diagnostics and retry ops in place.

## S11: Migration + Hardening
- Work packages: `WP-043` `WP-044` `WP-045` `WP-046`
- Primary outcome: Cutover can be rehearsed with measurable confidence.
- Exit criteria:
- Migration tooling and reconciliation reports complete.
- Hardening checklist closed.
- Rehearsal runbook validated.

## S12: UAT + Launch Readiness
- Work packages: `WP-047` `WP-048` `WP-049`
- Primary outcome: Production launch package ready.
- Exit criteria:
- UAT sign-off completed.
- Go-live and rollback runbooks approved.
- Hypercare plan activated.

---

## Cross-Sprint Guardrails
- Never start a package with unresolved dependencies.
- Any change touching auth/permissions must include regression tests.
- Every sprint must leave the branch in releasable condition.
