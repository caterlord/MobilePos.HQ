# EWHQ Next-Gen Execution Plan (AI-Agent Friendly)

## Purpose
This folder contains the execution system for finishing `ewhq-new` from PoC to production-ready parity with legacy POS HQ critical flows.

## Plan Files
- [AGENT_EXECUTION_PROTOCOL.md](./AGENT_EXECUTION_PROTOCOL.md): How AI agents should pick, execute, validate, and report work.
- [MASTER_SPRINT_PLAN.md](./MASTER_SPRINT_PLAN.md): 12-sprint roadmap with scope and exit criteria.
- [SPRINT_EXECUTION_PLAYBOOK.md](./SPRINT_EXECUTION_PLAYBOOK.md): Execution order for each sprint.
- [WORK_PACKAGE_CATALOG.md](./WORK_PACKAGE_CATALOG.md): Atomic work packages (`WP-###`) with dependencies and verification.
- [PROGRESS_TRACKER.md](./PROGRESS_TRACKER.md): Current status by sprint and by work package.
- [../ENVIRONMENT_SETUP.md](../ENVIRONMENT_SETUP.md): Required backend/frontend environment variables and local start steps.

## Status Rules
Use these values everywhere:
- `todo`
- `in_progress`
- `blocked`
- `done`

## Update Rules
1. Start work: set the target work package status to `in_progress` in `PROGRESS_TRACKER.md`.
2. Complete work: set status to `done`, add date, PR/commit reference, and validation notes.
3. Blocked work: set status to `blocked` and add blocker reason + owner.
4. Keep `MASTER_SPRINT_PLAN.md` stable; update `PROGRESS_TRACKER.md` frequently.

## Source Baseline
- Rewrite target: `/Users/michaelyung/RiderProjects/ewhq-new`
- Legacy reference: `/Users/michaelyung/RiderProjects/Everyware/POS.NewWebsite.ProductionBugFix`
- Plan initialized on: `2026-02-24`
