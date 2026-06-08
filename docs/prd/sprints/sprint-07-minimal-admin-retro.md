# Sprint 7 — Minimal admin + moderation — Retrospective

> Written by `/close-sprint 7` on 2026-06-08.
> Sprint started 2026-06-07; all child code merged 2026-06-08.
> **Closure status at retro time: code shipped, bookkeeping incomplete.** All 10 child issues (#176–#185) are CLOSED and merged to `main`, but parent PRD issue [#175](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/175) is still **OPEN** and the roadmap still shows S7 as **🟡 In progress**. See _Roadmap drift_ below.

## Execution shape

S7 ran through Kimi-Sandcastle as **direct branch merges** (the S6 pattern), not GitHub PRs — so there are no PR diffs to audit; evidence below comes from merge commits, the updated `CONTEXT.md` files, the Prisma schema, and the on-disk file/spec inventory. The `(#NNN)` in commit titles are **issue** references, not PRs.

Each slice landed as a `feat` commit plus, in several cases, in-sprint `review`/`fix`/`refactor` commits — evidence the Sandcastle merger + review pass was active (DI registration fix for `AdminGuard` #178, conversations `CONTEXT.md` correction + banned-enforcement tests #182, dead-use-case removal #183, `DismissReport` correctness #184).

## Shipped vs planned

Assessed at the 10-slice level (the sprint DoD has ~115 `- [ ]` checkboxes; they map onto these slices). "Evidence" = code/schema/CONTEXT/spec present on `main` today.

| # | Slice (issue) | Landed by | Key evidence | Gap? |
|---|---|---|---|---|
| 1 | Contracts + OpenAPI (#176) | `a2f3c3f` | `packages/contracts` admin/auth/report/audit Zod schemas + OpenAPI; canonical action/reason/status constants | none found |
| 2 | DB migration + bootstrap + fixtures (#177) | `bb40a02`,`23fea4e` | migration `20260608010000_s7_admin_moderation`; `TotpEnrollment`,`TotpBackupCode`,`ContentReport`,`AuditLog`,suspension fields,`adminTotpExpiresAt`,`banned` all in schema; `promote-admin.ts` + runbook `ops/86` | none found |
| 3 | API admin auth + TOTP hardening (#178) | `bfff908`,`65aac9b` | identity `EnrollAdminTotp`/`VerifyAdminTotp`/`GetAdminTotpStatus`; `AdminGuard` (role+TOTP+`sid`); AES-256-GCM secret, SHA-256 backup codes, 5/10min throttle, adjacent-step skew | none found |
| 4 | Admin app auth bridge (#179) | `6e2c21a`,`da38b01` | `apps/admin` cookie bridge, `middleware.ts` (renamed from proxy), refresh-on-401, `returnTo` validation | UI/cookie behavior not re-exercised in retro |
| 5 | Public report creation + mobile entry (#180) | merged `d40df83`/`0e58f37` | `CreateReport` in `admin/`, resource-shaped `POST /listings/:id/report` + `/users/:id/report`, self-report + suspended-reporter + dedupe | mobile entry not exercised in retro |
| 6 | Report queue/detail + audit reads (#181) | `bc300d8` | `ListReports`,`GetReportDetail`,`ListAuditEntries`; offset pagination 50/100, live target/actor summaries | none found |
| 7 | Listing ban/unban + enforcement (#182) | `fe23434`,`6a39261` | `BanListing`/`UnbanListing`, `ListingsAdminPort` tx-scoped adapter; feed/search/detail/owner-mutation/contact enforcement + tests | none found |
| 8 | User suspend/unsuspend + enforcement (#183) | `494dd92`,`0d0f4ff` | `SuspendUser`/`UnsuspendUser`, `IdentityAdminPort`; `USER_SUSPENDED` blocks across listings/conversations/admin; admin-target + self-moderation rejection | none found |
| 9 | Admin moderation UI (#184) | `278f463`,`30fa2c1` | all 6 planned admin pages present (`login`,`reports`,`reports/[id]`,`listings/[id]`,`users/[id]`,`audit`); `DismissReport` endpoint | UI not walked in browser in retro |
| 10 | Launch-safety flags + e2e smoke closeout (#185) | `a197831` | `ConfigController` + `REPORT_ENTRY_ENABLED`/`ADMIN_MODERATION_ACTIONS_ENABLED` controller guards; `AdminModerationController.e2e.spec.ts` deterministic smoke | **did not flip roadmap / close parent** (see below) |

**Slice-level result:** 10/10 slices have clear code evidence on `main`. No functional AC gaps detected.

### Gaps

- **No functional gaps found** in the merged code. The closeout slice (#10) shipped its launch-safety flags and e2e smoke spec but **omitted its own DoD tail** — sprint DoD lines 179 (`roadmap updated when S7 closes`) and the parent-issue close. That is bookkeeping drift, not a feature gap (tracked under _Roadmap drift_).
- **Not independently re-verified in this retro** (documentation/evidence pass, not a live gate): the e2e smoke actually passing, TOTP enrollment against a real authenticator app, the admin browser walkthrough, and mobile report-entry behavior. These are the human gate the team already planned post-run — they remain owed before beta invites, but they are not "missing work," they are "unverified-by-this-retro."

## Drift findings

### CONTEXT.md drift
- **Forward direction — clean.** `admin/`, `identity/`, `listings/`, and `conversations/` `CONTEXT.md` were all updated in-sprint (2026-06-08) and accurately describe the shipped entities, ports, use-cases, routes, events, and enforcement. The per-PR docs gate held well — this is the strongest part of the sprint.
- **Inverse direction — clean.** Every entity `CONTEXT.md` claims (`ContentReport`, `AuditLog`, `TotpEnrollment`, `TotpBackupCode`, suspension fields, `banned`) exists in `packages/db/prisma/schema.prisma`. No aspirational entity leaked into current-state sections.
- **Minor tidy (ADR-0019):** `admin/CONTEXT.md` still carries a large `## Planned additions (S7 MLP moderation + post-MLP dashboard)` block (lines ~109–198) that mixes **already-shipped S7 items** (the `ContentReport` entity, `AuditLog.action` string decision, S7 query shape, the transaction boundary, the kill switches) — now redundant with the current-state sections above — alongside genuinely-future post-MLP items. It also describes an aspirational port design (`AuditWritePort.record`, `AdminReadPort.*`) that does **not** match what shipped (`## Ports exposed` correctly says "none today"). Per ADR-0019, shipped content should not sit under "Planned additions," and unbuilt designs should be unambiguously marked as not-yet-built. Low priority, non-blocking; proposed as an optional tidy commit.

### ADR drift
- **No new ADR was added in S7** (highest ADR is still 0030). Most S7 work implements decisions already locked in ADR-0006 (OTP+TOTP), ADR-0012 (sessions/`adminTotpExpiresAt`), and ADR-0027 (minimal-admin-in-S7). That is fine.
- **One genuinely-new architectural precedent went uncaptured by an ADR:** the **cross-context transaction-scoped admin ports** — `admin/` opens and owns a single Prisma transaction for moderation, and `listings/`/`identity/` expose `ListingsAdminPort`/`IdentityAdminPort` methods that *participate in the caller's transaction* (a `tx` handle flows into the `admin/` application use-cases). This is a deliberate, well-reasoned exception to "contexts don't share infrastructure," and it is documented in three `CONTEXT.md` files + the (locked) sprint file. But it sets a precedent future agents will copy for any cross-context atomic write, and there is no immutable decision record explaining the trade-off (atomicity vs. an ORM-agnostic unit-of-work abstraction that was intentionally not built for the MLP). **Candidate for a one-paragraph ADR.** Medium confidence it's worth it; proposed as an optional draft below.

### Sprint file accuracy
- **Planned but not created (by design):** `identity/application/SuspendUserAccount.ts` and `UnsuspendUserAccount.ts` (sprint file lines 223–224). They were created, then **removed as dead code** by review commit `0d0f4ff`. The shipped design orchestrates suspend/unsuspend from `admin/` (`SuspendUser`/`UnsuspendUser`) and has `identity/` expose only `IdentityAdminPort` via `PrismaIdentityAdminRepository` — a cleaner single-owner-of-orchestration outcome than the planned two-layer split. Improvement, not a miss.
- **Done but not enumerated in the file list:** `apps/api/src/modules/conversations/` enforcement edits (banned-listing + suspended-participant blocking) and `apps/api/src/common/admin.guard.ts` were touched but the sprint's `## Files this sprint creates / touches` listed conversations only conditionally and didn't enumerate the guard. The conversations touch is required by the enforcement ACs (correct scope); the file list simply under-enumerated it. No scope creep.

### Roadmap drift
- **Status mismatch (primary finding):** all 10 children CLOSED + all code merged, but `docs/prd/03-roadmap.md` still shows S7 **🟡** (last touched by `baafb63 docs: mark S7 in progress`). Per ADR-0020's doc-pair check ("if every child is CLOSED, roadmap row should be 🟢"), this is drift.
- **No Shipped-log entry** for S7.
- **Current-sprint pointer** still points at S7, not S8.
- **Parent issue #175 still OPEN** (`closedAt=null`). `/close-sprint` is not permitted to close issues, so this is a manual step for the operator.
- **Unrelated stray:** PR **#166** (the old S5 closeout PR, `sandcastle/issue-165-...`) is still **OPEN** even though the roadmap already shows S5 🟢 — it was superseded by `136779e docs: roadmap — close S6...`/earlier S5 edits. Worth closing to keep the PR list clean; out of S7 scope, flagged only.

### Dependency / version drift
- **`otplib ^13.4.1`** added to `apps/api/package.json` (new TOTP runtime dep — verified). `qrcode` was pre-seeded into the Sandcastle offline store (`2c638ee`) for build determinism; the API returns the `otpauth://` URI and QR rendering is client-side, so `qrcode` is not an `apps/api` runtime dep. These are net-new minor deps, **not** major bumps of existing deps — no charter §21 revision required. (Confirms the [[s7-issues-afk-setup]] memory: otplib+qrcode had to be in the lockfile + image before the AFK run.)

### Test coverage
- **Not independently measured in this retro** (deliberately — the Testcontainers e2e suite is heavy and is the CI/human gate per ADR-0028, not a retro step). Spec inventory is healthy: **admin 12, identity 18, listings 31, plus 12 e2e specs** across modules. `admin/CONTEXT.md` documents a unit spec (fakes, no DB) for every one of the 9 admin use-cases, and the e2e smoke spec exists. Recommend the standard human gate (real-authenticator TOTP, admin browser walkthrough, e2e smoke) as part of S8's "full MLP smoke" rather than re-running here.

### Architecture / complexity drift
- **Domain purity — clean.** No `domain/` file in any context imports `@nestjs/*`, `@prisma/client`, or `PrismaClient`. Framework/ORM matches are confined to `application/` `@Injectable()` use-cases (the established repo convention) and the deliberate `Prisma` tx-handle in the 5 `admin/` moderation use-cases.
- **Cross-context boundaries — clean.** Every cross-context import is a **published port interface + DI token** from `<context>/domain/ports/` (`ListingsReadPort`, `ListingsAdminPort`, `IdentityReadPort`, `IdentityAdminPort`, `IdentityCheckPort`) — the sanctioned seam, consistent with how `conversations/` consumed `listings/` in S6. No context reaches into another's `application/`/`infrastructure/`/entities.
- **No pass-through wrappers / god objects spotted.** `admin/` use-cases are one-job-per-file; the `*AdminPort` adapters genuinely hide Prisma transaction mechanics rather than adding empty interface surface.
- The only architectural note worth an ADR is the transaction-scoped cross-context port pattern (see _ADR drift_).

## Prerequisites for sprint 8

### Hard blockers (must resolve before `/create-sprint-issues 8`)
- **Close parent issue [#175](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/175)** and **flip the roadmap S7 → 🟢 + bump Current → S8** (proposed remediation below). `/create-sprint-issues 8` expects S7 formally closed and the roadmap pointer on S8; running it against a 🟡 S7 / open-parent state would compound the drift.

### Soft prereqs (nice-to-have, not gating issue creation)
- Run the deferred **human verification gate** the team already planned: TOTP enrollment in a real authenticator, admin browser walkthrough (login → reports → ban/dismiss → audit), mobile report-entry, and the e2e smoke. S8 explicitly re-smokes the moderation path, so this can fold into S8 #1/#8 rather than block S8 start.
- Close stale **PR #166** (S5 closeout) to keep the PR queue honest.
- Optionally apply the `admin/CONTEXT.md` tidy and the transaction-port ADR (below).

### Parallel action items from charter §19 relevant to S8 (private beta)
S8 is the beta-readiness sprint; these §19 items are its real-world dependencies and should be in motion before invites:
- **#7 Privacy Policy + ToS in RU/TK/EN** → S8 DoD "Legal pages exist in RU/TK/EN."
- **#8 Account deletion endpoint + screen** → S8 DoD "Account deletion path… 30-day grace" (replaces the S2 hard-delete cascade; `identity/CONTEXT.md` already documents this as the S8 alignment).
- **#6 Apple Developer + Google Play Console accounts** → S8 DoD "Internal beta distribution path."
- **#5 Register/verify `auto.tm` + `admin.auto.tm`/`api.auto.tm`/`media.auto.tm`** and **#4 Source 1–2 OTP phones** → real OTP delivery + reachable beta surfaces.
- **#1 TLS cert strategy / #3 TM Proxy PC** → S8 DoD "Operational drills… in prod-like infra."

## Proposed doc updates

Each is a separate commit so they can be reviewed individually.

- [ ] **Update `docs/prd/03-roadmap.md`** — set S7 row → 🟢 with Shipped 2026-06-08; flip the Current-sprint block + status to S8 ⚪ Pending; add a S7 Shipped-log entry. _(Mutable-per-sprint doc; flipping to 🟢 now matches reality — all S7 code is merged.)_
- [ ] **(manual — not done by this command)** Close parent issue **#175**. `/close-sprint` is forbidden from closing issues; operator action.
- [ ] **(optional) Tidy `apps/api/src/modules/admin/CONTEXT.md`** — trim shipped-S7 items out of the `## Planned additions` block and mark the unbuilt `AuditWritePort`/`AdminReadPort` design as not-yet-built, per ADR-0019.
- [ ] **(optional) Create `docs/adr/0031-cross-context-transaction-scoped-admin-ports.md`** — capture the admin-owned-transaction + transaction-scoped `ListingsAdminPort`/`IdentityAdminPort` precedent.
- [ ] **(optional, out of scope) Close stale PR #166** — operator action; not an S7 artifact.

## Lessons for sprint 8

The per-context `CONTEXT.md` discipline was the standout success: a 10-slice, four-context, security-sensitive sprint landed with all four touched `CONTEXT.md` files accurate to the schema on the same day the code merged, and the review pass caught a CONTEXT.md error (#182) and dead code (#183) before they calcified. S8's documentation-drift closeout will be lighter because of it. The one systemic miss is the **opposite** end of the lifecycle: the AFK closeout slice shipped its features but did not perform the sprint's own closing bookkeeping (roadmap flip + parent close). For S8, make the final closeout child's DoD explicitly include "flip roadmap to 🟢 + close parent issue," and have `/close-sprint` (not the AFK run) own the formal flip — the AFK agent reliably ships code but not cross-cutting repo state.

Second lesson: a non-trivial architectural pattern (cross-context transactional writes via tx-scoped ports) shipped without an ADR because the justification lived only in the locked sprint file. When a slice's design introduces a reusable precedent, the implementing agent should drop a one-paragraph ADR in the same merge — cheaper than reconstructing the "why" later.

S8 is a closure/polish sprint with no new bounded contexts, so its drift surface is mostly verification and the §19 beta-readiness checklist (legal, distribution, account-deletion legal alignment, ops drills) rather than new domain invariants.

## Sign-off

After the "Proposed doc updates" above are applied (or explicitly skipped) **and parent #175 is closed**, run `/create-sprint-issues 8` to begin the private-beta-polish sprint.
