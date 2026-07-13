# conversations — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). MLP contact scope lives in `docs/prd/sprints/sprint-06-contact-seller.md`. Rich chat target capability lives in [`docs/prd/features/34-conversations.md`](../../../../../docs/prd/features/34-conversations.md) and is post-MLP per [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md).

## Purpose

Per-listing scoped 1:1 conversations between buyer and seller. The MLP beta ships simple text contact in S6. S10 expands the application layer to support rich messages (text, image, post_ref), participant watermarks, unread counts, per-conversation mute, and own-message soft delete.

## Owns (entities + tables)

- `Conversation` — id, listingId (FK → Listing, Cascade), buyerId (FK → User as "Buyer", Cascade), sellerId (FK → User as "Seller", Cascade), createdAt, updatedAt, lastMessageAt?, lastMessageId?. Unique on `(listingId, buyerId)`. Index on `sellerId` and `lastMessageAt`.
- `ConversationParticipant` — id, conversationId (FK → Conversation, Cascade), userId (FK → User, Cascade), createdAt, mutedAt?, lastReadAt?, lastDeliveredAt?. Unique on `(conversationId, userId)`. Indexes on `(userId, lastReadAt)` and `(userId, lastDeliveredAt)`.
- `Message` — id, conversationId (FK → Conversation, Cascade), senderId (no FK constraint), kind (`MessageKind` enum: text | image | post_ref | system), body?, metadata? (JSON), createdAt, deletedAt?, clientMessageId?. Index on `(conversationId, createdAt)`. Partial unique on `(conversationId, senderId, clientMessageId)` (nulls are distinct).

## Domain layer

Pure TypeScript, no Nest decorators, no Prisma imports.

- `Conversation` — root entity. Immutable. Constructor enforces `buyerId !== sellerId` (self-contact rejection). `isParticipant(userId)` and `participantRoleOf(userId)` for access checks.
- `Message` — value object for all message kinds. Factory methods: `createText` (trims, rejects blank/>1000 chars), `createImage` (requires non-empty key), `createPostRef` (requires listingId plus a stable snapshot: brandId, modelId, displayPriceTmt, priceCurrency, status, optional year/coverMediaKey), `createSystem`, `fromExisting`. `markDeleted`, `redacted`, `isDeleted`, `canDelete` (own message, within 5-minute window).
- `types.ts` — `ConversationDomainError`, `CONVERSATION_ERROR_CODES`, `ParticipantRole`, `MessageKind`, `MessageMetadata`, `DELETE_WINDOW_MS`.

## Invariants (enforced today)

- A `Conversation` is uniquely identified by `(listingId, buyerId)` — only one conversation per buyer per listing (`@@unique([listingId, buyerId])`).
- **Same-user-cannot-chat-themselves** — enforced at domain layer in `Conversation` constructor and at application layer in `OpenConversation`.
- **Participant-only access** — `Conversation.isParticipant(userId)` returns `true` only for buyer or seller. Enforced by `ListMessages`, `SendTextMessage`, `SendMessage`, `UpdateWatermark`, `MuteConversation`, and `DeleteMessage`.
- **New contact restrictions** — `OpenConversation` rejects self-contact first (`FORBIDDEN` with `SELF_CONTACT_NOT_ALLOWED`), returns an existing conversation if one exists (regardless of subsequent listing state changes), then for new conversations rejects non-existent or banned listings (`NOT_FOUND`), sold/archived listings (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), and listings with `allowChat = false` (`FORBIDDEN` with `CHAT_DISABLED`). New contact is also blocked when either participant is suspended (`FORBIDDEN` with `USER_SUSPENDED` via `IdentityCheckPort.isSuspended`) and when either user has blocked the other (`FORBIDDEN` with `BLOCKED_BY_USER` or `USER_BLOCKED` via `IdentityReadPort.isUserBlockedBy`).
- **Send restrictions** — `SendTextMessage` and `SendMessage` block sends when the parent listing is unavailable (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), sold (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), archived (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), banned (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), has `allowChat = false` (`FORBIDDEN` with `CHAT_DISABLED`), or when the sender is not a participant (`FORBIDDEN` with `NOT_A_PARTICIPANT`). Send is also blocked when either participant is suspended (`FORBIDDEN` with `USER_SUSPENDED` via `IdentityCheckPort.isSuspended`) and when either user has blocked the other (`FORBIDDEN` with `BLOCKED_BY_USER` or `USER_BLOCKED` via `IdentityReadPort.isUserBlockedBy`). Existing history remains readable in all read-only states.
- **Post-reference send restrictions** — `SendPostRefMessage` enforces the same participant, parent-listing, suspension, and block guards as `SendMessage`. In addition, the referenced listing must be visible and `active` at send time; hidden, deleted, sold, archived, banned, or otherwise invisible referenced listings are rejected (`FORBIDDEN` with `LISTING_REFERENCE_NOT_VISIBLE`). The snapshot stored in `Message.metadata` is built from `ListingsReadPort.getListingSummary` and is immutable for the life of the message.
- **Post-reference degradation** — When messages are read through `ListMessages` or as a conversation's `lastMessage`, post-reference cards overlay a current `available` flag. The flag is `true` only when the referenced listing is still returned by `ListingsReadPort.getListingSummaries` with `status = active`; sold, archived, banned, deleted, or missing listings render `available: false`. The stored snapshot (brand/model/year/price/currency/cover/status at send time) remains intact so the card never breaks the thread.
- `Message.kind` is one of text | image | post_ref | system. S6 text messages persist as `kind = text`; S10 adds image and post_ref payloads through `SendMessage`.
- `Message.senderId` is NOT FK-constrained — messages survive if the sender user is deleted (dangling senderId, by design per identity/CONTEXT account-deletion scope).
- `Message` text is trimmed at creation; blank-after-trim and >1000 chars after trim are rejected by the domain layer.
- **Conversation activity update on send** — `PrismaConversationRepository.saveMessage` updates the parent `Conversation.updatedAt`, `lastMessageAt`, and `lastMessageId` in the same Prisma transaction as the message insert, so `ListMyConversations` sort by `updatedAt DESC` reflects the latest message.
- **Idempotent sends** — `SendMessage` accepts an optional `clientMessageId` scoped to `(conversationId, senderId, clientMessageId)`. A duplicate `clientMessageId` returns the existing message instead of creating a new row.
- **Soft delete** — `DeleteMessage` allows a sender to mark their own message deleted within 5 minutes of `createdAt`. Deleted messages are redacted (body/metadata null) when read through `listMessages` or as a conversation's `lastMessage`.
- **Watermarks** — `UpdateWatermark` updates `lastReadAt` and/or `lastDeliveredAt` for the authenticated participant; timestamps must move monotonically forward.
- **Unread count** — `ListMyConversations` returns `unreadCount` derived from the participant's `lastReadAt` and non-deleted messages from the other participant.
- **Mute** — `MuteConversation` sets or clears `ConversationParticipant.mutedAt` for the authenticated participant. Mute suppresses native push (push decision lives in `notifications/`, issue #244).

## Module shape (today)

- `apps/api/src/modules/conversations/`:
  - `domain/` — `Conversation.ts`, `Message.ts`, `types.ts`, `ports/ConversationRepository.ts`
  - `application/` — `OpenConversation.ts`, `ListMyConversations.ts`, `ListMessages.ts`, `SendTextMessage.ts`, `SendMessage.ts`, `SendPostRefMessage.ts`, `UpdateWatermark.ts`, `MuteConversation.ts`, `DeleteMessage.ts`, plus matching `.spec.ts` unit tests
  - `infrastructure/` — `PrismaConversationRepository.ts` (transactional conversation + participant persistence, message persistence with activity update, watermark/mute/delete/unread queries), `MessageMapper.ts` (Prisma row ↔ domain mapping + redaction), `PostRefSnapshotMapper.ts` (builds post-reference snapshots from `ListingSummary` and computes current availability)
  - `presentation/conversations.controller.ts` — authenticated `POST /api/v1/conversations`, `GET /api/v1/conversations`, `GET /api/v1/conversations/:id/messages`, `POST /api/v1/conversations/:id/messages`, `POST /api/v1/conversations/:id/messages/rich`, `POST /api/v1/conversations/:id/messages/post-ref`, `POST /api/v1/conversations/:id/watermark`, `POST /api/v1/conversations/:id/mute`, `DELETE /api/v1/conversations/:id/messages/:messageId`, plus health-check ping
  - `conversations.module.ts` — registers controller, use-cases, repository port, imports `ListingsModule` for `ListingsReadPort` and `IdentityModule` for `IdentityCheckPort` and `IdentityReadPort`
- No WebSocket gateway, no Socket.IO server — realtime path is issue #234+.

## Ports exposed

- `ConversationRepository` (`CONVERSATION_REPOSITORY`) — implemented by `PrismaConversationRepository`. Methods: `findById`, `findByListingAndBuyer`, `save`, `listForUser`, `listMessages`, `findMessageById`, `findMessageByClientMessageId`, `saveMessage`, `updateWatermark`, `getParticipantState`, `muteConversation`, `softDeleteMessage`, `countUnreadMessages`.

## Ports consumed

- `ListingsReadPort` (`LISTINGS_READ_PORT`) from `listings/` — used by `OpenConversation`, `ListMyConversations`, `SendTextMessage`, and `SendMessage` to validate listing state and embed listing card fields in responses.
- `IdentityCheckPort` (`IDENTITY_TOKENS.IdentityCheckPort`) from `identity/` — used by `OpenConversation`, `SendTextMessage`, and `SendMessage` to enforce suspended-user blocking when either participant is suspended.
- `IdentityReadPort` (`IDENTITY_READ_PORT`) from `identity/` — used by `OpenConversation`, `SendTextMessage`, and `SendMessage` for block checks (`isUserBlockedBy`).

## Shipped use-cases

- `OpenConversation` — for an authenticated buyer and a `listingId`, fetches the listing summary, rejects self-contact, returns an existing conversation if one exists, then validates the listing is active/chat-enabled and no block/suspension exists before creating the `Conversation` and its two `ConversationParticipant` rows.
- `ListMyConversations` — returns paginated conversations where the authenticated user is buyer or seller, sorted by `updatedAt DESC`. Embeds listing summaries, last message (redacted if deleted), and unread count.
- `ListMessages` — returns paginated messages for a conversation, participant-only. Existing history remains readable even when the listing is sold, archived, or unavailable. Deleted messages are redacted.
- `SendTextMessage` — creates and persists a text message in a conversation after validating participant status, current listing contactability, suspension, and block state. Updates conversation activity in the same transaction.
- `SendMessage` — rich-message send supporting text and image kinds with optional `clientMessageId` for idempotency. Same validation as `SendTextMessage`.
- `SendPostRefMessage` — dedicated post-reference send. Validates the referenced listing is active/visible, builds an immutable snapshot from `ListingsReadPort`, persists the message, and enforces the same participant/suspension/block guards as `SendMessage`.
- `UpdateWatermark` — updates `lastReadAt` and/or `lastDeliveredAt` for the authenticated participant with monotonic checks.
- `MuteConversation` — sets or clears `mutedAt` for the authenticated participant.
- `DeleteMessage` — soft-deletes the authenticated user's own message within the 5-minute window.

## Events emitted

- (none today — `MessageSent` and other events are post-#233)

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
| POST | `/api/v1/conversations/:id/messages/rich` | Required | `SendMessage` — body `{ kind, text?, metadata?, clientMessageId? }` |
| POST | `/api/v1/conversations/:id/messages/post-ref` | Required | `SendPostRefMessage` — body `{ metadata: { listingId }, clientMessageId? }` |
| POST | `/api/v1/conversations/:id/watermark` | Required | `UpdateWatermark` — body `{ lastReadAt?, lastDeliveredAt? }` |
| POST | `/api/v1/conversations/:id/mute` | Required | `MuteConversation` — body `{ muted }` |
| DELETE | `/api/v1/conversations/:id/messages/:messageId` | Required | `DeleteMessage` |

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in the named sprint file or feature PRD:
- **S6 (Contact seller) — shipped** — text-only per-listing thread creation and message send/list endpoints
- **S10 (Rich chat) — partially shipped** — rich message send/list, watermarks, unread counts, mute, soft delete. Remaining S10 chat slices (Socket.IO gateway, realtime send/ack, typing/presence, push decision/delivery, block/unblock UI, reports) live in child issues #234-#253.
- **Post-MLP rich chat** — `QuickReply` entity if shaped, `ConversationsReadPort`, Socket.IO namespace `/ws/chat`, events, and push consumers.

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Chat is its own bounded context
- [ADR-0002](../../../../../docs/adr/0002-stack.md) — Socket.IO + NestJS WebSocket gateway
- [ADR-0009](../../../../../docs/adr/0009-notifications.md) — `MessageSent` → push fan-out
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) — Simple text contact first; rich chat is post-MLP
