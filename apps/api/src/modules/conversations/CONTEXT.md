# conversations — CONTEXT

## Purpose

The chat system — the headline MVP feature. Per-listing scoped 1:1 conversations between buyer and seller, with text/image/post-card messages, read receipts, typing indicators, and presence.

## Owns (entities + tables)

- `Conversation` — id, listingId, buyerUserId, sellerUserId, createdAt, lastMessageAt, lastMessageId?
- `ConversationMember` — { conversationId, userId, mutedAt?, lastReadAt? } junction (composite PK)
- `Message` — id, conversationId, senderId, type (`text` / `image` / `post_ref` / `system`), text?, imageKey?, postRefListingId?, systemKind? (`conversation_started` / `listing_sold` / etc), sentAt, deletedAt?
- `QuickReply` — id, label, text (system-defined seed list: "Hello", "Is it still available?", "Can I see it today?", "Will you take ${price}?", etc., localized)

## Invariants

- A `Conversation` is uniquely identified by `(listingId, buyerUserId)` — only one conversation per buyer per listing
- `Conversation.sellerUserId` = the listing's `ownerUserId` at conversation creation time (frozen — does not change if listing ownership changes)
- A `Conversation` cannot exist for a listing the buyer themselves owns (can't message yourself)
- A `Conversation` cannot exist if either user has blocked the other (returns 403)
- `Message.senderId` must be `buyerUserId` or `sellerUserId`
- `Message.type='text'` → `text` is non-empty
- `Message.type='image'` → `imageKey` references a MinIO object
- `Message.type='post_ref'` → `postRefListingId` references a valid (any status) Listing
- `Message.type='system'` → server-generated, never user-sent
- Messages are **soft-delete only** (preserves chat history for disputes / audit). A deleted message renders as "Message deleted" in the UI.
- A `Conversation` cannot be deleted — only archived (set `lastMessageAt` very old) or muted by individual members

## Ports exposed

```ts
interface ConversationsReadPort {
  getConversationSummary(id): Promise<{ id, listingId, buyerUserId, sellerUserId, lastMessageAt } | null>
  getUnreadCountForUser(userId): Promise<number>
}
```

## Ports consumed

```ts
ListingsReadPort       // resolve listing summary for pinned card + post-card refs
IdentityReadPort       // resolve user + dealership names; check block status
MediaUploadPort        // for image attachments
```

## Events emitted

- `MessageSent` — primary event; consumed by `notifications/` for push delivery
- `ConversationStarted` — when a new conversation is created
- `MessageDeleted` — soft delete by sender (within 5 min of send)
- `UserBlockedInConversation` — when a user blocks another while in a chat

## Events consumed

- `ListingSold` — auto-emits a system message into open conversations: "This listing was marked sold"
- `UserSuspended` — closes (archives) all conversations involving the suspended user

## WebSocket events (Socket.IO namespace `/ws/chat`)

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `message:send` | `{ conversationId, type, text?, imageKey?, postRefListingId? }` |
| Server → Client | `message:received` | `Message` full object |
| Server → Client | `message:read` | `{ conversationId, userId, lastReadAt }` |
| Client → Server | `typing:start` | `{ conversationId }` |
| Client → Server | `typing:stop` | `{ conversationId }` |
| Server → Client | `typing:peer` | `{ conversationId, userId, isTyping }` |
| Server → Client | `presence:peer` | `{ conversationId, userId, lastSeenAt }` |

## Notable decisions

- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Chat is its own bounded context
- [ADR-0002](../../../../docs/adr/0002-stack.md) — Socket.IO + NestJS WebSocket gateway
- [ADR-0009](../../../../docs/adr/0009-notifications.md) — MessageSent → push fan-out
