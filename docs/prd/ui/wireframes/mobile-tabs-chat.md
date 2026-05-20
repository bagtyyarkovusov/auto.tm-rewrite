# Wireframe — Mobile Chat / Messages Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/chat.tsx`

==============================================
WIREFRAME — Mobile Chat / Messages Tab
Platform: mobile
==============================================

## Purpose

Conversation list for buyer-seller messaging. Currently a stub empty state.

## ASCII wireframe

```text
┌────────────────────────────────────────────┐
│ Messages                                   │
├────────────────────────────────────────────┤
│                                            │
│        ◐ MessageSquare (56px, gray-400)    │
│                                            │
│       No messages yet                      │
│  Conversations with buyers and sellers     │
│  will appear here once messaging launches  │
│  in S7.                                    │
│                                            │
└────────────────────────────────────────────┘
```

## Numbered content blocks

1. **Screen title** — "Messages" (display font, 32px).
2. **Empty state** — Large `MessageSquare` icon (56px, `text-muted-foreground`), heading "No messages yet", body copy explaining messaging ships in S7.

## Customization preview

(none)

## Interactions

- Tap a conversation row (future) → push `/chat/[conversationId]`.
- Empty state is static.

## States

- **Loading**: `Skeleton` list while conversations load.
- **Empty**: empty state shown above.
- **Error**: inline retry "Could not load messages. Try again."
- **Offline**: cached conversation list if available; else empty state.
- **Authenticated-only**: anonymous users see "Sign in to see messages" with auth CTA.

## Content / copy

- Title: "Messages"
- Empty heading: "No messages yet"
- Empty body: "Conversations with buyers and sellers will appear here once messaging launches in S7."
- Anonymous CTA: "Sign in to see messages"
- Error: "Could not load messages. Try again."

## Open questions for /hifi-design

- Should the title be "Chat" (tab label) or "Messages" (screen title)? Design archive uses "Messages" for the screen title.

## Design archive mapping

- `app-shell.html` tab "Chat" content → `app/(tabs)/chat.tsx`.
