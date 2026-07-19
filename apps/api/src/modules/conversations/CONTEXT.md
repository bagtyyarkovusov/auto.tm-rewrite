# conversations — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). MLP contact scope lives in `docs/prd/sprints/sprint-06-contact-seller.md`. Rich chat target capability lives in [`docs/prd/features/34-conversations.md`](../../../../../docs/prd/features/34-conversations.md) and is post-MLP per [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md).

## Purpose

Per-listing scoped 1:1 conversations between buyer and seller. S6 shipped simple text contact; S10 adds rich messages (text, image, post_ref), realtime delivery, participant watermarks, unread counts, per-conversation mute, block/unblock integration, message reports, and own-message soft delete.

## Owns (entities + tables)

- `Conversation` — id, listingId (FK → Listing, Cascade), buyerId (FK → User as "Buyer", Cascade), sellerId (FK → User as "Seller", Cascade), createdAt, updatedAt, lastMessageAt?, lastMessageId?. Unique on `(listingId, buyerId)`. Index on `sellerId` and `lastMessageAt`.
- `ConversationParticipant` — id, conversationId (FK → Conversation, Cascade), userId (FK → User, Cascade), createdAt, mutedAt?, lastReadAt?, lastDeliveredAt?. Unique on `(conversationId, userId)`. Indexes on `(userId, lastReadAt)` and `(userId, lastDeliveredAt)`.
- `Message` — id, conversationId (FK → Conversation, Cascade), senderId (no FK constraint), kind (`MessageKind` enum: text | image | post_ref | system), body?, metadata? (JSON), createdAt, deletedAt?, clientMessageId?. Index on `(conversationId, createdAt)`. Unique index on `(conversationId, senderId, clientMessageId)`; Postgres permits multiple null `clientMessageId` values.

## Domain layer

Pure TypeScript, no Nest decorators, no Prisma imports.

- `Conversation` — root entity. Immutable. Constructor enforces `buyerId !== sellerId` (self-contact rejection). `isParticipant(userId)` and `participantRoleOf(userId)` for access checks.
- `Message` — value object for all message kinds. Factory methods: `createText` (trims, rejects blank/>1000 chars), `createImage` (requires non-empty key), `createPostRef` (requires listingId plus a stable snapshot: brandId, modelId, displayPriceTmt, priceCurrency, status, optional year/coverMediaKey), `createSystem`, `fromExisting`. `markDeleted`, `redacted`, `isDeleted`, `canDelete` (own message, within 5-minute window).
- `types.ts` — `ConversationDomainError`, `CONVERSATION_ERROR_CODES`, `ParticipantRole`, `MessageKind`, `MessageMetadata`, `DELETE_WINDOW_MS`.

## Invariants (enforced today)

- A `Conversation` is uniquely identified by `(listingId, buyerId)` — only one conversation per buyer per listing (`@@unique([listingId, buyerId])`).
- **Same-user-cannot-chat-themselves** — enforced at domain layer in `Conversation` constructor and at application layer in `OpenConversation`.
- **Participant-only access** — `Conversation.isParticipant(userId)` returns `true` only for buyer or seller. Enforced by `ListMessages`, `SendTextMessage`, `SendMessage`, `SendPostRefMessage`, `UpdateWatermark`, `MuteConversation`, `DeleteMessage`, and `ValidateConversationAccess`.
- **New contact restrictions** — `OpenConversation` rejects self-contact first (`FORBIDDEN` with `SELF_CONTACT_NOT_ALLOWED`), returns an existing conversation if one exists (regardless of subsequent listing state changes), then for new conversations rejects non-existent or banned listings (`NOT_FOUND`), sold/archived listings (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), and listings with `allowChat = false` (`FORBIDDEN` with `CHAT_DISABLED`). New contact is also blocked when either participant is suspended (`FORBIDDEN` with `USER_SUSPENDED` via `IdentityCheckPort.isSuspended`) and when either user has blocked the other (`FORBIDDEN` with `BLOCKED_BY_USER` or `USER_BLOCKED` via `IdentityReadPort.isUserBlockedBy`).
- **Send restrictions** — `SendTextMessage` and `SendMessage` block sends when the parent listing is unavailable (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), sold (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), archived (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), banned (`FORBIDDEN` with `LISTING_NOT_CONTACTABLE`), has `allowChat = false` (`FORBIDDEN` with `CHAT_DISABLED`), or when the sender is not a participant (`FORBIDDEN` with `NOT_A_PARTICIPANT`). Send is also blocked when either participant is suspended (`FORBIDDEN` with `USER_SUSPENDED` via `IdentityCheckPort.isSuspended`) and when either user has blocked the other (`FORBIDDEN` with `BLOCKED_BY_USER` or `USER_BLOCKED` via `IdentityReadPort.isUserBlockedBy`). Existing history remains readable in all read-only states.
- **Post-reference send restrictions** — `SendPostRefMessage` enforces the same participant, parent-listing, suspension, and block guards as `SendMessage`. In addition, the referenced listing must be visible and `active` at send time; hidden, deleted, sold, archived, banned, or otherwise invisible referenced listings are rejected (`FORBIDDEN` with `LISTING_REFERENCE_NOT_VISIBLE`). The snapshot stored in `Message.metadata` is built from `ListingsReadPort.getListingSummary` and is immutable for the life of the message.
- **Post-reference degradation** — When messages are read through `ListMessages` or as a conversation's `lastMessage`, post-reference cards overlay a current `available` flag. The flag is `true` only when the referenced listing is still returned by `ListingsReadPort.getListingSummaries` with `status = active`; sold, archived, banned, deleted, or missing listings render `available: false`. The stored snapshot (brand/model/year/price/currency/cover/status at send time) remains intact so the card never breaks the thread.
- `Message.kind` is one of text | image | post_ref | system. S6 text messages persist as `kind = text`; S10 adds image payloads through `SendMessage` and listing-card payloads through `SendPostRefMessage`.
- `Message.senderId` is NOT FK-constrained — messages survive if the sender user is deleted (dangling senderId, by design per identity/CONTEXT account-deletion scope).
- `Message` text is trimmed at creation; blank-after-trim and >1000 chars after trim are rejected by the domain layer.
- **Image upload staging** — `PresignChatAttachmentUpload` issues a presigned MinIO PUT URL for a single image per call, scoped to the conversation (`chat-attachments/{conversationId}/{uuid}/original.{ext}`). It enforces participant-only access, a 5 MB size cap, and `image/jpeg`/`image/webp` content types. Suspended users are rejected.
- **Conversation activity update on send** — `PrismaConversationRepository.saveMessage` updates the parent `Conversation.updatedAt`, `lastMessageAt`, and `lastMessageId` in the same Prisma transaction as the message insert, so `ListMyConversations` sort by `updatedAt DESC` reflects the latest message.
- **Idempotent sends** — `SendMessage` accepts an optional `clientMessageId` scoped to `(conversationId, senderId, clientMessageId)`. A duplicate `clientMessageId` returns the existing message instead of creating a new row.
- **Soft delete** — `DeleteMessage` allows a sender to mark their own message deleted within 5 minutes of `createdAt`. Deleted messages are redacted (body/metadata null) when read through `listMessages` or as a conversation's `lastMessage`. Image messages lose their metadata (including the storage key) on redaction while the row is retained for audit/report context.
- **Watermarks** — `UpdateWatermark` updates `lastReadAt` and/or `lastDeliveredAt` for the authenticated participant; timestamps must move monotonically forward. `ListMyConversations` returns the peer's `lastReadAt` and `lastDeliveredAt` for each conversation as `peerLastReadAt` and `peerLastDeliveredAt`.
- **Unread count** — `ListMyConversations` returns `unreadCount` derived from the participant's `lastReadAt` and non-deleted messages from the other participant.
- **Mute** — `MuteConversation` sets or clears `ConversationParticipant.mutedAt` for the authenticated participant. Mute suppresses native push (push decision lives in `notifications/`, issue #244).
- **Realtime room join rules** — `ConversationGateway` on namespace `/ws/chat` accepts `conversation:join` and `conversation:leave` events. A socket may join `conversation:{conversationId}` only when its authenticated user is a participant, neither participant is suspended, and neither user has blocked the other. `ValidateConversationAccess` enforces these rules by reusing the same participant, suspension, and block checks as the HTTP write path. Joins are idempotent; explicit leave removes the socket from the room. Socket.IO automatically evicts disconnected sockets from all rooms.
- **Realtime watermark fanout** — `ConversationGateway` handles `message:delivered`, `message:read`, and `conversation:read` on `/ws/chat`, persists through `UpdateWatermark`, and fans out `watermark` to `conversation:{conversationId}`. Both participants receive the event and update their local watermark state without requiring a full refetch; HTTP refetch remains authoritative on reconnect.
- **Realtime delete fanout** — `ConversationGateway.handleDeleteMessage` accepts `message:delete` on `/ws/chat`, delegates persistence to `DeleteMessage`, and fans out `message:deleted` to `conversation:{conversationId}`. Both participants receive the event and update their local thread without requiring a full refetch; HTTP refetch remains authoritative on reconnect.
- **Realtime typing fanout** — `ConversationGateway` accepts ephemeral `typing:start` and `typing:stop` events on `/ws/chat`. It validates the payload through `ValidateConversationAccess` and broadcasts `typing:peer` to `conversation:{conversationId}` excluding the sender. No persistence; clients render a transient typing indicator and time it out independently.
- **Realtime presence fanout** — `ConversationGateway` sends chat-scoped `presence` events to `conversation:{conversationId}` when a peer joins (`online: true`) and leaves or disconnects (`online: false` with `lastSeenAt`: the `PresencePort` timestamp when available, otherwise the leave/disconnect time). A joining socket also receives the current presence state for the other participant. `notifications/` can use `PresencePort.getLastSeenAt` to build lock-screen-safe last-seen copy when the recipient is offline.

## Module shape (today)

- `apps/api/src/modules/conversations/`:
  - `domain/` — `Conversation.ts`, `Message.ts`, `types.ts`, and ports for persistence, mute state, report context, and message event publishing
  - `application/` — `OpenConversation.ts`, `ListMyConversations.ts`, `ListMessages.ts`, `SendTextMessage.ts`, `SendMessage.ts`, `SendPostRefMessage.ts`, `PresignChatAttachmentUpload.ts`, `UpdateWatermark.ts`, `MuteConversation.ts`, `DeleteMessage.ts`, `ValidateConversationAccess.ts`, plus matching `.spec.ts` unit tests
  - `infrastructure/` — `PrismaConversationRepository.ts` (transactional conversation + participant persistence, message persistence with activity update, watermark/mute/delete/unread queries), `MessageMapper.ts` (Prisma row ↔ domain mapping + redaction), `PostRefSnapshotMapper.ts` (builds post-reference snapshots from `ListingSummary` and computes current availability). Chat attachments are stored in the shared MinIO-backed `MediaStoragePort` (`listings/`); the `chat-attachments` bucket is created by `MinioMediaStorageAdapter`.
  - `presentation/conversations.controller.ts` — authenticated `POST /api/v1/conversations`, `GET /api/v1/conversations`, `GET /api/v1/conversations/:id/messages`, `POST /api/v1/conversations/:id/messages`, `POST /api/v1/conversations/:id/messages/rich`, `POST /api/v1/conversations/:id/messages/post-ref`, `POST /api/v1/conversations/:id/attachments/presign`, `POST /api/v1/conversations/:id/watermark`, `POST /api/v1/conversations/:id/mute`, `DELETE /api/v1/conversations/:id/messages/:messageId`, plus health-check ping
  - `presentation/gateways/ConversationGateway.ts` — Socket.IO namespace `/ws/chat`; handles `conversation:join`, `conversation:leave`, `message:send`, `message:delivered`, `message:read`, `conversation:read`, `message:delete`, `typing:start`, and `typing:stop` events; joins/leaves deterministic `conversation:{conversationId}` rooms after delegating authorization to `ValidateConversationAccess`; `message:send` reuses the `SendMessage` application use-case, acks the sender with the durable `MessageSummary` or a contract-shaped error, and fans out `message:new` to the conversation room. Watermark events persist through `UpdateWatermark` and fan out `watermark` to the room. Delete events persist through `DeleteMessage` and fan out `message:deleted` to the room. Typing events are ephemeral and fan out `typing:peer` to the room excluding the sender. Presence events (`presence`) are broadcast to the room when a peer joins, leaves, or disconnects, and sent to a joining socket on entry.
  - `conversations.module.ts` — registers controller, gateway, use-cases, and repository port; imports `EventEmitterModule` for `MessageEventPublisher`, `ListingsModule` for `ListingsReadPort`, `IdentityModule` for `IdentityCheckPort` and `IdentityReadPort`, and `RealtimeModule` for `PresencePort`. It exports `CONVERSATION_STATE_PORT` to `notifications/` and `CONVERSATION_REPORT_CONTEXT_PORT` to `admin/`.

## Ports exposed

- `ConversationRepository` (`CONVERSATION_REPOSITORY`) — implemented by `PrismaConversationRepository`. Methods: `findById`, `findByListingAndBuyer`, `save`, `listForUser`, `listMessages`, `findMessageById`, `findMessageByClientMessageId`, `saveMessage`, `updateWatermark`, `getParticipantState`, `getParticipantStatesForConversations`, `muteConversation`, `softDeleteMessage`, `countUnreadMessages`.
- `ConversationStatePort` (`CONVERSATION_STATE_PORT`) — implemented by `PrismaConversationRepository`. Methods: `isMuted(conversationId, userId)`. Exported so `notifications/` can read per-conversation mute state without direct repository access.
- `ConversationReportContextPort` (`CONVERSATION_REPORT_CONTEXT_PORT`) — implemented by `PrismaConversationRepository`. Methods: `getMessageReportContext({ conversationId, messageId })` and `isParticipant(conversationId, userId)`. Exported so `admin/` can validate message reporters and persist stable surrounding context without importing conversation persistence details.
- `MessageEventPublisher` (`MESSAGE_EVENT_PUBLISHER`) — implemented by `EventEmitterMessageEventPublisher`. Emits domain facts (e.g., `MessageSent`) via NestJS `EventEmitter2` so other bounded contexts (notifications) can react without direct imports.

## Ports consumed

- `ListingsReadPort` (`LISTINGS_READ_PORT`) from `listings/` — used by `OpenConversation`, `ListMyConversations`, `SendTextMessage`, and `SendMessage` to validate listing state and embed listing card fields in responses.
- `IdentityCheckPort` (`IDENTITY_TOKENS.IdentityCheckPort`) from `identity/` — used by `OpenConversation`, `SendTextMessage`, `SendMessage`, `ValidateConversationAccess`, and `PresignChatAttachmentUpload` to enforce suspended-user blocking when either participant is suspended.
- `IdentityReadPort` (`IDENTITY_READ_PORT`) from `identity/` — used by `OpenConversation`, `SendTextMessage`, `SendMessage`, and `ValidateConversationAccess` for block checks (`isUserBlockedBy`).
- `MediaStoragePort` (`MEDIA_STORAGE_PORT`) from `listings/` — used by `PresignChatAttachmentUpload` to generate presigned PUT URLs for `chat-attachments` objects.
- `PresencePort` (`PRESENCE_PORT`) from `realtime/` — used by `ConversationGateway` to read peer online state and `lastSeenAt` for chat-scoped presence fanout.

## Shipped use-cases

- `OpenConversation` — for an authenticated buyer and a `listingId`, fetches the listing summary, rejects self-contact, returns an existing conversation if one exists, then validates the listing is active/chat-enabled and no block/suspension exists before creating the `Conversation` and its two `ConversationParticipant` rows.
- `ListMyConversations` — returns paginated conversations where the authenticated user is buyer or seller, sorted by `updatedAt DESC`. Embeds listing summaries, last message (redacted if deleted), unread count, peer watermark timestamps (`peerLastReadAt`, `peerLastDeliveredAt`), and the viewer's own `mutedAt` participant state.
- `ListMessages` — returns paginated messages for a conversation, participant-only. Existing history remains readable even when the listing is sold, archived, or unavailable. Deleted messages are redacted.
- `SendTextMessage` — creates and persists a text message in a conversation after validating participant status, current listing contactability, suspension, and block state. Updates conversation activity in the same transaction and emits `MessageSent` for push evaluation.
- `SendMessage` — rich-message send supporting text and image kinds with optional `clientMessageId` for idempotency. Same validation as `SendTextMessage`. Emits `MessageSent` after persistence.
- `SendPostRefMessage` — dedicated post-reference send. Validates the referenced listing is active/visible, builds an immutable snapshot from `ListingsReadPort`, persists the message, emits `MessageSent`, and enforces the same participant/suspension/block guards as `SendMessage`.
- `PresignChatAttachmentUpload` — conversation-scoped presigned upload for a single image. Validates participant access, suspended-user state, content type (`image/jpeg`/`image/webp`), and 5 MB size cap. Returns `uploadUrl`, `key`, `expiresIn`, and `maxSizeBytes`.
- `UpdateWatermark` — updates `lastReadAt` and/or `lastDeliveredAt` for the authenticated participant with monotonic checks.
- `MuteConversation` — sets or clears `mutedAt` for the authenticated participant.
- `DeleteMessage` — soft-deletes the authenticated user's own message within the 5-minute window.
- `ValidateConversationAccess` — shared participant/suspension/block check used by the realtime gateway to authorize joining or leaving a `conversation:{conversationId}` room. Returns the `Conversation` on success; throws `NotFoundException` or `ForbiddenException` on failure.
- `ConversationGateway.handleSendMessage` — realtime text-send entry point on `/ws/chat`. Validates the socket payload, delegates persistence to `SendMessage`, idempotently returns the durable message for duplicate `clientMessageId` retries, and fans out `message:new` to the joined conversation room.
- `ConversationGateway.handleDeleteMessage` — realtime delete entry point on `/ws/chat`. Validates the socket payload, delegates persistence to `DeleteMessage`, and fans out `message:deleted` to the joined conversation room.
- `ConversationGateway.handleTypingStart` / `handleTypingStop` — ephemeral typing entry points on `/ws/chat`. Validate the conversation payload through `ValidateConversationAccess` and broadcast `typing:peer` to the room excluding the sender. No server-side persistence or state is kept.
- `ConversationGateway.handlePresenceOnJoin` / `handlePresenceOnLeave` / `handlePresenceOnDisconnect` — chat-scoped presence entry points. On join, the gateway broadcasts the joining user's online state to the room and sends the current peer presence state to the joining socket. On leave/disconnect, it broadcasts the leaving user's offline state plus `lastSeenAt` from `PresencePort` to the room.

## Events emitted

- `MessageSent` — fired by `SendTextMessage`, `SendMessage`, and `SendPostRefMessage` after a message is durably persisted. Payload: `{ event: "MessageSent", conversationId, messageId, senderId, recipientId, sentAt, messageKind, messageBody, messageMetadata, messageDeletedAt }`. Consumed by `notifications/` to evaluate direct-message push eligibility and build a lock-screen-safe preview.

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
| POST | `/api/v1/conversations/:id/attachments/presign` | Required | `PresignChatAttachmentUpload` — body `{ contentType, sizeBytes }` |
| POST | `/api/v1/conversations/:id/watermark` | Required | `UpdateWatermark` — body `{ lastReadAt?, lastDeliveredAt? }` |
| POST | `/api/v1/conversations/:id/mute` | Required | `MuteConversation` — body `{ muted }` |
| DELETE | `/api/v1/conversations/:id/messages/:messageId` | Required | `DeleteMessage` |

## WebSocket events (`/ws/chat` namespace)

| Event | Direction | Auth | Body / Response | Handler |
|---|---|---|---|---|
| `conversation:join` | Client → Server | Required (via middleware) | `{ conversationId: uuid }` | `ConversationGateway.handleJoin` → `{ ok: true, conversationId, room }` or `{ ok: false, code, message }` |
| `conversation:leave` | Client → Server | Required (via middleware) | `{ conversationId: uuid }` | `ConversationGateway.handleLeave` → `{ ok: true, conversationId, room }` or `{ ok: false, code, message }` |
| `message:send` | Client → Server | Required (via middleware) | text `{ conversationId, kind: "text", text, clientMessageId? }` or image `{ conversationId, kind: "image", metadata, clientMessageId? }` | `ConversationGateway.handleSendMessage` → `{ ok: true, message: MessageSummary }` or `{ ok: false, code, message }` |
| `message:delivered` | Client → Server | Required (via middleware + room membership) | `{ conversationId: uuid, lastDeliveredAt?: iso }` | `ConversationGateway.handleMessageDelivered` → persists `lastDeliveredAt` via `UpdateWatermark`, then broadcasts `watermark` |
| `message:read` | Client → Server | Required (via middleware + room membership) | `{ conversationId: uuid, lastReadAt?: iso }` | `ConversationGateway.handleMessageRead` → persists `lastReadAt` via `UpdateWatermark`, then broadcasts `watermark` |
| `conversation:read` | Client → Server | Required (via middleware + room membership) | `{ conversationId: uuid }` | `ConversationGateway.handleConversationRead` → persists `lastReadAt` via `UpdateWatermark` with the current time, then broadcasts `watermark` |
| `message:delete` | Client → Server | Required (via middleware) | `{ conversationId: uuid, messageId: uuid }` | `ConversationGateway.handleDeleteMessage` → `{ ok: true, messageId, conversationId, deletedAt }` or `{ ok: false, code, message }` |
| `message:new` | Server → Client | Required (via room membership) | `{ message: MessageSummary }` | Broadcast to `conversation:{conversationId}` after a successful `message:send` |
| `message:deleted` | Server → Client | Required (via room membership) | `{ messageId: uuid, conversationId: uuid, deletedAt: iso }` | Broadcast to `conversation:{conversationId}` after a successful `message:delete` |
| `watermark` | Server → Client | Required (via room membership) | `{ conversationId: uuid, userId: uuid, lastReadAt?: ISO8601, lastDeliveredAt?: ISO8601 }` | Broadcast to `conversation:{conversationId}` after a watermark event is persisted |
| `typing:start` | Client → Server | Required (via middleware + room membership) | `{ conversationId: uuid }` | `ConversationGateway.handleTypingStart` → broadcasts `typing:peer` |
| `typing:stop` | Client → Server | Required (via middleware + room membership) | `{ conversationId: uuid }` | `ConversationGateway.handleTypingStop` → broadcasts `typing:peer` |
| `typing:peer` | Server → Client | Required (via room membership) | `{ conversationId: uuid, userId: uuid, isTyping: boolean }` | Broadcast to `conversation:{conversationId}` excluding the sender |
| `presence` | Server → Client | Required (via room membership) | `{ conversationId: uuid, userId: uuid, online: boolean, lastSeenAt?: ISO8601 }` | Broadcast to `conversation:{conversationId}` when a peer joins, leaves, or disconnects; also sent to a joining socket on entry |

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), only capabilities not present in code belong here. Video/voice/group chat, arbitrary link previews, and a persisted/admin-managed `QuickReply` entity require a future shaped sprint; S10's quick replies are static localized mobile copy.

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Chat is its own bounded context
- [ADR-0002](../../../../../docs/adr/0002-stack.md) — Socket.IO + NestJS WebSocket gateway
- [ADR-0009](../../../../../docs/adr/0009-notifications.md) — `MessageSent` → push fan-out
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) — Simple text contact first; rich chat is post-MLP
