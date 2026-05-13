# 34 — Conversations (chat)

## Summary

The **headline MVP feature**. 1:1 chat between buyer and seller, scoped to a specific listing, with text/image/post-card messages, read receipts, typing, presence, and block-user. Real-time via Socket.IO; offline delivery via FCM/APNS push.

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
| Chat thread | Network offline | Yellow banner; composer disables send; queue locally + send on reconnect |
| Chat thread | Listing sold | System message: "This listing was marked sold by the seller." Composer remains but disabled (can re-enable for follow-up — TBD) |
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

## Phase

**Phase 1.**

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

- "Sold" state — chat fully closed, or can buyer still message? (Likely: stays open for "could you let me know if it falls through?" use case)
- Listing-card preview rendering in the WhatsApp share — handled via OG meta in public web (Feature 38)
- Response time SLA shown on seller profile — what threshold gets the "fast responder" badge?
