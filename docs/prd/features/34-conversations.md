# 34 — Conversations (chat)

## Summary

Buyer-to-seller contact scoped to a listing. The MLP beta ships a simple text thread so the market loop is observable. Report-from-thread is not part of S6 unless that sprint is explicitly reshaped; otherwise message reports ship with a later rich-chat/moderation bet. Rich chat — image messages, post-card messages, read receipts, typing, presence, Socket.IO realtime, quick replies, and push delivery — is a post-MLP bet.

## Why it exists

Phone calls don't leave a trail. Telegram conversations get lost across channels. Scams are easier when there's no audit. A native, listing-scoped chat:

- Keeps the conversation about the car (pinned listing card at top)
- Surfaces seller credibility (response time, tenure, PRO badge)
- Allows post-card sharing (Aman sends Maral "this car too?")
- Provides scam protection (admins can review reported conversations)
- Lets us measure: how many buyers contact sellers? how fast does the seller respond?

## What it does (user-visible behavior)

### Starting a conversation

1. Buyer taps "Message" on a listing detail
2. (If not authed) Login modal triggers; resume after OTP
3. Buyer enters first message OR taps a quick-reply chip
4. Conversation created in DB; `ConversationStarted` event fires
5. Both buyer and seller now see this thread in their Chat tab

### Inside a chat thread

- **Pinned listing card** at the top of the thread (Brand Model, Year, Price, thumb) — tapping it opens the listing
- Message list scrolls (newest at bottom)
- Composer at bottom: text input, attach (image), send button
- Quick-reply chips appear above the composer if the thread has 0 messages
- Typing indicator: "Илья is typing…" below messages
- Read receipt: small checkmarks under your own sent messages (sent / delivered / read)
- Last-seen: "был(а) в 14:32" under seller's name in header
- "Seller usually responds within 1 hour" hint shown if the seller has 5+ past conversations

### Cache + offline behavior

- TanStack Query owns conversation lists, message history pages, unread counts, and quick replies.
- Socket.IO owns realtime delivery. Incoming `message:new` / `message:read` events patch or invalidate the TanStack Query cache; reconnect triggers a reconciliation refetch.
- Typing and presence are ephemeral in-memory/socket state, not TanStack Query data and not persisted offline.
- Chat keeps a small durable outbox for messages/images that were already accepted by the composer but not confirmed by the server. It does not store full chat history offline in Phase 1.
- If the app is clearly offline, new sends are disabled. If a send was already attempted and then fails, it stays in the outbox with retry.
- Image attachments use the media upload path into the `chat-attachments` bucket. The local image is staged for preview/retry until the message is sent or discarded.

### Message types

- **Text** — up to 1000 chars, auto-link URLs
- **Image** — single image per message, ≤5 MB, client-compressed
- **Post-card** — embeds a Listing reference; tapping opens that listing. Auto-created when user shares a listing into the chat.
- **System** — auto-generated server messages ("Listing marked sold", "User blocked the conversation")

### Quick replies (auto.ru-style)

System-defined snippets, localized:
- "Здравствуйте"
- "Здравствуйте, ещё продаётся?" / "Is it still available?"
- "Когда могу посмотреть?" / "When can I see it?"
- "Возможен торг?" / "Open to negotiation?"
- "Будем на связи" / "Let's stay in touch"

Tap → fills the composer (editable before send).

### Block / report

- From the chat header menu (⋯): Block user, Report message
- Block → no further messages can be sent in either direction; existing history preserved for moderation
- Report → admin queue; original messages stay; admin can act
- MLP placement: report-from-thread is not part of S6/S7 unless S6 is explicitly reshaped. When shaped, Conversations owns message/report context, deleted-message behavior, and surrounding-message excerpts; Admin owns queue display, resolution, and audit.

### Delete a message

- Long-press own message → "Delete"
- Only allowed within 5 min of sending
- Renders as "Message deleted" placeholder (not silently removed)

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Chat list | Empty | "Start by messaging a seller" |
| Chat list | Has threads | Sorted by `lastMessageAt` desc; unread bold; muted threads dimmed |
| Chat thread | New (0 messages) | Show quick-reply chips above composer |
| Chat thread | Many messages | Infinite scroll up to load history |
| Chat thread | Other side typing | Dots animation under last message |
| Chat thread | Network offline | Yellow banner; new sends disabled; already-pending outbox items retry on reconnect |
| Chat thread | Listing sold | System message: "This listing was marked sold by the seller." Existing history remains readable; new contact/messages disabled in the MLP. |
| Chat thread | Listing banned | Banner: "This listing is no longer available." Existing history remains readable; new contact/messages disabled. |
| Chat thread | Participant suspended | Generic unavailable/account-restricted banner. Existing history remains readable; new contact/messages disabled. |
| Chat thread | Blocked | Banner: "You blocked this user." + Unblock button |
| Chat thread | Reported | Owner side: "Reported. We'll review." Banner. |
| Composer | Image attached | Preview thumbnail + remove × |
| Composer | Sending | Spinner on send button; disabled |
| Composer | Send failed | Red × with retry option |

## Data references

- `apps/api/src/modules/conversations/CONTEXT.md`
- `apps/api/src/modules/listings/CONTEXT.md` (post-card resolves via ListingsReadPort)
- `apps/api/src/modules/identity/CONTEXT.md` (block check via IdentityReadPort)
- WebSocket protocol: see Conversations CONTEXT events table

## Decisions

- [ADR-0001](../../adr/0001-architecture.md) — Conversations as bounded context
- [ADR-0002](../../adr/0002-stack.md) — Socket.IO via NestJS Gateway
- [ADR-0009](../../adr/0009-notifications.md) — Offline → FCM/APNS push
- [ADR-0027](../../adr/0027-mlp-beta-scope.md) — MLP beta scope; simple text contact first
- MLP moderation decision: S7 listing bans and user suspensions do not auto-close conversations. They make the affected listing/thread read-only for contact/message sends while preserving existing conversation history. Send/contact checks are synchronous against current listing status and user suspension state. S7 moderation events are not consumed by conversations, and S7 emits no conversation system messages from moderation; future system messages or thread policy changes require a shaped rich-chat/moderation sprint.
- Deferred report decision: message reports belong to the rich-chat/moderation bet. They should not be implemented by adding a generic S7 `message` report target until Conversations has a clear message deletion policy, context excerpt contract, and admin-visible privacy boundary.

## Phase

**Phase 1 MLP beta for simple text contact.** Rich realtime chat remains the target capability for a later bet.

## Out of scope

- Voice messages (not in MVP)
- Video messages (not in MVP)
- Group chat (3+ participants) — never planned
- E2E encryption — explicitly rejected (moderation > confidentiality for marketplace)
- Message reactions / emoji react — Phase 2 if users demand
- Auto-translate between locales — Phase 3 if ever
- Pinning specific messages within a thread — defer
- Voice / video calls — out of scope, never planned

## Open questions

- Post-MLP sold-listing follow-up: whether to allow messages after a sold event remains a rich-chat decision. MLP keeps sold listing threads readable but disables new contact/messages.
- Listing-card preview rendering in the WhatsApp share — handled via OG meta in public web (Feature 38)
- Response time SLA shown on seller profile — what threshold gets the "fast responder" badge?
