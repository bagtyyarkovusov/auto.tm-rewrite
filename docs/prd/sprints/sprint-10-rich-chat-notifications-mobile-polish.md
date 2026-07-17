# Sprint 10 - Rich chat + direct-message notifications + mobile polish

| | |
|---|---|
| **Status** | 🟢 Shipped 2026-07-17 (locked 2026-07-13) |
| **Phase** | Post-MLP marketplace bet |
| **Milestone** | M9 - Rich chat and launch polish |
| **Demo audience** | Founder local stack, two signed-in mobile users, and Sandcastle/AFK agents |
| **Estimated time** | Large parallel-agent sprint |
| **Issues** | GitHub parent [#231](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/231) + children [#232](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/232)-[#253](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/253) |

> **Why this sprint exists.** S8a shipped the product-complete beta substrate and S9a shipped the remote trust-wedge foundation. S9b remains an on-ground concierge inspection pilot, not a code sprint. S10 is the next remote code sprint: it turns text-only contact into rich marketplace chat, adds direct-message native push, and performs broad launch-visible mobile polish before wider deployment.

> **Closeout (2026-07-17).** All children #232-#253 are closed and the integrated sprint merged to `main` through [PR #256](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/256). The API/mobile/worker/contracts/database gate passed 17/17 tasks; Expo dependency validation, cleared iOS export, and an Expo Go simulator boot passed. Production FCM/APNS delivery remains a deployment follow-up, consistent with the locked `PUSH_TRANSPORT=test` closure boundary. See the [retrospective](sprint-10-rich-chat-notifications-mobile-polish-retro.md).

## Goal

Make AutoTM's buyer-seller communication feel real and launch-worthy: realtime text, images, listing-reference cards, delivery/read state, presence, typing, direct-message push, basic chat safety, and polished mobile surfaces across the marketplace loop.

## User capability (the demo line)

> "A buyer can message a seller in realtime, send an image and listing reference, see delivery/read state, get direct-message push when offline, report/block/delete unsafe chat content, and use the broader mobile app without obvious launch-polish rough edges."

## Bounded contexts touched

- **Primary**: `conversations/`, `notifications/`, `apps/mobile`
- **Supporting**: `identity/` (block/unblock), `admin/` (message reports), `apps/worker` (push delivery), `listings/` (listing-reference cards and upload reuse), `packages/db`, `packages/contracts`, docs

## Locked scope

- Rich Socket.IO chat with HTTP recovery.
- Text messages keep the existing 1000-char trim/blank rules and keep HTTP fallback.
- One-image messages through presigned upload to `chat-attachments`, 5 MB cap, no captions, no video, no albums.
- Listing-reference messages using `kind = post_ref` and `metadata.listingId`; no arbitrary link previews or external URL cards.
- Direct-message native push only: native FCM/APNS device tokens through `expo-notifications`, not Expo Push Tokens for production.
- API records and decides notification eligibility; worker delivers through `PushPort`; `PUSH_TRANSPORT=test` closes the sprint without production credentials.
- Socket-authenticated users join deterministic `user:{userId}` rooms; active chat screens join `conversation:{conversationId}` after participant validation.
- Socket.IO gateway calls application use-cases and does not own business rules.
- Redis adapter readiness behind config, while single-node mode remains default.
- Direct-message push is suppressed when the recipient is socket-online, muted, blocked, or has no valid token.
- Delivery/read tracking uses 1:1 participant watermarks (`lastDeliveredAt`, `lastReadAt`), not a per-message receipt table.
- Typing is ephemeral. Presence is chat-scoped online/last-seen only.
- Per-conversation mute suppresses native push but not in-app unread updates.
- One-way user-level block/unblock from chat using `BlockedUser`.
- Own-message soft delete within 5 minutes; rows are retained and normal responses redact body/media metadata.
- Message reports add `targetType = message` with surrounding context for admin review.
- Static localized quick replies for first-message UX.
- Broad launch-visible mobile polish across feed, filters, listing cards/detail, trust/condition/VIN/inspection CTA roughness, seller block, contact CTA, sell/edit flows, My Listings/Drafts, Favorites, Cabinet/Profile/Settings, empty/loading/error/offline states, and RU/TK/EN copy.

## Out of scope

- Full notification bell/feed, saved-search alerts, listing activity notifications, admin broadcasts, marketing/blog notifications, digests, quiet hours, or a full preference center.
- Phase 2 inspection reports, tier badges, PDF generation, booking/payment/inspector workflows.
- Video, voice, group chat, arbitrary link previews, external URL cards, blog cards, image albums, or chat captions by default.
- Admin redesign beyond message-report handling.
- Public web redesign, new mobile IA, new design system, store screenshots, or marketing assets.
- S9b on-ground pilot execution or S9b issue creation.

## Build order

1. **Shared schema/contracts** - Prisma migration and shared Zod contracts for message metadata, watermarks, mute/delete/idempotency, report target, push-token registration, and socket DTOs where useful.
2. **Conversations application layer** - rich message operations, idempotency, read/delivered, mute, delete, ports, and `MessageSent` fact/event.
3. **Realtime foundation** - authenticated Socket.IO infrastructure, user rooms, online tracking, Redis adapter readiness.
4. **Socket chat path** - conversation room join, realtime text send/ack/recovery, mobile Socket.IO integration.
5. **Parallel rich/safety lanes** - delivery/read, typing/presence, image messages, listing-reference messages, block/unblock, soft delete, reports, quick replies.
6. **Direct-message push lane** - token registration, notification decision/history, worker delivery, deep links and mute behavior.
7. **Polish and closeout** - chat UI polish, broad mobile polish, targeted tests, doc/CONTEXT closeout by implementation PRs.

## Acceptance criteria (DoD)

- [x] Socket.IO gateway authenticates JWT and rejects unauthenticated sockets.
- [x] Authenticated sockets join `user:{userId}`.
- [x] Active conversation sockets join `conversation:{conversationId}` only after participant validation.
- [x] Redis Socket.IO adapter can be enabled through config, while default single-node mode still boots.
- [x] Existing HTTP chat endpoints remain functional and tested.
- [x] Socket text send persists first, acks sender with the saved message, emits `message:new`, and dedupes by `clientMessageId`.
- [x] HTTP refetch recovers missed events after reconnect.
- [x] Delivery/read watermarks update monotonically and render in mobile.
- [x] Conversation unread count clears when opened.
- [x] Typing indicator works and auto-expires.
- [x] Chat-scoped online/last-seen works in chat surfaces only.
- [x] Image messages upload, persist, render as bubbles, open full-screen, and respect deleted/report semantics.
- [x] Listing-reference messages persist, render compact listing cards, and open listing detail, including sold/unavailable safe states.
- [x] Native push token registration stores native FCM/APNS tokens and does not rely on Expo Push Tokens for production.
- [x] Direct-message notification decision suppresses online, muted, blocked, and no-token cases.
- [x] Push worker test transport records a delivery attempt and handles failure/token invalidation shape.
- [x] Push tap deep-links to the conversation in mobile tests or smoke.
- [x] Per-conversation mute UI works and suppresses native push.
- [x] Block/unblock works from chat, preserves history, suppresses push, and does not reveal block state to the blocked user.
- [x] Own-message soft delete works within 5 minutes and emits `message:deleted`.
- [x] Message reports create admin-reviewable report detail with surrounding context.
- [x] Admin can dismiss message reports and suspend the message sender through existing moderation policy.
- [x] Static quick replies fill the composer and are localized RU/TK/EN.
- [x] Chat list/thread/composer/rich states pass the manual mobile chat checklist.
- [x] Broad mobile polish checklist passes across feed, filters, listings, sell/edit, favorites, cabinet/settings, empty/loading/error/offline states, and RU/TK/EN copy.
- [x] Relevant `CONTEXT.md` files are updated by implementation PRs when domain invariants, ports, events, routes, package structure, or Prisma fields change.
- [x] Prisma migration is committed if schema changes occur.
- [x] Contracts compile and consumers parse updated DTOs.
- [x] Mobile, API, worker, db, and contracts typechecks/tests pass as relevant to touched workspaces.

## Created child issue map

| Issue | Slice | Primary areas | Depends on | Mode |
|---|---|---|---|---|
| [#232](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/232) | Rich-chat schema and contract foundation | db, contracts | none | AFK |
| [#233](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/233) | Conversation application layer expansion | api | #232 | AFK |
| [#234](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/234) | Authenticated Socket.IO foundation | api | #232 | AFK |
| [#235](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/235) | Conversation room gateway and join rules | api | #233, #234 | AFK |
| [#236](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/236) | Realtime text send, ack, and HTTP recovery | api, mobile | #233, #234, #235 | AFK |
| [#237](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/237) | Delivery/read watermarks and unread counts | api, mobile | #232, #233, #236 | AFK |
| [#238](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/238) | Typing and presence-lite | api, mobile | #234, #235, #236 | AFK |
| [#239](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/239) | Image message upload API and persistence | api, contracts | #232, #233 | AFK |
| [#240](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/240) | Mobile image message send/render | mobile | #236, #239 | AFK |
| [#241](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/241) | Listing-reference message API | api, contracts | #232, #233 | AFK |
| [#242](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/242) | Mobile listing-reference message UI | mobile | #236, #241 | AFK |
| [#243](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/243) | Native push token registration | api, mobile, contracts | #232 | AFK |
| [#244](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/244) | Direct-message notification decision/history | api | #233, #234, #237, #243 | AFK |
| [#245](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/245) | Worker push queue and `PushPort` test transport | worker, api | #244 | AFK |
| [#246](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/246) | Push deep links and mute behavior in mobile | mobile | #243, #244, #245 | AFK |
| [#247](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/247) | User-level block/unblock from chat | identity, api, mobile | #232, #233, #236 | AFK |
| [#248](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/248) | Five-minute own-message soft delete | api, mobile | #232, #233, #236 | AFK |
| [#249](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/249) | Message reports with surrounding admin context | admin, api, mobile, contracts | #232, #233, #236, #248 | AFK |
| [#250](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/250) | Static quick replies for first chat message | mobile | #236 | AFK |
| [#251](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/251) | Chat UI polish | mobile | #236-#250 chat slices | AFK |
| [#252](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/252) | Broad launch-visible mobile polish | mobile | #232 | AFK |
| [#253](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/253) | S10 stabilization and docs/CONTEXT closeout | docs, mobile, api, worker, contracts, db | #233-#252 | AFK |

Only [#232](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/232) is initially unblocked. The remaining child issues carry `blocked` until their `Depends on` issues close.

## Tests required

- **Conversations domain/application**: text/image/post_ref send, idempotent retry, participant validation, block, mute, delivered/read, delete.
- **API e2e/integration**: HTTP fallback, socket auth/join/send, message report flow, notification decision, push-token registration, admin report detail.
- **Worker unit tests**: push processor with test `PushPort`, failure/invalid-token shape.
- **Mobile source/component tests**: socket cache reconciliation, message kind renderers, image/post-card bubbles, delivery/read states, mute/block/delete/report states, quick replies, deep-link handler.
- **Typechecks**: contracts, db generation, API, worker, mobile.
- **Manual mobile gate**: Expo dependency check and simulator/device smoke after mobile PRs merge, per `docs/agents/mobile-expo.md`.

## Files this sprint creates / touches

```
packages/db/prisma/schema.prisma
packages/db/prisma/migrations/*
packages/db/CONTEXT.md
packages/contracts/src/schemas/conversations.ts
packages/contracts/src/schemas/notifications.ts
packages/contracts/src/schemas/admin.ts
packages/contracts/src/enums.ts
packages/contracts/CONTEXT.md
apps/api/src/main.ts
apps/api/src/env.schema.ts
apps/api/CONTEXT.md
apps/api/src/modules/conversations/*
apps/api/src/modules/conversations/CONTEXT.md
apps/api/src/modules/notifications/*
apps/api/src/modules/notifications/CONTEXT.md
apps/api/src/modules/admin/*
apps/api/src/modules/admin/CONTEXT.md
apps/api/src/modules/identity/*
apps/api/src/modules/identity/CONTEXT.md
apps/api/src/modules/listings/*
apps/worker/src/*
apps/worker/CONTEXT.md
apps/mobile/package.json
apps/mobile/app/_layout.tsx
apps/mobile/app/(tabs)/chat.tsx
apps/mobile/app/conversations/[id].tsx
apps/mobile/src/api/conversations/*
apps/mobile/src/api/notifications/*
apps/mobile/src/conversations/components/*
apps/mobile/src/i18n/resources.ts
apps/mobile/CONTEXT.md
apps/mobile/src/listings/CONTEXT.md
docs/prd/sprints/sprint-10-rich-chat-notifications-mobile-polish.md
docs/prd/03-roadmap.md
```

## References

- **Features**: [34 - Conversations](../features/34-conversations.md), [36 - Notifications](../features/36-notifications.md), [35 - Saved searches](../features/35-subscriptions.md), [40 - Admin Dashboard](../features/40-admin.md)
- **Flows/Ops**: [65 - Admin moderation flow](../flows/65-admin-moderation.md), [84 - Launch plan](../ops/84-launch-plan.md), [85 - Launch analytics and scaling plan](../ops/85-launch-analytics-plan.md)
- **Roadmap**: [03-roadmap.md](../03-roadmap.md)
- **Current state**: [CONTEXT-MAP.md](../../../CONTEXT-MAP.md), [conversations CONTEXT](../../../apps/api/src/modules/conversations/CONTEXT.md), [notifications CONTEXT](../../../apps/api/src/modules/notifications/CONTEXT.md), [mobile CONTEXT](../../../apps/mobile/CONTEXT.md), [worker CONTEXT](../../../apps/worker/CONTEXT.md)
- **Doc rules**: [ADR-0019](../../adr/0019-context-md-describes-current-state.md), [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md)
- **Library docs**: [documentation-lookups.md](../../agents/documentation-lookups.md)

## No-gos

- Do not implement the full notification platform while building direct-message push.
- Do not move saved-search match notifications into S10.
- Do not build Phase 2 inspection-report, PDF, tier, booking, payment, or inspector workflows.
- Do not edit `CONTEXT.md` for aspirational S10 state.
- Do not bypass application-layer chat invariants from Socket.IO.
- Do not put push delivery in the chat request path.
- Do not make broad mobile polish an IA redesign.
