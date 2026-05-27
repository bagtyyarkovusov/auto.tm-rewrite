# Sprint 8 — Private beta polish

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 (MLP beta final) |
| **Milestone** | M7 — Private beta |
| **Demo audience** | First 10-50 real users |
| **Estimated time** | ~1 week |

## Goal

Prepare the small marketplace loop for real private beta users. This is not a feature expansion sprint. It is the circuit-breaker sprint for the MLP: fix the obvious UX, reliability, legal, seed-data, and operations gaps before inviting real users.

## User capability (the demo line)

> "A real seller can post a car, a real buyer can find and contact them, and the team can watch the beta and moderate issues without SSH."

## Bounded contexts touched

- **Primary**: all Phase 1 MLP surfaces, mostly polish and verification
- **Supporting**: ops docs, legal docs, seed data, mobile/web/admin smoke paths

## Acceptance criteria (DoD)

- [ ] End-to-end happy path works on mobile: login → create listing → browse/search → contact seller → seller replies
- [ ] Public web landing exists with a simple search/browse CTA and links to listing detail
- [ ] Legal pages exist in RU/TK/EN: privacy and terms
- [ ] Account deletion path is reachable from mobile settings or documented beta support path
- [ ] Account deletion behavior matches Feature 30 and Legal docs before beta: `DELETE /api/v1/me` starts a 30-day grace period, revokes refresh sessions, archives user listings, allows recovery by login during the grace period, preserves listings/messages/moderation reports/audit rows with deleted-user attribution, and schedules/defines PII purge after day 30; the S2 hard-delete cascade is not acceptable for beta legal posture
- [ ] Internal beta distribution path works (TestFlight/Play internal track or documented equivalent)
- [ ] Seed data supports the first beta: core brands/models, regions/cities, body/color/spec options
- [ ] Top 5 user-facing errors have plain copy and retry behavior
- [ ] Top 5 API queries in the MLP path have indexes or documented acceptable query plans
- [ ] Mobile tap targets and obvious contrast issues pass a focused accessibility check
- [ ] Admin reports/moderation path is smoke-tested with real beta-like data
- [ ] Monitoring/runbook covers API health, DB health, SMS OTP health, media storage, admin escalation, and the beta responder owner for the first 24h after deploy
- [ ] Operational drills pass in staging/prod-like infra before beta invites: Telegram alert delivery, rollback, backup restore, feature-pause flags, and bad-moderation reversal through normal admin actions
- [ ] No new product capability is added unless it blocks the MLP loop
- [ ] Documentation drift audit passes: PRD features, flows, ops docs, `CONTEXT-MAP.md`, relevant `CONTEXT.md` files, and issue-label guidance reflect ADR-0027's MLP beta scope; historical ADRs/retros remain historical
- [ ] Deferred-feature ledger is reviewed: every post-MLP candidate in `03-roadmap.md` has a current PRD home, a trigger to build, and no orphan future sprint file or issue
- [ ] `docs/prd/03-roadmap.md` updated to mark Phase 1 MLP beta complete when S8 closes
- [ ] Phase 1 retro captures which post-MLP bets should be shaped next

## Tests required

- **API e2e**: MLP happy path across identity, listings, contact, moderation; account deletion starts grace period instead of hard-deleting user immediately
- **Mobile smoke**: login, create listing, search, contact
- **Web smoke**: landing + listing detail OG metadata
- **Admin smoke**: report, ban, audit log
- **Manual beta checklist**: distribution, legal links, seed data, monitoring, alert/rollback/restore/feature-pause/moderation drills

## Recommended child issue map

Use this map when creating S8 GitHub issues. S8 is a closure sprint, so children should be mostly verification/polish slices, not new product surfaces.

| Order | Child slice | Primary areas | Depends on | Notes |
|---|---|---|---|---|
| 1 | Beta gate inventory + issue sequencing | `docs` | S7 shipped | Confirm S1-S7 shipped state, open blockers, and exact S8 issue order before implementation starts. |
| 2 | Account deletion legal alignment | `api`, `identity`, `db`, `mobile` | 1 | Replace S2 hard delete with grace-period beta behavior, session revocation, listing archive behavior, recovery path, day-30 purge definition, and mobile/settings or support entry. |
| 3 | Public web + legal links | `web`, `docs` | 1 | Landing/search CTA, listing detail public metadata, RU/TK/EN privacy and terms links. |
| 4 | Seed data + catalog readiness | `db`, `api` | 1 | Beta cities, core brand/model/spec coverage, deterministic seed/check command or documented operator path. |
| 5 | Top errors, accessibility, mobile polish | `mobile`, `api` | 1 | Plain copy/retry for top MLP errors, tap target/contrast pass, smoke fixes only. |
| 6 | Query/index/performance gate | `api`, `db`, `perf` | 1 | Top 5 MLP queries have indexes or acceptable plans; no broad tuning outside measured beta paths. |
| 7 | Ops drills + beta distribution | `infra`, `docs`, `mobile` | 1 | Internal/private app distribution, alert/rollback/restore/feature-pause/moderation drills, support channel readiness. |
| 8 | Full MLP smoke + docs drift closeout | `docs`, `api`, `mobile`, `admin`, `web` | 2, 3, 4, 5, 6, 7 | End-to-end beta path, deferred-feature ledger review, `CONTEXT-MAP.md`/`CONTEXT.md` drift check, roadmap M1-M7 update, Phase 1 retro inputs. |

Any S8 issue that tries to add blog, saved searches, notifications, showroom, Garage, rich chat, video, broad dashboard, or app-store marketing should be moved to a post-MLP PRD home instead of being accepted as S8 scope.

## Documentation drift closeout

The final S8 closeout issue must run this checklist before Phase 1 is marked complete:

- **Roadmap**: `docs/prd/03-roadmap.md` has S1-S8 accurate statuses, M1-M7 state, and a current post-MLP bet table.
- **Deferred-feature ledger**: every deferred feature has a current PRD or flow home, a trigger to build, and no orphan "future sprint" file pretending the work is already scheduled.
- **Sprint docs**: S7 and S8 child issue outcomes reconcile with their sprint DoD; any shipped-vs-planned drift is captured in the retro, not by silently rewriting a locked sprint file.
- **CONTEXT docs**: every implementation PR that changed a domain invariant updated the local `CONTEXT.md`; planned additions remain clearly marked as planned and point to owning PRD/sprint docs.
- **CONTEXT-MAP**: any new app, package, bounded context, or mobile feature-module context is indexed.
- **Issues**: open issues for post-MLP ideas point to the owning PRD/flow and use `phase-2` or `phase-3`; S8 does not leave Phase 1 cleanup hidden in vague `needs-triage` issues.
- **ADRs**: no new ADR is required for clarifying deferred placement, but any material capability move between phases or any surprising architectural trade-off has an ADR or an explicit "no ADR needed" note in the retro.

If the checklist finds a gap that affects beta safety, fix it before invites. If it finds only post-MLP planning work, park it in the roadmap bet table or the owning feature PRD and do not keep extending S8.

## Files this sprint creates / touches

```
apps/mobile/
apps/web/src/app/[locale]/
apps/admin/src/app/(admin)/
docs/prd/ops/83-legal.md
docs/prd/ops/84-launch-plan.md
docs/prd/ops/85-launch-analytics-plan.md
apps/api/src/modules/identity/
packages/db/prisma/schema.prisma
```

## References

- **Phase scope**: [`../02-phases.md`](../02-phases.md)
- **Roadmap**: [`../03-roadmap.md`](../03-roadmap.md)
- **Ops PRDs**: [`../ops/83-legal.md`](../ops/83-legal.md), [`../ops/84-launch-plan.md`](../ops/84-launch-plan.md), [`../ops/85-launch-analytics-plan.md`](../ops/85-launch-analytics-plan.md)
- **ADRs**: [ADR-0027](../../adr/0027-mlp-beta-scope.md)

## Previous-sprint dependencies

- S1-S7 — this sprint verifies and polishes the complete MLP loop

## No-gos

- No blog
- No saved searches
- No notification categories
- No dealership showroom
- No Garage
- No rich chat
- No video pipeline
- No broad app-store marketing launch

## Definition of "MLP beta complete"

After this sprint:

- [ ] M1-M7 are all 🟢 in `03-roadmap.md`
- [ ] First 10-50 users can be invited
- [ ] The team can observe, moderate, and support those users
- [ ] A Phase 1 retro lists the next 1-3 shaped post-MLP bets
