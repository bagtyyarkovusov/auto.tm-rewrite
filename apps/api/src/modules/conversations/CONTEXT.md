# conversations — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in [`docs/prd/features/35-conversations.md`](../../../../../docs/prd/features/35-conversations.md) (if present — otherwise inferred from PRD) and `docs/prd/sprints/sprint-07-conversations.md`.

## Purpose

Per-listing scoped 1:1 conversations between buyer and seller. Schema-only today; the full chat system (WebSocket transport, message send/read/delete, typing/presence, attachments) ships in S7.

## Owns (entities + tables)

- `Conversation` — id, listingId (FK → Listing, Cascade), buyerId (FK → User as "Buyer", Cascade), sellerId (FK → User as "Seller", Cascade), createdAt, updatedAt. Unique on `(listingId, buyerId)`. Index on `sellerId`.
- `ConversationParticipant` — id, conversationId (FK → Conversation, Cascade), userId (FK → User, Cascade), createdAt. Unique on `(conversationId, userId)`.
- `Message` — id, conversationId (FK → Conversation, Cascade), senderId (no FK constraint), kind (`MessageKind` enum: text | image | post_ref | system), body?, metadata? (JSON), createdAt. Index on `(conversationId, createdAt)`.

## Invariants (enforced today)

- A `Conversation` is uniquely identified by `(listingId, buyerId)` — only one conversation per buyer per listing (`@@unique([listingId, buyerId])`).
- `Conversation.sellerId` references a User. **Same-user-cannot-chat-themselves** is NOT enforced by schema; must be application-level in S7.
- `Message.kind` is one of text | image | post_ref | system.
- `Message.senderId` is NOT FK-constrained — messages survive if the sender user is deleted (dangling senderId, by design per identity/CONTEXT account-deletion scope).

## Module shape (today)

- `apps/api/src/modules/conversations/`:
  - `domain/`, `application/`, `infrastructure/` — empty
  - `presentation/conversations.controller.ts` — stub
  - `conversations.module.ts` — registers stub controller
- No WebSocket gateway, no Socket.IO server, no message send/read/delete handlers.

## Ports exposed

- (none today — S7 adds `ConversationsReadPort`)

## Ports consumed

- (none today)

## Shipped use-cases

- (none today)

## Events emitted

- (none today)

## Events consumed

- (none today)

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in the named sprint file:

- **S7 (Conversations)** — `docs/prd/sprints/sprint-07-conversations.md`. Owns:
  - Schema additions to `Conversation`: `lastMessageAt`, `lastMessageId?` for sort + preview
  - Schema additions to `ConversationParticipant`: `mutedAt?`, `lastReadAt?` for unread counts + mute UX
  - Schema additions to `Message`: `deletedAt?` for soft-delete (preserve chat history for disputes)
  - New `QuickReply` entity (system-defined seed list of localized canned replies: "Hello", "Is it still available?", "Can I see it today?", "Will you take ${price}?", ...)
  - `ConversationsReadPort` (`getConversationSummary`, `getUnreadCountForUser`)
  - WebSocket gateway on Socket.IO namespace `/ws/chat` with events: `message:send`, `message:received`, `message:read`, `typing:start`, `typing:stop`, `typing:peer`, `presence:peer`
  - Use-cases: `StartConversation`, `SendMessage`, `MarkAsRead`, `DeleteMessage`, `MuteConversation`, `BlockInConversation`
  - Application-level invariants: same-user-cannot-chat-themselves; conversation blocked if either user has blocked the other; soft-delete window (5 min after send)
  - Events emitted: `MessageSent` (primary, consumed by `notifications/` for push), `ConversationStarted`, `MessageDeleted`, `UserBlockedInConversation`
  - Events consumed: `ListingSold` (auto-emits system message), `UserSuspended` (archives conversations involving suspended user)
  - Ports consumed: `ListingsReadPort` (listing pinned card + post-ref), `IdentityReadPort` (user names + block check), `MediaUploadPort` (image attachments)

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Chat is its own bounded context
- [ADR-0002](../../../../../docs/adr/0002-stack.md) — Socket.IO + NestJS WebSocket gateway
- [ADR-0009](../../../../../docs/adr/0009-notifications.md) — `MessageSent` → push fan-out
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
