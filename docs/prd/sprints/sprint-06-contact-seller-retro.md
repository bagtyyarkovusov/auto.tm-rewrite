# Sprint 6 — Contact seller — Retrospective

> Written by `/close-sprint 6` on 2026-06-08.
> Sprint shipped on 2026-06-07 (last S6 merge: `38f13c4` / `225b4fc`). Started 2026-06-06.

## Closure context (read first)

S6 was executed **AFK by the Kimi-Sandcastle orchestrator** ([ADR-0028](../../adr/0028-kimi-sandcastle-afk-orchestrator.md)), not via `/run-issue`. Slices landed as **direct branch merges to `main`** (e.g., `Merge branch 'sandcastle/issue-174-...'`), so there are **no GitHub PRs** for this sprint — the shipped-vs-planned reconciliation below maps child issues → merge commits instead of PRs.

The roadmap still shows S6 as 🟡 and the parent issue #167 is still OPEN. **This is intentional, not drift in the usual sense:** issue #174's final acceptance criterion explicitly says *"S6 remains 🟡 in `docs/prd/03-roadmap.md`; close-sprint owns the shipped transition."* The sandcastle reconciliation slice deliberately handed the roadmap flip + parent close to this command. So `/close-sprint` did **not** bail on the "parent OPEN / roadmap not 🟢" conditions — with **0 of 7 children open**, the sprint clearly shipped; the open parent + 🟡 row are the designed handoff state.

## Shipped vs planned

All 7 child issues (#168–#174) are CLOSED. Evidence is the merge commit(s) for each slice.

| Issue | Merge commit(s) | AC items | With evidence | Without evidence |
|-------|-----------------|----------|---------------|------------------|
| #168 conversation contracts + domain foundation | `de36f7a` (+`4bdd4cc` review) | 6 | 6 | 0 |
| #169 open + list conversations API | `697e13c` (+`62831ef` refactor) | 7 | 7 | 0 |
| #170 send + list text messages API | `9cdc2a3` (+`ca6b850` refactor) | 7 | 7 | 0 |
| #171 mobile conversation data hooks | `3403453` | 5 | 5 | 0 |
| #172 buyer opens listing thread + sends message | `ecb659c` | 7 | 7 | 0 |
| #173 seller conversation list | `00a5924` (+`9fdea0e` refactor) | 6 | 6 | 0 |
| #174 contact smoke + context reconciliation | `225b4fc` | 6 | 5 | 1 (Expo simulator gate evidence) |

**Total AC items:** 44
**With evidence:** 43
**Without evidence (gaps):** 1

Sprint-wide DoD (13 items in the sprint file): **12/13** have shipped evidence; the 13th ("roadmap updated when S6 closes") is the deferred-to-`/close-sprint` item, addressed by the remediation below.

### Gaps

- **#174 — Expo Go simulator gate not evidenced (the one real verification gap).** The AC asks that "host-only Expo simulator gate steps are recorded in the PR body if Sandcastle cannot run them." Sandcastle runs in Docker and cannot launch the iOS/Android simulator, and there is no PR body (direct merge) in which to record the deferral. Every automated layer is green — 52/52 conversations domain+application unit tests pass, mobile hooks/components ship with co-located specs — but the **human-owned Expo Go runtime smoke of the end-to-end contact flow has not been performed**. This is CLAUDE.md verification step 6 ("actually run the dev stack and try the feature") + the `docs/agents/mobile-expo.md` gate. **Remediation:** run the contact flow on a simulator/device (anonymous Message CTA → OTP → send "Is it still available?" → seller sees it in the Chat tab and replies) before demoing M5 to beta testers. Tracked as a soft prereq below, not a code defect.

## Drift findings

### CONTEXT.md drift
- **`apps/api/src/modules/listings/CONTEXT.md` — minor / borderline.** S6's only change to `ListingsReadPort` was adding `allowChat: boolean` to the `ListingSummary` DTO (commit `697e13c`) so `conversations/` can enforce `CHAT_DISABLED`. `listings/CONTEXT.md` was last updated 2026-06-06 by the S5 close (#165), not during S6, so it does not mention `allowChat` on the port DTO. **However**, that CONTEXT.md documents the port at the row level (name / symbol / file / consumers) and does **not** enumerate `ListingSummary` fields at all, so the granularity it tracks is technically intact, and it already lists "contact seller (S6)" as a consumer. Classified **low severity / optional** — a one-line note is proposed below but is reasonable to skip.
- **No other CONTEXT.md drift.** `conversations/CONTEXT.md` (updated 06-07, #174), `apps/mobile/CONTEXT.md` (06-07, #173), `packages/contracts/CONTEXT.md` (06-06, #168), and `apps/mobile/src/listings/CONTEXT.md` (06-07, #172) were all updated in-sprint and accurately describe shipped state. Inverse check passed: `conversations/CONTEXT.md` "Owns" lists `Conversation`, `ConversationParticipant`, `Message` — all present in `schema.prisma` (lines 463 / 482 / 494 + `MessageKind` enum at 456). No aspirational entities leaked into CONTEXT.

### ADR drift
- **None.** S6 shipped exactly to [ADR-0027](../../adr/0027-mlp-beta-scope.md) (simple text contact, no Socket.IO, no rich-chat fields). Commit messages are conventional `feat/fix/refactor` with no "decided X over Y" justifications that would signal an uncaptured decision. The two implementation choices worth noting (a `ConversationParticipant` join table; folding message persistence into `PrismaConversationRepository` rather than a separate `PrismaMessageRepository`) are in-context modeling details, well-documented in `conversations/CONTEXT.md`, not capability changes — no ADR required per [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md).

### Sprint file accuracy
- **Planned but not created:** `infrastructure/PrismaMessageRepository.ts` — message persistence was consolidated into `PrismaConversationRepository.ts` (`saveMessage` / `listMessages`), keeping one repository per aggregate. Reasonable consolidation, not a missing deliverable.
- **Naming/path deltas (cosmetic):** sprint file listed `presentation/ConversationsController.ts` → shipped as `conversations.controller.ts` (repo-wide Nest kebab-case convention); sprint file listed `apps/mobile/app/listings/[id].tsx` → shipped as `apps/mobile/app/(public)/listings/[id].tsx` (existing route group).
- **Done but not in the file list (all within the contact-seller demo line):** `domain/types.ts` (`CONVERSATION_ERROR_CODES`), `domain/ports/ConversationRepository.ts`, `conversations.module.ts`, `packages/contracts/src/schemas/conversations.ts`, the full `apps/mobile/src/conversations/components/*` set (ConversationList, ConversationListItem, ConversationListingCard, MessageBubble, MessageComposer, MessageList), `apps/mobile/src/api/conversations/*` hooks, `apps/mobile/app/(tabs)/chat.tsx` (Chat tab entry), `apps/mobile/app/conversations/open-listing.tsx` (anonymous-resume bridge), `apps/mobile/src/listings/components/ContactCtaBar.tsx`, and `ListingSummary.allowChat`. The sprint file's file list was a sketch; the implementation filled in the supporting contracts/hooks/components. Not concerning scope creep.

### Roadmap drift
- **Status:** S6 row is 🟡; should be 🟢 Shipped (2026-06-07). **Intentional** per #174 — this command owns the flip. → remediation below.
- **Shipped log:** no S6 entry yet. → remediation below.
- **Current Sprint pointer:** still S6; should bump to S7 (⚪ Pending). → remediation below.
- **Parent issue #167:** still OPEN. `/close-sprint` is not permitted to close issues (hard rule) — **manual action required by the user.** → listed under closure actions.

### Dependency / version drift
- **None.** No `package.json` or `pnpm-lock.yaml` changes in any S6 commit. S6 added **no Prisma migration** — the `Conversation` / `ConversationParticipant` / `Message` / `MessageKind` / `Listing.allowChat` models pre-existed (added in `#21` initial schema and S4 listings work), so S6 built entirely against pre-provisioned schema.

### Test coverage
- Coverage tooling (`@vitest/coverage-v8`) is **not installed** in the repo, so a numeric % could not be measured. Structural evidence is strong: **52/52** unit tests pass (`vitest run` on `conversations/domain` + `conversations/application`), with a co-located `.spec.ts` for every domain entity (`Conversation`, `Message`) and every use-case (`OpenConversation`, `ListMyConversations`, `ListMessages`, `SendTextMessage`), plus mobile hook/component specs. The application specs run with mocked ports (no Testcontainers), confirming clean hexagonal boundaries. No coverage red flags; consider adding `@vitest/coverage-v8` if a measured gate is wanted in future sprints.

### Architecture / complexity drift
- **Clean.** `conversations/domain/` is framework-free (no `@nestjs/*`, no Prisma) — the rg sweep only matched `application/` files, which legitimately use `@nestjs/common` for DI + HTTP exceptions (the established repo-wide pattern across `identity/`, `listings/`, etc.; not S6-specific).
- **Cross-context boundary respected.** `conversations/` reaches `listings/` only through the injected `ListingsReadPort` (importing the port interface + `LISTINGS_READ_PORT` token + `ListingSummary` DTO) — the sanctioned mechanism. `listings/CONTEXT.md` already documents `ListingsReadPort` as the cross-context contact-seller seam. No direct entity/use-case imports across contexts.
- **No pass-through abstractions, no `Manager`/`Helper`/`Wrapper` classes.** Use-cases are one-job-per-file. Mobile follows the locked `apiClient` + TanStack Query + query-key-factory pattern ([ADR-0015](../../adr/0015-mobile-data-fetching.md)).

## Prerequisites for sprint 7

### Hard blockers (must resolve before `/create-sprint-issues 7`)
- **None.** S7's `## Previous-sprint dependencies` are all satisfied: S2 (auth — OTP, Session, refresh, `User.role`, bearer JWTs), S4 (listings exist to moderate), and S6 (simple contact threads exist for ban/suspend enforcement). `conversations/CONTEXT.md` even pre-documents the S7 hooks (banned-listing + suspended-user read-only thread rule).

### Soft prereqs (nice-to-have)
- **Run the S6 Expo Go simulator smoke** (the one gap above) before the M5 demo to beta testers — it is S6 demo-readiness debt, not an S7 development blocker.
- **S7 operational setup (surfaced in the S7 sprint file, not from S6):** provision `TOTP_SECRET_ENCRYPTION_KEY` (required 32-byte base64, validated at API startup) and prepare the admin bootstrap path (`docs/prd/ops/86-admin-bootstrap-runbook.md` + `packages/db/scripts/promote-admin.ts`). These are net-new in S7; flagged here so they are not discovered mid-sprint.

### Parallel action items from charter §19 relevant to S7
- **Item 4 — "Source first 1-2 OTP phones for development."** S7 admin login reuses the OTP identity flow (then TOTP elevation), so a working OTP phone path matters for end-to-end admin auth testing. Confirm the dev OTP phone is available.
- Items 6/7/8 (Apple/Google accounts, Privacy Policy + ToS, account-deletion endpoint) are S8 (private-beta launch) concerns; account deletion already shipped (`DELETE /api/v1/me`, #49). Not S7 prerequisites.

## Proposed doc updates

The following should land before sprint 7 starts. Each is a separate commit so they can be reviewed individually.

- [ ] **Update `docs/prd/03-roadmap.md`** — flip S6 row to 🟢 Shipped (2026-06-07); set the "Current sprint" block to S7 (⚪ Pending, Started —); add an S6 entry to the Shipped log. *(The intended `/close-sprint` transition per #174.)*
- [ ] **(Optional, low severity) Update `apps/api/src/modules/listings/CONTEXT.md`** — note that `ListingSummary` (the `ListingsReadPort` DTO) now carries `allowChat`, consumed by `conversations/` for the `CHAT_DISABLED` rule. Reasonable to skip given the CONTEXT tracks the port at row granularity, not DTO fields.

No new ADR, no `GRILL-OUTCOME.md` §21 revision, and no `sprint-07-minimal-admin.md` edits are warranted (S7 spec is comprehensive and its S6 dependency is met).

### Closure actions outside this command's permissions
- [ ] **Close parent issue #167** ("Sprint 6 — Contact seller") — `/close-sprint` is not allowed to close issues; do this manually (`gh issue close 167`) once the roadmap remediation is merged.

## Lessons for sprint 7

The AFK/sandcastle path worked well for S6's bounded, well-specified scope: 7 vertical slices, clean hexagonal boundaries, thorough in-sprint CONTEXT.md updates, and a deliberate "context reconciliation" closeout slice (#174) that left exactly one thing for a human — the roadmap flip — and said so explicitly. That hand-off discipline is the model to keep. The single recurring blind spot is structural, not S6-specific: **sandcastle cannot run the Expo Go simulator, so every mobile-touching sprint accrues a human runtime-verification step that no automated gate covers.** S7 is mostly `api` + `admin` (Next.js) with a thin mobile report-entry surface, so the simulator debt is smaller — but the admin app introduces a *new* runtime surface (cookie/TOTP server-action auth) that unit tests won't fully exercise either. Plan an explicit human smoke of the admin auth + moderation flow at S7 close, the same way the S6 contact flow needs one now.

S7 is also the largest, most cross-context-correctness-sensitive sprint so far (admin moderation touching `admin/`, `listings/`, `identity/`, with transaction-scoped ports). The S6 evidence that cross-context ports stay clean under sandcastle is encouraging, but S7's `ListingsAdminPort` / `IdentityAdminPort` must participate in the `admin/`-owned transaction — watch that boundary closely in review, since a mocked-port unit test can pass while the real transaction scoping is wrong.

## Sign-off

After the "Proposed doc updates" above are applied (or explicitly skipped) **and** parent issue #167 is closed, run `/create-sprint-issues 7` to begin the next sprint.
