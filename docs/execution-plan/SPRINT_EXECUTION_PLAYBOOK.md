# Sprint Execution Playbook

This file translates roadmap scope into execution order for AI agents.

## General Sprint Sequence
1. Pick ready work packages from the active sprint.
2. Complete backend contract/API packages first.
3. Complete frontend integration packages second.
4. Complete tests and regression packages third.
5. Update `PROGRESS_TRACKER.md` after each package.

## S01 Playbook
- Order: `WP-001 -> WP-002 -> WP-003 -> WP-004 -> WP-006 -> WP-005 -> WP-007`
- Gate: onboarding + profile + brand load smoke path must pass.

## S02 Playbook
- Order: `WP-008 -> WP-009 -> WP-010 -> WP-011 -> WP-012`
- Gate: org CRUD and tenant isolation pass with role checks.

## S03 Playbook
- Order: `WP-013 -> WP-016 -> WP-014 -> WP-015 -> WP-017`
- Gate: invite->accept->role-change lifecycle fully operational.

## S04 Playbook
- Order: `WP-018 -> (WP-019, WP-020, WP-021 in parallel) -> WP-022`
- Gate: menu regression suite green.

## S05 Playbook
- Order: `WP-023 -> WP-024 -> WP-025 -> WP-026`
- Gate: store setup flow can be completed for one shop from scratch.

## S06 Playbook
- Order: `WP-027 -> WP-028 -> WP-029`
- Gate: staff provisioning and permission overrides validated.

## S07 Playbook
- Order: `WP-030 -> WP-031 -> WP-032 -> WP-033`
- Gate: duplicate callback test proves idempotent payment handling.

## S08 Playbook
- Order: `WP-034 -> WP-035 -> WP-036`
- Gate: inventory mutation auditability verified.

## S09 Playbook
- Order: `WP-037 -> WP-038 -> WP-039`
- Gate: report totals reconciled against legacy sample windows.

## S10 Playbook
- Order: `WP-040 -> WP-041 -> WP-042`
- Gate: integration error observability covers all required connectors.

## S11 Playbook
- Order: `WP-043 -> WP-044 -> (WP-045, WP-046)`
- Gate: migration rehearsal runbook approved after second rehearsal.

## S12 Playbook
- Order: `WP-047 -> WP-048 -> WP-049`
- Gate: go-live checklist green and hypercare coverage active.
