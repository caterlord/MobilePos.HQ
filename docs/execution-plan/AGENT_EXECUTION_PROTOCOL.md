# Agent Execution Protocol

## Objective
Provide a repeatable, low-ambiguity workflow for AI agents executing the roadmap.

## Inputs
Before starting, load:
1. [README.md](./README.md)
2. [MASTER_SPRINT_PLAN.md](./MASTER_SPRINT_PLAN.md)
3. [WORK_PACKAGE_CATALOG.md](./WORK_PACKAGE_CATALOG.md)
4. [PROGRESS_TRACKER.md](./PROGRESS_TRACKER.md)

## Execution Loop
1. Identify active sprint from `PROGRESS_TRACKER.md`.
2. Select next `todo` work package where all dependencies are `done`.
3. Mark selected work package `in_progress`.
4. Implement code changes.
5. Run verification commands listed in the work package.
6. Update docs:
- status (`done` or `blocked`)
- completion date
- commit or PR reference
- validation result
- blocker note if blocked
7. Move to next ready work package.

## Branch and Commit Conventions
- Branch: `feature/wp-###-short-name`
- Commit format: `feat(scope): ...` / `fix(scope): ...` / `refactor(scope): ...`
- Include work package ID in commit body, e.g. `Implements: WP-003`.

## Definition of Done (Per Work Package)
A work package is `done` only if:
1. Code implementation is merged or ready for merge.
2. Required tests/build checks pass.
3. Any docs/runbooks impacted are updated.
4. `PROGRESS_TRACKER.md` is updated with evidence.

## Blocked Handling
If blocked:
1. Mark package `blocked`.
2. Add blocker owner and exact unblock condition.
3. Switch to another dependency-ready package.

## Verification Baseline
- Backend build: `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`
- Frontend build: `npm run build` (in `frontend-hq-portal`)
- Lint frontend: `npm run lint` (in `frontend-hq-portal`)
- Endpoint smoke checks (as applicable): use updated scripts under `backend/EWHQ.Api/`.

## High-Risk Areas (Always Add Extra Checks)
- Auth/Auth0 sync and claim mapping
- Invitation acceptance and role assignment
- Tenant/brand selection and data isolation
- Payment callbacks and idempotency
- Inventory mutations and report aggregates
