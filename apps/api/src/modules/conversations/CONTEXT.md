# conversations — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). MLP contact scope lives in `docs/prd/sprints/sprint-06-contact-seller.md`. Rich chat target capability lives in [`docs/prd/features/34-conversations.md`](../../../../../docs/prd/features/34-conversations.md) and is post-MLP per [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md).

## Purpose

Per-listing scoped 1:1 conversations between buyer and seller. Schema-only today; the MLP beta ships simple text contact in S6. The full chat system (WebSocket transport, message read/delete, typing/presence, attachments) is post-MLP.

## Owns (entities + tables)

- `Conversation` — id, listingId (FK → Listing, Cascade), buyerId (FK → User as "Buyer", Cascade), sellerId (FK → User as "Seller", Cascade), createdAt, updatedAt. Unique on `(listingId, buyerId)`. Index on `sellerId`.
- `ConversationParticipant` — id, conversationId (FK → Conversation, Cascade), userId (FK → User, Cascade), createdAt. Unique on `(conversationId, userId)`.
- `Message` — id, conversationId (FK → Conversation, Cascade), senderId (no FK constraint), kind (`MessageKind` enum: text | image | post_ref | system), body?, metadata? (JSON), createdAt. Index on `(conversationId, createdAt)`.

## Invariants (enforced today)

- A `Conversation` is uniquely identified by `(listingId, buyerId)` — only one conversation per buyer per listing (`@@unique([listingId, buyerId])`).
- `Conversation.sellerId` references a User. **Same-user-cannot-chat-themselves** is NOT enforced by schema; must be application-level in S6.
- `Message.kind` is one of text | image | post_ref | system.
- `Message.senderId` is NOT FK-constrained — messages survive if the sender user is deleted (dangling senderId, by design per identity/CONTEXT account-deletion scope).

## Module shape (today)

- `apps/api/src/modules/conversations/`:
  - `domain/`, `application/`, `infrastructure/` — empty
  - `presentation/conversations.controller.ts` — stub
  - `conversations.module.ts` — registers stub controller
- No WebSocket gateway, no Socket.IO server, no message send/read/delete handlers.

## Ports exposed

- (none today — S6 adds the first simple conversation read/write surface)

## Ports consumed

- (none today)

## Shipped use-cases

- (none today)

## Events emitted

- (none today)

## Events consumed

- (none today)

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in the named sprint file or feature PRD:
- **S6 (Contact seller)** — `docs/prd/sprints/sprint-06-contact-seller.md`. Owns:
	  - Text-only per-listing thread creation and message send/list endpoints
	  - Use-cases: `OpenConversation`, `ListMyConversations`, `ListMessages`, `SendTextMessage`
	  - Application-level invariants: same-user-cannot-chat-themselves; participants only; archived/sold listing contact behavior explicit. When S7 activates `banned`, banned listing threads use the same read-only rule: no new contact or messages, existing history remains readable. If either participant is suspended, new contact/messages are also blocked while existing history remains readable.
	  - Private-beta launch-safety flag `CONTACT_ENABLED=false` blocks new conversation opens and message sends while conversation list/detail history remains readable. Disabled contact writes return HTTP 403 `FORBIDDEN` with `details.reason = "FEATURE_DISABLED"` and do not expose internal flag names.
	  - S7 moderation events are not consumed by `conversations/`; no conversation auto-close, worker side effect, or system message ships for listing bans or user suspensions in the MLP. Contact/message blocking is enforced by synchronous listing/user state checks.
  - No Socket.IO, no image messages, no post-card messages, no read receipts, no typing, no presence, no push, no report-from-thread unless S6 is explicitly reshaped before it starts

- **Post-MLP rich chat** — `docs/prd/features/34-conversations.md`. Owns:
  - Schema additions to `Conversation`: `lastMessageAt`, `lastMessageId?` for sort + preview
  - Schema additions to `ConversationParticipant`: `mutedAt?`, `lastReadAt?` for unread counts + mute UX
  - Schema additions to `Message`: `deletedAt?` for soft-delete (preserve chat history for disputes)
  - New `QuickReply` entity (system-defined seed list of localized canned replies: "Hello", "Is it still available?", "Can I see it today?", "Will you take ${price}?", ...)
  - `ConversationsReadPort` (`getConversationSummary`, `getUnreadCountForUser`)
  - WebSocket gateway on Socket.IO namespace `/ws/chat` with events: `message:send`, `message:received`, `message:read`, `typing:start`, `typing:stop`, `typing:peer`, `presence:peer`
  - Use-cases: `StartConversation`, `SendMessage`, `MarkAsRead`, `DeleteMessage`, `MuteConversation`, `BlockInConversation`
  - Application-level invariants: same-user-cannot-chat-themselves; conversation blocked if either user has blocked the other; soft-delete window (5 min after send)
  - Events emitted: `MessageSent` (primary, consumed by `notifications/` for push), `ConversationStarted`, `MessageDeleted`, `UserBlockedInConversation`
  - Events consumed: `ListingSold` (auto-emits system message). A post-MLP rich-chat bet may consume `ListingBanned`, `ListingUnbanned`, `UserSuspended`, or `UserUnsuspended` for system messages or thread policy changes, but only after explicit PRD coverage.
  - Ports consumed: `ListingsReadPort` (listing pinned card + post-ref), `IdentityReadPort` (user names + block check), `MediaUploadPort` (image attachments)

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Chat is its own bounded context
- [ADR-0002](../../../../../docs/adr/0002-stack.md) — Socket.IO + NestJS WebSocket gateway
- [ADR-0009](../../../../../docs/adr/0009-notifications.md) — `MessageSent` → push fan-out
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) — Simple text contact first; rich chat is post-MLP
