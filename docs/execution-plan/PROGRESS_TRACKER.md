# Progress Tracker

## Global Status
- Plan status: `active`
- Current sprint: `S04`
- Last updated: `2026-02-26`

## Sprint Status
| Sprint | Status | Completion % | Notes |
|---|---|---:|---|
| S01 | done | 100 | Sprint completed and runtime-gated checks confirmed |
| S02 | in_progress | 80 | WP-008/009/010/011 done; WP-012 script added and awaiting runtime evidence |
| S03 | in_progress | 95 | WP-013/014/015/016/017 integrated (API + UI + admin migration) with partial runtime verification captured |
| S04 | in_progress | 86 | WP-018/019/020/021 expanded with legacy parity rules (shop pricing, set-item filtering, overview lifecycle batch APIs); WP-050 promotion rule-editor parity API/UX is now in implementation |
| S05 | todo | 0 | Not started |
| S06 | todo | 0 | Not started |
| S07 | todo | 0 | Not started |
| S08 | todo | 0 | Not started |
| S09 | todo | 0 | Not started |
| S10 | todo | 0 | Not started |
| S11 | todo | 0 | Not started |
| S12 | todo | 0 | Not started |

---

## Work Package Status

### S01
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-001 | Contract Alignment: Invitations | done | codex | 2026-02-24 | Added invitation route aliases, token/inviteCode compatibility, and response alias (`organizationName`) |
| WP-002 | Contract Alignment: Profile Security API | done | codex | 2026-02-24 | Implemented `POST /api/auth0/change-password` reset-email flow and updated profile security UI |
| WP-003 | Route Integrity Cleanup | done | codex | 2026-02-24 | Fixed onboarding redirect to `/`, removed dead sidebar/route-config links to non-existent pages |
| WP-004 | Legacy Auth Artifact Cleanup | done | codex | 2026-02-24 | Rewrote auth docs for Auth0-only flow, archived stale legacy admin plan doc, and updated `backend/EWHQ.Api/test-auth.sh` |
| WP-005 | API Contract Test Baseline | done | codex | 2026-02-24 | Added `backend/EWHQ.Api/test-api-contracts.sh`; user-confirmed runtime pass with Auth0 token |
| WP-006 | Environment Template Standardization | done | codex | 2026-02-24 | Added `frontend-hq-portal/.env.example`, expanded `backend/EWHQ.Api/.env.example`, and added `docs/ENVIRONMENT_SETUP.md` |
| WP-007 | P0 Smoke Suite | done | codex | 2026-02-24 | Added `backend/EWHQ.Api/test-smoke-onboarding-brand.sh`; user-confirmed runtime pass with Auth0 + invitation token |

### S02
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-008 | Organization CRUD API Completion | done | codex | 2026-02-24 | Added permission-checked soft-delete endpoints for company/brand/shop, tightened create/update validation, and aligned ownership checks in `UserAccessController` |
| WP-009 | Organization Management UI Wiring | done | codex | 2026-02-24 | Replaced placeholder org page with live hierarchical data load and create/edit/delete flows wired to `user-access` APIs |
| WP-010 | Brand Session Consistency | done | codex | 2026-02-24 | Updated `BrandContext` to recover from stale selected brand IDs and reselect first available brand after access/data changes |
| WP-011 | Org Validation and UX Hardening | done | codex | 2026-02-24 | Added duplicate-name conflict validation (company/brand/shop), improved API error propagation in frontend API client, and synced shared brand context refresh after org mutations |
| WP-012 | Org E2E Coverage | in_progress | codex | 2026-02-24 | Added `backend/EWHQ.Api/test-org-crud.sh` regression script for create/update/delete hierarchy + duplicate-name checks; awaiting runtime token-based execution evidence |

### S03
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-013 | Team List/Detail API + UI | done | codex | 2026-02-25 | Added `teamsService` and replaced User Access placeholder with team list/detail/member UI, including team create/edit/delete and member detail tables |
| WP-014 | Invitation Lifecycle UX | in_progress | codex | 2026-02-25 | Added invitation lifecycle controls in User Access (`invite`, pending list, `resend`, `cancel`) wired to `/api/teams/{id}/...` endpoints; join-flow runtime validation pending |
| WP-015 | Email Verification Branch in Invitation Flow | in_progress | codex | 2026-02-25 | Updated onboarding join flow to handle `requiresEmailVerification`, added `verify-email` and `resend-verification` UX/API integration with attempts display |
| WP-016 | Role Assignment and Member Management | in_progress | codex | 2026-02-25 | Added member role toggle (`set leader/member`) and remove-member actions in team detail table, wired to role-update/remove endpoints |
| WP-017 | Access Audit Trail V1 | in_progress | codex | 2026-02-25 | Added `AccessAuditLogs` model/service/migration, audit logging hooks for invitation/member actions, `GET /api/teams/{id}/access-audit`, and frontend audit table |

### S04
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-018 | Menu Module Completion: Modifiers | in_progress | codex | 2026-02-25 | Added legacy parity on modifier groups: min/max + channel-display flags, copy-from-group clone (details + shop overrides), orphaned shop-price cleanup on member removal, enabled-only member projection, and group item shop-pricing API + drawer UI |
| WP-019 | Menu Module Completion: Meal Set | in_progress | codex | 2026-02-25 | Added `isFollowSet` filter/create contract, new `/menus/meal-set` page with CRUD + item-set membership editor wiring, and restored legacy set-candidate constraints (`isFollowSet || isStandaloneAndSetItem`) for relationship tree + item-set link validation |
| WP-020 | Menu Module Completion: Promotions | in_progress | codex | 2026-02-26 | Added promotions API (`GET/POST/PUT/DELETE /api/promotions/brand/{brandId}`), `PromotionsPage`, overview linkage fields/type handling, batch overview lifecycle API (`PUT/DELETE /api/bundle-promo-overviews/brand/{brandId}/batch`), and null-safe list projection hardening |
| WP-021 | Menu Module Completion: Discounts | in_progress | codex | 2026-02-25 | Added discounts API (`GET/POST/PUT/DELETE /api/discounts/brand/{brandId}`), `DiscountsPage`, overview linkage fields/type handling, and batch overview lifecycle API parity for linked discount enable/disable propagation |
| WP-022 | Menu Regression Suite | in_progress | codex | 2026-02-25 | Added `backend/EWHQ.Api/test-menu-regression.sh` baseline for modifier/meal-set/promotion/discount CRUD lifecycle checks; awaiting runtime execution with token + brand context |
| WP-050 | Promotions Rule Engine Parity | in_progress | codex | 2026-02-26 | Added promotion rule-editor APIs (`GET/PUT /api/promotions/brand/{brandId}/{promoHeaderId}/rule-editor`), detail validation/type mapping/promo-item resolution/shop-rule persistence, and advanced frontend rule-editor controls (flags, schedule fields, mandatory/optional detail rows, deduct/benefit/dept-revenue fields) |
| WP-051 | Discounts Rule Engine Parity | todo | unassigned | - | Legacy advanced discount setup (include/exclude/threshold/qty/conditional rule logic) not yet ported |
| WP-052 | Promotions/Discounts Rule Regression Suite | todo | unassigned | - | Advanced rule scenario API regression pack not yet created |

### S05
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-023 | Store Settings Core Port | todo | unassigned | - | - |
| WP-024 | Device and Printer Configuration Port | todo | unassigned | - | - |
| WP-025 | Table and Section Management Port | todo | unassigned | - | - |
| WP-026 | Settings Audit Trail and Guardrails | todo | unassigned | - | - |

### S06
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-027 | Staff/User Group Management Port | todo | unassigned | - | - |
| WP-028 | POS Rights and Overrides | todo | unassigned | - | - |
| WP-029 | User Import/Export and Ops Utilities | todo | unassigned | - | - |

### S07
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-030 | Orders Core API Port | todo | unassigned | - | - |
| WP-031 | Payment Config and Methods Port | todo | unassigned | - | - |
| WP-032 | Callback/Webhook Reliability | todo | unassigned | - | - |
| WP-033 | Orders/Payments E2E Pack | todo | unassigned | - | - |

### S08
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-034 | Inventory Overview and Stock Levels Port | todo | unassigned | - | - |
| WP-035 | Stock Orders + Stock Take Port | todo | unassigned | - | - |
| WP-036 | Supplier and Inventory Audit Controls | todo | unassigned | - | - |

### S09
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-037 | Reporting V1: Sales and Payments | todo | unassigned | - | - |
| WP-038 | Reporting V1: Item/Category/Shift | todo | unassigned | - | - |
| WP-039 | Report Export and Performance Optimization | todo | unassigned | - | - |

### S10
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-040 | Third-Party Integration Framework | todo | unassigned | - | - |
| WP-041 | Delivery/Online Order Integrations | todo | unassigned | - | - |
| WP-042 | Integration Observability and Failure Ops | todo | unassigned | - | - |

### S11
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-043 | Migration Tooling and Data Mapping | todo | unassigned | - | - |
| WP-044 | Reconciliation Reporting | todo | unassigned | - | - |
| WP-045 | Security and Performance Hardening | todo | unassigned | - | - |
| WP-046 | Migration Rehearsal Runbooks | todo | unassigned | - | - |

### S12
| WP | Title | Status | Owner | Updated | Evidence |
|---|---|---|---|---|---|
| WP-047 | UAT Execution and Defect Burn-down | todo | unassigned | - | - |
| WP-048 | Go-Live Readiness and Rollback Controls | todo | unassigned | - | - |
| WP-049 | Hypercare and Stabilization Window | todo | unassigned | - | - |

---

## Update Log
| Date | Update |
|---|---|
| 2026-02-24 | Initialized AI-agent-friendly sprint and work package tracker. |
| 2026-02-24 | Completed WP-001/WP-002/WP-003. Validation: `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj` and `npm run build` in `frontend-hq-portal` passed. |
| 2026-02-24 | Completed WP-004 and WP-006; implemented WP-005/WP-007 scripts. Validation: `bash -n` on auth/contract/smoke scripts, `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`, `npm run lint`, and `npm run build` in `frontend-hq-portal` all passed. |
| 2026-02-24 | User confirmed runtime pass for WP-005 and WP-007 scripts. Closed S01 and started S02 WP-008 implementation. |
| 2026-02-24 | Implemented S02 org management core: backend CRUD permission completion, frontend org management wiring, and brand selection consistency guard. Validation: `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`, `npm run lint`, `npm run build` in `frontend-hq-portal`. |
| 2026-02-24 | Completed S02 WP-011 hardening and started WP-012 coverage: added duplicate-name conflicts, API error message propagation, and `test-org-crud.sh`. Validation: `bash -n backend/EWHQ.Api/test-org-crud.sh`, `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`, `npm run lint`, `npm run build` in `frontend-hq-portal`. |
| 2026-02-25 | Started S03 WP-013: implemented User Access Teams module (list/detail/member), wired create/edit/delete team actions, and connected pending invitation count. Validation: `npm run lint` and `npm run build` in `frontend-hq-portal`. |
| 2026-02-25 | Progressed S03 WP-014: implemented invitation lifecycle controls in User Access (invite/resend/cancel/pending states) and wired them to Teams API. Validation: `npm run lint` and `npm run build` in `frontend-hq-portal`. |
| 2026-02-25 | Progressed S03 WP-016: implemented member role update and remove actions in User Access Teams detail panel. Validation: `npm run lint` and `npm run build` in `frontend-hq-portal`. |
| 2026-02-25 | Progressed S03 WP-015: added email mismatch verification branch in onboarding (`requiresEmailVerification`, code verification, resend verification) wired to invitation APIs. Validation: `npm run lint` and `npm run build` in `frontend-hq-portal`. |
| 2026-02-25 | Progressed S03 WP-017: implemented access audit trail data model/service, migration (`AddAccessAuditLogs`), Teams audit query endpoint, and frontend audit table in User Access panel. Validation: `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`, `npm run lint`, and `npm run build` in `frontend-hq-portal`. |
| 2026-02-25 | Progressed S04 WP-018/WP-019: finalized modifier-group list/create/deactivate flow and added meal-set group management (`isFollowSet` API contract + `/menus/meal-set` UI) with shared node-properties editor integration. Validation: `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`, `npm run lint`, and `npm run build` in `frontend-hq-portal`. |
| 2026-02-25 | Progressed S04 WP-020/WP-021: implemented promotions and discounts module baseline with backend CRUD endpoints and frontend management pages/routes. Validation: `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`, `npm run lint`, and `npm run build` in `frontend-hq-portal`. |
| 2026-02-25 | Progressed S04 WP-022: added `test-menu-regression.sh` script baseline and syntax validation (`bash -n`). Local build check passed: `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`. |
| 2026-02-25 | Progressed S04 parity hardening: added modifier group shop-pricing drawer flow, stale override cleanup, enabled-only membership projection, meal-set candidate/link guards, and bundle-promo overview batch lifecycle endpoints. Validation: `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`, `npm run lint`, and `npm run build` in `frontend-hq-portal`. |
| 2026-02-26 | Extended S04 plan scope with explicit advanced promo/discount rule migration packages (WP-050/051/052) to track full legacy setup parity beyond baseline CRUD screens. |
| 2026-02-26 | Progressed S04 WP-050: implemented promotion rule-editor API + frontend editor baseline parity (advanced flags/schedule, mandatory/optional details, deduct/benefit + department revenue, shop enablement persistence), fixed promotion list null-mapping path, and corrected frontend promotion service response handling. Validation: `dotnet build backend/EWHQ.Api/EWHQ.Api.csproj`, `npm run lint`, and `npm run build` in `frontend-hq-portal`. |
