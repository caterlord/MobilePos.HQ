# EWHQ Admin Portal Implementation Plan (Archive Note)

## Status
This file is kept only as historical context.

The active and authoritative implementation plan is now under:
- `docs/execution-plan/README.md`
- `docs/execution-plan/MASTER_SPRINT_PLAN.md`
- `docs/execution-plan/WORK_PACKAGE_CATALOG.md`
- `docs/execution-plan/SPRINT_EXECUTION_PLAYBOOK.md`
- `docs/execution-plan/PROGRESS_TRACKER.md`

## Authentication Baseline (Current)
- Authentication is Auth0-only.
- Backend protected endpoints require Auth0 bearer access tokens.
- Legacy local auth endpoints such as `/api/auth/login` are not part of the active architecture.

## Current Sprint Tracking
Use `docs/execution-plan/PROGRESS_TRACKER.md` for:
- Work package status (`todo`, `in_progress`, `blocked`, `done`)
- Evidence and validation updates
- Sprint completion updates

## Why This File Was Simplified
The prior content referenced legacy implementation assumptions (local JWT auth, obsolete endpoint lists, and outdated setup details). Those details are superseded by the execution-plan docs and backend/frontend source code.
