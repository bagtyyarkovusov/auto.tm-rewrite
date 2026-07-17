# Sprint 10 — Rich chat + direct-message notifications + mobile polish — Retrospective

> Written by `/close-sprint 10` on 2026-07-17.
> Sprint started 2026-07-13; all 22 child issues were closed and the integrated sprint landed on `main` on 2026-07-17.
> **Closure status:** shipped. Integration PR [#256](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/256) is merged, the cross-workspace gate is green, and the host Expo gate passed.

## Execution shape

S10 ran as 21 feature slices through Sandcastle, followed by a synchronous stabilization and documentation slice (#253). Feature branches were reviewed and merged into `codex/s10-sandcastle-run`; #253 merged through [PR #255](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/255), then [PR #256](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/256) squash-merged the complete sprint to `main` as `9bbe069`.

GitHub's optional PR check remained queued because no runner picked it up. This is the repository's existing runner-availability condition, not a failing check; `main` is unprotected. The equivalent host gate was run before merge and passed all 17 tasks.

## Shipped vs planned

| Issue | Planned slice | Shipped evidence | Result |
|---|---|---|---|
| #232 | Rich-chat schema and contracts | Message kinds/metadata, participant watermarks and mute, token/history/report fields, shared Zod schemas, migrations | Shipped |
| #233 | Conversations application expansion | Rich send operations, idempotency, access/state ports, `MessageSent` publication | Shipped |
| #234 | Authenticated Socket.IO foundation | JWT socket auth, deterministic user rooms, presence tracking, opt-in Redis adapter | Shipped |
| #235 | Conversation rooms and join rules | Participant-validated join/leave gateway path | Shipped |
| #236 | Realtime text + recovery | Persist-before-ack send, `message:new`, `clientMessageId` dedupe, HTTP recovery | Shipped |
| #237 | Delivery/read and unread | Monotonic watermarks, unread reconciliation, mobile status rendering | Shipped |
| #238 | Typing and presence-lite | Ephemeral typing expiry and chat-scoped online/last-seen | Shipped |
| #239 | Image-message API | `chat-attachments` presign/validation and image-message persistence | Shipped |
| #240 | Mobile image messages | Picker/upload/send, image bubble and full-screen viewing | Shipped |
| #241 | Listing-reference API | `post_ref` validation, snapshots and unavailable-safe response shape | Shipped |
| #242 | Mobile listing-reference UI | Compact listing cards with listing-detail navigation and unavailable states | Shipped |
| #243 | Native push-token registration | Native FCM/APNS token registration/revocation; no Expo-token production dependency | Shipped |
| #244 | Notification decision/history | Online, mute, block and no-token suppression with persisted decision state | Shipped |
| #245 | Worker push delivery | Queue consumer, `PushPort`, test transport and invalid-token/failure handling | Shipped |
| #246 | Push deep links and mute | Conversation deep-link handling and per-conversation mute surface | Shipped |
| #247 | Block/unblock | One-way block controls, history preservation and push suppression | Shipped |
| #248 | Soft delete | Five-minute own-message delete, response redaction and `message:deleted` | Shipped |
| #249 | Message reports | Report submission, surrounding context, admin dismissal and sender suspension | Shipped |
| #250 | Quick replies | Static first-message replies localized in RU/TK/EN | Shipped |
| #251 | Chat UI polish | Stable list/thread/composer states, rich previews, reported/blocked/muted/offline/error handling | Shipped |
| #252 | Broad mobile polish | Launch-visible marketplace surfaces and state/copy cleanup across the requested mobile loop | Shipped |
| #253 | Stabilization and docs closeout | Cross-workspace verification, Expo alignment/export/simulator smoke, no-go scan, `CONTEXT.md` reconciliation | Shipped |

**Slice result:** 22/22 child issues closed. The 29 sprint-wide DoD items have implementation, test, documentation, or host-smoke evidence.

### Verification evidence

- `DATABASE_URL=... pnpm exec turbo run typecheck lint test:unit` for API, mobile, worker, contracts and database: **17/17 tasks passed**.
- Notable suites: API **115 files / 828 tests**, mobile **102 files / 849 tests**, contracts **4 files / 247 tests**, database **2 files / 18 tests**; worker checks passed.
- `expo install --check`: **Dependencies are up to date** after aligning the coordinated Expo SDK 55 patch set.
- Cleared iOS export: **3,529 modules bundled**.
- Expo Go simulator smoke: **3,690 modules bundled** and the Turkmen first-launch screen rendered on an iPhone 16e simulator without an application crash.
- Prisma migrations committed: `20260713000000_s10_rich_chat_foundation` and `20260713170000_add_notification_history_status`.
- Every repository `CONTEXT.md` is represented in `CONTEXT-MAP.md`; #253 corrected stale current-state descriptions and added the realtime entry.

### Verification boundary

Expo Go warns, as expected, that remote notifications require a development build. A live FCM/APNS delivery was not attempted because production push credentials and transport were explicitly outside S10. The locked sprint scope accepts `PUSH_TRANSPORT=test`; worker delivery/failure/token-invalidation tests and mobile deep-link tests cover that boundary. The host smoke verifies native boot, routing, localization and the launch surface, while the 849 mobile tests cover the rich chat and broader polish states.

## Drift findings

### `CONTEXT.md` drift

The feature waves left several current-state descriptions behind the implementation. #253 reconciled the root map and the API, admin, conversations, identity, notifications, realtime, mobile, worker, contracts and database documents. No aspirational S10 state remains in those files, and every current `CONTEXT.md` is indexed.

### Sprint file and scope drift

The implementation touched 254 files versus the sprint file's representative paths. Most extra paths are tests and component-level mobile polish inside the locked wildcards: 122 API files, 95 mobile files, 18 worker files, 10 contracts files and 5 database files. No new product area was introduced.

The no-go scan found no notification center/feed, saved-search delivery, broadcast tooling, Phase 2 inspection workflow, booking or payment implementation. The pre-existing inspection-report contract stub and future legal copy are not S10 scope creep.

### ADR and architecture drift

No new ADR is required. S10 implements the already-shaped decisions in ADR-0028 and ADR-0033 while preserving ADR-0019/0020 documentation rules. Domain code remains free of Prisma imports; cross-context application dependencies use the repository's established ports and events. Socket.IO delegates business decisions to application use-cases.

### Dependency drift

The sprint added the expected Socket.IO client, Expo Notifications, API BullMQ bindings and worker test script. No existing dependency received a major-version upgrade. Closeout aligned only the Expo SDK 55 patch versions reported by the official Expo CLI and regenerated the lockfile.

### GitHub bookkeeping drift

PR [#254](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/254) remained open even though its #232 content was already present in the integrated branch. It is superseded by #256 and should be closed, not merged. Parent issue #231 remained open with stale unchecked child boxes until formal closeout.

## Phase summary through M9

S1-S8 established the MLP beta substrate: identity, catalog, listings, discovery, seller contact, moderation and private-beta polish. S9 added the remote trust-wedge foundation while deferring the on-ground concierge pilot. S10 turns the original text contact loop into a rich, realtime and safety-aware conversation system with a direct-message push path, and brings the mobile surface to a coherent launch-polish baseline.

The code trajectory through M9 is complete. The next code sprint is intentionally **not named or shaped here**: Phase 2 uses a betting table, so the next sprint must follow observed beta/pilot needs rather than an invented S11 backlog.

## Prerequisites for the next shaped bet

### Hard prerequisite

- Hold the human betting-table decision and create a sprint artifact before creating implementation issues. There is no S11 sprint file today.

### Operational follow-ups, not S10 blockers

- Run the deferred S9b on-ground concierge inspection pilot when Turkmenistan presence or a trusted helper is available.
- Exercise real FCM/APNS delivery in a development/production build when push credentials and deployment infrastructure are ready.
- Resolve the repository-wide GitHub Actions runner availability before relying on PR checks as the only merge gate.

## Lessons

The dependency graph worked: a broad 22-slice sprint remained mergeable because schema/contracts and realtime foundations landed first, with rich-message, safety and notification lanes joining afterward. The stabilization slice was necessary; it caught coordinated Expo patch drift and documentation drift that individual feature reviews did not see.

The main process weakness was evidence fragmentation. Sandcastle comments recorded slice-level gates, while the sprint-wide host-only proof lived until #253. Future mobile sprints should make one closeout evidence file the explicit destination for Expo dependency checks, export, simulator smoke and any development-build-only boundary.

## Sign-off

S10 is shipped. Close superseded PR #254, update the sprint/roadmap status, check the parent rollup, and close #231. The next step is a human betting-table decision, not automatic S11 issue creation.
