# conversations — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). MLP contact scope lives in `docs/prd/sprints/sprint-06-contact-seller.md`. Rich chat target capability lives in [`docs/prd/features/34-conversations.md`](../../../../../docs/prd/features/34-conversations.md) and is post-MLP per [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md).

## Purpose

Per-listing scoped 1:1 conversations between buyer and seller. The MLP beta ships simple text contact in S6. The full chat system (WebSocket transport, message read/delete, typing/presence, attachments) is post-MLP.

## Owns (entities + tables)

- `Conversation` — id, listingId (FK → Listing, Cascade), buyerId (FK → User as "Buyer", Cascade), sellerId (FK → User as "Seller", Cascade), createdAt, updatedAt, lastMessageAt?, lastMessageId?. Unique on `(listingId, buyerId)`. Index on `sellerId` and `lastMessageAt`.
- `ConversationParticipant` — id, conversationId (FK → Conversation, Cascade), userId (FK → User, Cascade), createdAt, mutedAt?, lastReadAt?, lastDeliveredAt?. Unique on `(conversationId, userId)`. Indexes on `(userId, lastReadAt)` and `(userId, lastDeliveredAt)`.
- `Message` — id, conversationId (FK → Conversation, Cascade), senderId (no FK constraint), kind (`MessageKind` enum: text | image | post_ref | system), body?, metadata? (JSON), createdAt, deletedAt?, clientMessageId?. Index on `(conversationId, createdAt)`. Partial unique on `(conversationId, senderId, clientMessageId)` (nulls are distinct).

## Domain layer (S6 — #168, #170)

Pure TypeScript, no Nest decorators, no Prisma imports.

- `Conversation` — root entity. Immutable. Constructor enforces `buyerId !== sellerId` (self-contact rejection). `isParticipant(userId)` and `participantRoleOf(userId)` for access checks.
- `Message` — value object for text-only messages. Constructor trims text, rejects blank-after-trim, caps at 1000 chars after trim, preserves internal line breaks.
- `types.ts` — `ConversationDomainError`, `CONVERSATION_ERROR_CODES`, `ParticipantRole`.

## Invariants (enforced today)

- A `Conversation` is uniquely identified by `(listingId, buyerId)` — only one conversation per buyer per listing (`@@unique([listingId, buyerId])`).
- **Same-user-cannot-chat-themselves** — enforced at domain layer in `Conversation` constructor and at application layer in `OpenConversation`.
- **Participant-only access** — `Conversation.isParticipant(userId)` returns `true` only for buyer or seller. Enforced by `ListMessages` and `SendTextMessage`.
- **New contact restrictions** — `OpenConversation` rejects self-contact first (`FORBIDDEN` with `SELF_CONTACT_NOT_ALLOWED`), returns an existing conversation if one exists (regardless of subsequent listing state changes), then for new conversations rejects non-existent or banned listings (`NOT_FOUND`), sold/archived listings (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), and listings with `allowChat = false` (`FORBIDDEN` with `CHAT_DISABLED`). New contact is also blocked when either participant is suspended (`FORBIDDEN` with `USER_SUSPENDED` via `IdentityCheckPort.isSuspended`).
- **Send restrictions** — `SendTextMessage` blocks sends when the referenced listing is unavailable (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), sold (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), archived (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), banned (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), has `allowChat = false` (`FORBIDDEN` with `CHAT_DISABLED`), or when the sender is not a participant (`FORBIDDEN` with `NOT_A_PARTICIPANT`). Send is also blocked when either participant is suspended (`FORBIDDEN` with `USER_SUSPENDED` via `IdentityCheckPort.isSuspended`). Existing history remains readable in all read-only states.
- `Message.kind` is one of text | image | post_ref | system. S6 messages are persisted as `kind = text`.
- `Message.senderId` is NOT FK-constrained — messages survive if the sender user is deleted (dangling senderId, by design per identity/CONTEXT account-deletion scope).
- `Message` text is trimmed at creation; blank-after-trim and >1000 chars after trim are rejected by the domain layer.
- **Conversation activity update on send** — `PrismaConversationRepository.saveMessage` updates the parent `Conversation.updatedAt` in the same Prisma transaction as the message insert, so `ListMyConversations` sort by `updatedAt DESC` reflects the latest message.

## Module shape (today)

- `apps/api/src/modules/conversations/`:
  - `domain/` — `Conversation.ts`, `Message.ts`, `types.ts`, `ports/ConversationRepository.ts`
  - `application/` — `OpenConversation.ts`, `ListMyConversations.ts`, `ListMessages.ts`, `SendTextMessage.ts`, plus unit tests (`OpenConversation.spec.ts`, `ListMyConversations.spec.ts`, `ListMessages.spec.ts`, `SendTextMessage.spec.ts`)
  - `infrastructure/` — `PrismaConversationRepository.ts` (transactional conversation + participant persistence, message persistence with activity update, and list queries)
  - `presentation/conversations.controller.ts` — authenticated `POST /api/v1/conversations`, `GET /api/v1/conversations`, `GET /api/v1/conversations/:id/messages`, `POST /api/v1/conversations/:id/messages`, plus health-check ping
  - `conversations.module.ts` — registers controller, use-cases, and `ConversationRepository` port binding; imports `ListingsModule` for `ListingsReadPort` and `IdentityModule` for `IdentityCheckPort`
- No WebSocket gateway, no Socket.IO server, no message read/delete handlers.

## Ports exposed

- `ConversationRepository` (`CONVERSATION_REPOSITORY`) — implemented by `PrismaConversationRepository`. Methods: `findById`, `findByListingAndBuyer`, `save`, `listForUser`, `listMessages`, `saveMessage`.

## Ports consumed

- `ListingsReadPort` (`LISTINGS_READ_PORT`) from `listings/` — used by `OpenConversation`, `ListMyConversations`, and `SendTextMessage` to validate listing state and embed listing card fields in responses.
- `IdentityCheckPort` (`IDENTITY_TOKENS.IdentityCheckPort`) from `identity/` — used by `OpenConversation` and `SendTextMessage` to enforce suspended-user blocking when either participant is suspended.

## Shipped use-cases

- `OpenConversation` — for an authenticated buyer and a `listingId`, fetches the listing summary, rejects self-contact first, returns an existing conversation if one exists (regardless of subsequent listing state changes), then for new conversations validates the listing is active and chat-enabled before creating the `Conversation` and its two `ConversationParticipant` rows.
- `ListMyConversations` — returns paginated conversations where the authenticated user is buyer or seller, sorted by `updatedAt DESC`. Embeds listing summaries via `ListingsReadPort`.
- `ListMessages` — returns paginated text messages for a conversation, participant-only. Existing history remains readable even when the listing is sold, archived, or unavailable.
- `SendTextMessage` — creates and persists a text message in a conversation after validating participant status and current listing contactability. Updates conversation activity in the same transaction.

## Events emitted

- (none today)

## Events consumed

- (none today)

## HTTP routes

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/api/v1/conversations/ping` | Public | Health check |
| POST | `/api/v1/conversations` | Required | `OpenConversation` — body `{ listingId }` |
| GET | `/api/v1/conversations` | Required | `ListMyConversations` — query `cursor?`, `limit?` |
| GET | `/api/v1/conversations/:id/messages` | Required | `ListMessages` — query `cursor?`, `limit?` |
| POST | `/api/v1/conversations/:id/messages` | Required | `SendTextMessage` — body `{ text }` |

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in the named sprint file or feature PRD:
- **S6 (Contact seller) — shipped** — `docs/prd/sprints/sprint-06-contact-seller.md`. Owns:
		- Text-only per-listing thread creation and message send/list endpoints
		- Use-cases: `OpenConversation`, `ListMyConversations`, `ListMessages`, `SendTextMessage`
		- Application-level invariants: same-user-cannot-chat-themselves; participants only; archived/sold/banned listing contact behavior explicit. Banned listings: no new contact or messages, existing history remains readable. If either participant is suspended, new contact/messages are also blocked while existing history remains readable.
		- S7 moderation events are not consumed by `conversations/`; no conversation auto-close, worker side effect, or system message ships for listing bans or user suspensions in the MLP. Contact/message blocking is enforced by synchronous listing/user state checks.
  - No Socket.IO, no image messages, no post-card messages, no read receipts, no typing, no presence, no push, no report-from-thread unless S6 is explicitly reshaped before it starts

- **Post-MLP rich chat** — `docs/prd/features/34-conversations.md`. Owns:
  - New `QuickReply` entity (system-defined seed list of localized canned replies: "Hello", "Is it still available?", "Can I see it today?", "Will you take ${price}?", ...) if shaped into a sprint
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
