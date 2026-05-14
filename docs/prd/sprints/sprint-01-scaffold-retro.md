# Sprint 1 — Scaffold — Retrospective

> Written by `/close-sprint 1` on 2026-05-14.
> Sprint shipped on 2026-05-14 (per roadmap row); all 15 child issues closed 2026-05-13.

## Shipped vs planned

All 15 vertical-slice child issues (#2–#16) closed, all corresponding PRs (#18–#32) merged. The scaffold sequence ran cleanly in dependency order.

| Issue | PR  | Slice | Status |
|-------|-----|-------|--------|
| #2  | #18 | Version uplift docs (charter §21 + ADR-0011 + .nvmrc + roadmap 🟡) | shipped |
| #3  | #19 | packages/tsconfig + packages/eslint-config | shipped |
| #4  | #20 | packages/ui — theme.css + tokens + components | shipped |
| #5  | #21 | packages/db — Prisma 7 schema + initial migration + smoke test | shipped (drift — see §4.1) |
| #6  | #22 | packages/contracts — Zod schemas + OpenAPI exporter | shipped (drift — see §4.1) |
| #7  | #23 | apps/api — NestJS 11 skeleton, 9 bounded-context modules | shipped |
| #8  | #24 | apps/admin — Next.js 16 + Tailwind v4 + shadcn shell | shipped |
| #9  | #25 | apps/web — Next.js 16 + i18n middleware + landing | shipped |
| #10 | #26 | apps/mobile — Expo SDK 55 + expo-router + NativeWind v4 + 5-tab nav | shipped |
| #11 | #27 | apps/sms-gateway — Fastify Node skeleton | shipped |
| #12 | #28 | apps/phone-agent — Kotlin Android skeleton | shipped |
| #13 | #29 | apps/worker — BullMQ consumer skeleton | shipped |
| #14 | #30 | infra/docker + infra/compose | shipped |
| #15 | #31 | .github/workflows + Makefile (CI + bundle) | shipped (one workflow missing — §4.2) |
| #16 | #32 | Final wiring + verification + roadmap S1 → 🟢 | shipped (sprint file state-bump missed — §4.3) |

### Sprint-wide DoD evidence

Verified directly against the repo (not GitHub API):

- ✅ `.nvmrc` is `22.11.0` (`cat .nvmrc`)
- ⚠️ `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` — relied on PR #32's verification; not re-run as part of this retro. Recommended to confirm before starting S2 (`pnpm install && pnpm typecheck && pnpm test`).
- ✅ Initial Prisma migration committed (`packages/db/prisma/migrations/20260513201407_init/`)
- ✅ All 9 bounded-context modules exist under `apps/api/src/modules/`
- ✅ ADR-0011 exists; charter §21 records the uplift
- ✅ Roadmap S1 row → 🟢 with Shipped = 2026-05-14
- ❌ Roadmap "S2 as 🟡 in progress" — current state is S2 ⚪ Pending. *Note: this AC was inconsistent with the roadmap's documented convention (line 24: "the sprint-closing PR sets the previous sprint to 🟢 shipped and bumps Current to N+1" — N+1 starts at ⚪ Pending, becomes 🟡 only on its first PR). Treating the AC as a sprint-plan wording bug, not real drift.*
- ❌ **Parent PRD issue #1 still OPEN** — sprint is not actually closed on GitHub.

### Gaps

- **Issue #1 (parent) not closed** — the closing PR (#32) marked the roadmap 🟢 but did not close the parent tracking issue. Remediation: `gh issue close 1 --comment "All 15 child issues shipped; roadmap row 🟢."`
- **Sprint-1 sprint file still says `Status ⚪ Planned`** at the top of `docs/prd/sprints/sprint-01-scaffold.md` (it shipped — should be 🟢). Plus the AC checklist is unticked; should be ticked or annotated.
- **No `pnpm test` re-run as part of closure** — couldn't re-verify the green checkmark on AC items today. Recommend `pnpm install && pnpm typecheck && pnpm test` before /create-sprint-issues 2.

## Drift findings

### 4.1 Schema / contracts enum drift (HARD — blocks S2)

The Prisma schema and the `packages/contracts/src/enums.ts` diverged in S1 without anyone noticing because they're enforced in different layers:

**UserRole**
- Schema (`packages/db/prisma/schema.prisma`): `buyer / seller / moderator / admin` (4 values)
- Contracts (`packages/contracts/src/enums.ts`): `buyer / seller / dealer_owner / dealer_member / admin / super_admin` (6 values)
- Issue #6 body specified the 6-value contracts version. Schema implementer (issue #5 / PR #21) silently chose 4 values.

**ListingStatus**
- Schema: `draft / pending_review / active / sold / archived / rejected` (6 values — matches issue #5 spec)
- Contracts: `Draft / Published / Sold / Archived` (4 values — does not match issue #6 spec, does not match schema)

Both `Currency`, `MessageKind`, `NotificationCategory`, `MediaKind` enums match between schema and contracts.

**Why this is a HARD blocker for S2**: `RequestOtp` and `VerifyOtp` use-cases will return a `User` whose `role` field is typed by `contracts.UserRole`. The mobile + web clients consume that type. The first time the API tries to return a `User` row with `role=moderator` (or attempts to write a `dealer_owner` user), the system breaks.

### 4.2 Identity CONTEXT.md vs schema drift

`apps/api/src/modules/identity/CONTEXT.md` describes domain invariants that don't match what S1 actually shipped in the schema:

| What CONTEXT.md says | What schema has | Direction |
|---|---|---|
| `User.role` values: `admin / owner / user` | `buyer / seller / moderator / admin` | CONTEXT.md is stale (pre-S1 future-state doc) |
| `Session` has `deviceId, userAgent, refreshTokenHash, lastSeenAt, revokedAt` | `Session` has `userId, refreshToken (PLAINTEXT), expiresAt, createdAt` | Both wrong — see §4.3 |
| `OwnedVehicle` has `brandId, modelId, generationId, year, color, vin, mileage, nickname, status, photoUrl, isPublic, linkedListingId` | `OwnedVehicle` has `userId, dealershipId, brand (String), model (String), year` | Schema is materially thinner than the documented invariant |
| `TotpEnrollment` model exists | Not in schema | Schema correctly omits (admin TOTP is Phase 2-ish) |

Per issue #7's instruction ("`apps/api/CONTEXT.md` and the per-context `CONTEXT.md` files already exist; do NOT modify them in this issue"), the CONTEXT.md files are baseline forward-looking specs predating S1 code. That's fine philosophically, but per CLAUDE.md ("Update the CONTEXT.md when domain invariants change. That file should always reflect today, not last quarter") they must converge before any S2 use-case lands.

### 4.3 Session refresh-token storage contradicts CLAUDE.md

`Session.refreshToken String @unique` is **plaintext**. CLAUDE.md is explicit: "NEVER store plaintext refresh tokens. Bcrypt-hash them in `User.refreshTokenHash` (your current pattern, kept)." The schema *also* has `User.refreshTokenHash String?` — so both columns exist, with the canonical-per-policy one (the hash) on `User` and a contradictory plaintext one on `Session`.

This needs a decision before S2 implements `VerifyOtp` / `RefreshSession`:
- **Option A (CLAUDE.md-aligned)**: Drop `Session.refreshToken`; store the bcrypt hash on `User.refreshTokenHash`. Session row tracks lifetime + device but not the token itself. Migration: `ALTER TABLE sessions DROP COLUMN refresh_token`.
- **Option B (revise CLAUDE.md)**: Keep `Session.refreshToken` but change it to a hash; drop `User.refreshTokenHash`; record the decision in an ADR. Session-bound tokens support multi-device sessions naturally.

The S2 sprint file already references "`User.refreshTokenHash` (bcrypt)" — so the de-facto plan is Option A. Document and migrate.

### 4.4 ADR drift

PR #21 (packages/db) effectively made several architectural choices that are not captured in any ADR:

- **Cross-context FKs at the DB level** (e.g., `Listing.sellerId → User.id`, `Dealership.cityId → City.id`, `Conversation.buyerId → User.id`). Per `packages/db/CONTEXT.md` these are "allowed" — but it's worth a tiny ADR or charter §21 entry codifying *which* cross-context FKs are intentional vs accidental.
- **`Session` model shape** (plaintext token, no device tracking, no soft-revoke) — see §4.3. Once the policy is resolved, the resulting model deserves a one-paragraph ADR or charter §21 entry.

PR #21 also dropped certain models from the issue spec (no `TotpEnrollment`, slim `OwnedVehicle`) without note. These were probably correct calls (TOTP is out-of-MVP, OwnedVehicle is S6 work) but should be acknowledged so future readers don't think they're missing.

### 4.5 Sprint file accuracy

- `docs/prd/sprints/sprint-01-scaffold.md` still says `**Status** | ⚪ Planned` at the top despite the sprint shipping. Should be 🟢 Shipped with the Shipped date.
- The AC checklist is unticked. Either tick the items that landed and annotate the one that didn't (S2 🟡 — see §4.1 / "S2 as 🟡 in progress" gap above), or leave them unticked and note in the retro that the file isn't being rewritten (per CLAUDE.md "Edit DoD/risks as understanding sharpens; never rewrite history").

### 4.6 Workflows: `unblock.yml` missing

`docs/agents/issue-tracker.md` (line 148) says: *"the `unblock` workflow (`.github/workflows/unblock.yml`, lands in S1's CI issue)..."*. Actual `.github/workflows/` contains only `ci.yml`, `bundle.yml`, `pr-checks.yml`. The `unblock` workflow was not implemented in issue #15 / PR #31.

This is low-priority because the issue-tracker doc itself notes "Optional automation; humans can do this manually with `gh issue edit <n> --remove-label "blocked"`." Either:
- Add the workflow as a small S2-adjacent task, or
- Update the docs to drop the reference / clarify it's deferred.

### 4.7 Roadmap drift

- ✅ S1 row is correctly marked 🟢 Shipped 2026-05-14.
- ✅ Shipped log entry exists (line 149).
- ✅ Current Sprint pointer is bumped to S2 ⚪ Pending.
- ❌ Parent issue #1 not closed → "sprint shipped" claim in the roadmap is one step ahead of the GitHub state.

### 4.8 Dependency / version drift

No silent version bumps detected between S1 start and end. All version changes were captured in ADR-0011 + charter §21. ✅

### 4.9 Test coverage

Not measured. S1 had effectively no domain/application code (it was scaffold), so the charter §13 70%-coverage threshold is not yet meaningful. Becomes binding starting S2.

## Prerequisites for sprint 2

### Hard blockers (must resolve before `/create-sprint-issues 2`)

1. **Reconcile `UserRole` between schema and contracts** (§4.1). Decide which value set is correct (likely the 6-value contracts set, since `dealer_owner` / `dealer_member` are real roles per charter §3 — and `super_admin` per charter §6.4). Update the other side. Likely path: keep contracts as the spec; update the Prisma enum + write a forward migration (since no production data exists, the migration is trivial).
2. **Reconcile `ListingStatus` between schema and contracts** (§4.1). Schema's 6-value set looks right (`draft / pending_review / active / sold / archived / rejected` is the moderation lifecycle the admin sprint S9 will need). Update contracts to match; this affects S4 not S2 but is cheap to fix now.
3. **Resolve `Session.refreshToken` plaintext column** (§4.3). Pick Option A or B; if A, write the drop-column migration; if B, write an ADR and update CLAUDE.md.
4. **Close parent issue #1** so GitHub state matches the roadmap.

### Soft prereqs (nice-to-have)

- Update `apps/api/src/modules/identity/CONTEXT.md` to reflect what S1 actually shipped (UserRole values, Session shape, OwnedVehicle thinness) so S2's first use-case isn't reading a stale spec.
- Update `docs/prd/sprints/sprint-01-scaffold.md` to mark Status 🟢 Shipped (per the "Sprint plans" row in CLAUDE.md docs table — *"Edit DoD/risks as understanding sharpens; never rewrite history"* — bumping the Status line is metadata, not history rewriting).
- Either implement `unblock.yml` (small) or remove the reference from `docs/agents/issue-tracker.md`.
- Add a brief ADR or charter §21 entry on intentional cross-context FK relationships (low priority — could wait until S3/S4 when this matters more).
- Re-run `pnpm install && pnpm typecheck && pnpm test` once before starting S2, since this retro relied on PR #32's verification and not a fresh run.

### Parallel action items from charter §19 relevant to S2

- **Item 4** — **Source first 1-2 OTP phones for development**. *Not blocking dev (mock driver suffices) but blocking the staging end-to-end-with-real-SMS demo described in S2's plan.* Plan: order at least one TM SIM + Android phone this week so it's available when S2 wants to validate the gateway driver path.
- **Item 8** — Account deletion endpoint (`DELETE /api/v1/me`). S2 already plans to ship this — confirmed in `sprint-02-identity.md` AC.
- **Item 7** — Privacy Policy + Terms of Service in RU/TK/EN. Not blocking S2 implementation, but app-store gate (S10).

## Proposed doc updates

The following changes should land before sprint 2 starts. Each is a separate commit so they can be reviewed individually.

- [ ] **Close parent issue #1** with a closing comment summarizing S1 shipped state.
- [ ] **Update `docs/prd/sprints/sprint-01-scaffold.md`** — Status line `⚪ Planned` → `🟢 Shipped`; add Shipped date.
- [ ] **Reconcile `packages/contracts/src/enums.ts` `ListingStatus`** to match schema (`draft / pending_review / active / sold / archived / rejected`).
- [ ] **Reconcile `packages/db/prisma/schema.prisma` `UserRole`** to match contracts (`buyer / seller / dealer_owner / dealer_member / admin / super_admin`), with a follow-on migration.
- [ ] **Decision + migration for `Session.refreshToken`** — likely drop column (CLAUDE.md Option A), with an ADR explaining the per-user-one-refresh model.
- [ ] **Update `apps/api/src/modules/identity/CONTEXT.md`** — align UserRole values, Session shape, OwnedVehicle thinness with shipped schema.
- [ ] **Resolve `unblock.yml`** — either add the workflow (small) or remove its mention from `docs/agents/issue-tracker.md`.

Of these, the first two are pure metadata closure (cheap). The next three are real S2 prereqs (schema + contracts + ADR). The CONTEXT.md update and `unblock.yml` resolution can wait but are best done before S2's first PR so S2 reviewers aren't staring at stale docs.

## Lessons for sprint 2

**Schema and contracts must be cross-checked at PR-time, not at end-of-sprint.** The two enum mismatches survived because the schema PR (#21) and the contracts PR (#22) were reviewed in isolation — no reviewer ran a diff of both enum sets side-by-side. For S2, the first PR that adds *any* enum used in both layers should include the side-by-side diff in the description, or a tiny test (`expect(Object.values(UserRole)).toEqual(prismaUserRoleValues)`) that fails when they drift.

**Forward-looking CONTEXT.md docs are a smell once code starts shipping.** The identity / listings / etc. CONTEXT.md files were written as design intent before any code existed. That was useful as a spec, but once a schema lands, the CONTEXT.md must converge to what's true today (per CLAUDE.md). S2 should establish the rhythm: every PR that touches a bounded context's `domain/` or `infrastructure/` updates that context's `CONTEXT.md` in the same PR. Reviewers should reject PRs that change invariants without touching CONTEXT.md.

**Sprint-closure should close the parent issue, not just bump the roadmap.** Issue #16's spec ("Final wiring + verification + roadmap S1 → 🟢") mentioned roadmap-bump but didn't mention closing parent #1. For S2's parent issue, the closing-slice spec should include `gh issue close <parent>` as an explicit AC item.

## Sign-off

After all "Proposed doc updates" above are applied (or explicitly skipped), run `/create-sprint-issues 2` to begin Sprint 2 — Identity (OTP).
