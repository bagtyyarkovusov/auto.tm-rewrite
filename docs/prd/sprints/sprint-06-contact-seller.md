# Sprint 6 — Contact seller

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 (MLP beta) |
| **Milestone** | M5 — I can contact the seller |
| **Demo audience** | Beta testers with real listings |
| **Estimated time** | ~1 week |

## Goal

Ship the simplest buyer-to-seller contact loop. A buyer can open a listing, send a text message about that listing, and the seller can respond in the app.

This is not the rich chat product from the old roadmap. The MLP version proves contact demand without Socket.IO, image messages, post-card messages, read receipts, typing indicators, presence, quick replies, or push delivery.

## User capability (the demo line)

> "I tap Message on a listing, log in if needed, send 'Is it still available?', and the seller can reply from their conversation list."

## Bounded contexts touched

- **Primary**: `conversations/` — simple per-listing text threads
- **Supporting**: `listings/` for listing summary cards; `identity/` for participant checks; mobile for thread UI

## Acceptance criteria (DoD)

- [ ] `POST /api/v1/conversations` creates or returns an existing conversation for `(listingId, buyerId, sellerId)`
- [ ] `GET /api/v1/conversations` lists the current user's conversations sorted by latest message
- [ ] `GET /api/v1/conversations/{id}/messages?cursor=` returns paginated text messages
- [ ] `POST /api/v1/conversations/{id}/messages` sends a text-only message, max 1000 chars
- [ ] Conversation responses include a compact listing card: brand, model, year, price, cover image
- [ ] Mobile listing detail Message CTA opens login when anonymous, then resumes into the contact flow
- [ ] Mobile conversation list and conversation detail render the text thread
- [ ] Sender sees optimistic local pending state, then confirmed or failed state
- [ ] Seller cannot message themselves through their own listing
- [ ] Archived/sold listing behavior is explicit: new contact disabled; existing threads remain readable. When S7 activates `banned`, banned listings follow the same read-only thread rule: no new contact or messages, existing history remains readable.
- [ ] No WebSocket gateway required in MLP; clients can refetch on screen focus and manual retry
- [ ] `conversations/CONTEXT.md` updated to describe the shipped simple thread model
- [ ] `docs/prd/03-roadmap.md` updated when S6 closes

## Tests required

- **Domain/application**: one conversation per `(listingId, buyerId)`, participant-only message send, no self-contact
- **Infrastructure**: repository round-trip for conversation and message pagination
- **Presentation**: e2e open conversation → send message → list messages
- **Mobile smoke**: anonymous Message CTA resumes after OTP; seller sees the thread

## Files this sprint creates / touches

```
apps/api/src/modules/conversations/
├── domain/
│   ├── Conversation.ts
│   └── Message.ts
├── application/
│   ├── OpenConversation.ts
│   ├── ListMyConversations.ts
│   ├── ListMessages.ts
│   └── SendTextMessage.ts
├── infrastructure/
│   ├── PrismaConversationRepository.ts
│   └── PrismaMessageRepository.ts
└── presentation/
    └── ConversationsController.ts

apps/mobile/app/conversations/index.tsx
apps/mobile/app/conversations/[id].tsx
apps/mobile/app/listings/[id].tsx
```

## References

- **PRD feature**: [`../features/34-conversations.md`](../features/34-conversations.md)
- **End-to-end flow**: [`../flows/62-buy-flow.md`](../flows/62-buy-flow.md)
- **ADRs**: [ADR-0027](../../adr/0027-mlp-beta-scope.md)

## Previous-sprint dependencies

- S2 — auth
- S4 — listings
- S5 — listing detail Message CTA

## No-gos

- No Socket.IO
- No image messages
- No post-card messages
- No read receipts
- No typing indicators
- No presence
- No quick replies
- No direct-message push yet
- No report-from-thread unless this sprint is explicitly reshaped before it starts
- No durable offline outbox beyond a pending/failed UI state for the current send
