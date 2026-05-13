# Sprint 7 — Conversations (chat)

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | M5 — I can contact the seller |
| **Demo audience** | Beta testers (real listings, real chats) |
| **Estimated time** | ~1.5 weeks |

## Goal

Ship the headline feature: real-time 1:1 chat scoped per-listing, with text + image + post-card refs, read receipts, typing indicators, 5-min presence, block + report user, offline FCM delivery.

## User capability (the demo line)

> "I tap 'Contact seller' on a listing. A chat opens. I send 'Is it still available?' The seller types — I see the indicator — and replies with a photo + a card linking to another car they have. I read receipts both ways. If I close the app, the next message arrives as a push."

## Bounded contexts touched

- **Primary**: `conversations/` (full four-layer + Socket.IO gateway)
- **Supporting**: `notifications/FCM` for offline delivery (basic transport — full notifications module lands in S8); `identity/BlockedUser`; mobile + web chat UI

## Acceptance criteria (DoD)

### Backend
- [ ] `POST /api/v1/conversations` creates or returns existing conversation for `(listingId, buyerId, sellerId)` — unique
- [ ] `GET /api/v1/conversations` lists my conversations (paginated by last-message-at)
- [ ] `GET /api/v1/conversations/{id}/messages?cursor=` returns paginated messages (oldest-at-bottom for chat UX)
- [ ] `POST /api/v1/conversations/{id}/messages` sends a message: `{ kind: 'text'|'image'|'post_ref', text?, payload? }`
- [ ] `POST /api/v1/conversations/{id}/read` updates `lastReadAt` for the current user
- [ ] `POST /api/v1/conversations/{id}/typing` broadcasts a 5-second typing event
- [ ] `POST /api/v1/conversations/{id}/mute` toggles per-conversation mute
- [ ] `POST /api/v1/users/{id}/block` (in `identity/`) prevents new conversations + hides existing
- [ ] `POST /api/v1/users/{id}/report` files a moderation ticket (admin queue, S9)

### WebSocket (Socket.IO)
- [ ] Namespace `/ws/chat` requires JWT auth on handshake
- [ ] Rooms per conversation; user joins on `subscribe` event
- [ ] Server emits `message:new`, `message:read`, `typing`, `presence` events
- [ ] Redis adapter ready behind a config flag (single-instance prod for now; flip when scaling)

### Mobile + web
- [ ] Mobile chat list + chat detail with optimistic-send + retry-on-fail
- [ ] Web chat embedded in the listing detail page (collapsible panel)
- [ ] Image messages: same upload path as listing photos (presigned URL); inline display with lightbox
- [ ] Post-card messages: tap → opens that listing
- [ ] Quick replies on empty conversation: 3 pre-defined RU/TK/EN strings ("Is it still available?", "What's your best price?", "When can I see it?")

### Push (offline delivery)
- [ ] On `MessageSent` event, `notifications/` (basic version) checks if recipient has any active socket; if not, sends FCM/APNS push
- [ ] Push tap → app opens directly to the conversation
- [ ] Per-conversation mute respected
- [ ] `conversations/CONTEXT.md` + `identity/CONTEXT.md` (for BlockedUser) updated
- [ ] `docs/prd/03-roadmap.md` updated (S7 🟢, S8 🟡)

## Tests required (TDD mandatory)

- **Domain**: `MessageKind` predicates, `ConversationInvariants` (one per `(listingId, buyerId)`), `BlockedUser` denial, presence-TTL (5 min)
- **Application**: `OpenConversation`, `SendMessage` (per kind), `MarkAsRead`, `MuteConversation`, `BlockUser`, `ReportUser`
- **Infrastructure** (Testcontainers): repositories; Socket.IO event ordering (use `socket.io-client` in tests)
- **Presentation**: e2e covering REST + WS round-trip; reject when not a participant; reject when blocked

## Files this sprint creates / touches

```
apps/api/src/modules/conversations/
├── domain/
│   ├── Conversation.ts, Message.ts, MessageKind.ts, Presence.ts
│   └── ports/{ConversationRepository,MessageRepository,PresencePort,ConversationEventPublisher}.ts
├── application/
│   ├── OpenConversation.ts, ListMyConversations.ts, ListMessages.ts
│   ├── SendTextMessage.ts, SendImageMessage.ts, SendPostRefMessage.ts
│   ├── MarkAsRead.ts, BroadcastTyping.ts, MuteConversation.ts
├── infrastructure/
│   ├── PrismaConversationRepository.ts, PrismaMessageRepository.ts
│   ├── RedisPresenceAdapter.ts
│   └── EventEmitterConversationEventPublisher.ts
├── presentation/
│   ├── ConversationsController.ts          REST
│   ├── MessagesController.ts                REST
│   └── ChatGateway.ts                       Socket.IO @WebSocketGateway
└── conversations.module.ts

apps/api/src/modules/identity/application/{BlockUser,UnblockUser,ReportUser}.ts

apps/mobile/app/conversations/index.tsx, [id].tsx
apps/web/src/components/chat/{ChatPanel,MessageList,Composer}.tsx
```

## References

- **PRD feature**: [`../features/34-conversations.md`](../features/34-conversations.md)
- **End-to-end flows**: [`../flows/62-buy-flow.md`](../flows/62-buy-flow.md), [`../flows/63-share-listing-in-chat.md`](../flows/63-share-listing-in-chat.md)
- **Charter sections**: §7 (Chat — the headline MVP feature)

## Previous-sprint dependencies

- S2 — auth (chat is auth-only)
- S4 — Listings (conversations are per-listing)
- S6 — Garage/Dealership (chat surface appears on dealer pages too)

## Open questions / risks

- **Encryption**: charter §7 says plain TLS (no E2E). Moderation > confidentiality for a marketplace. Document this in privacy policy (S10 ops).
- **Presence TTL**: 5 min "online" window per charter. Use Redis with `EXPIRE` per user. If Redis hiccups, presence shows offline — acceptable degradation.
- **Image-message storage**: charter §11 says `chat-attachments` bucket separate from listing-photos. Respect this in MinIO bucket policies (different ACL).
- **Notifications coupling**: S7 wires the bare minimum push (one per message when offline). S8 layers categories, preferences, digests on top. Make sure the S7 emit point uses the same `notifications/PushPort` so S8 can interpose.
- **Socket reconnect under TM mobile data**: aggressive reconnect with backoff; test on real TM SIM in staging if available.
