# Conversations

Conversations owns per-listing buyer/seller threads and message behavior. Realtime owns socket infrastructure; Notifications owns push eligibility. Changes to message creation can affect HTTP, sockets, notifications, and audit/report context.

Participant access, listing availability, suspension, and blocking are enforced at the application boundary. Existing history can remain readable when new contact or sends are forbidden. Do not collapse these into one generic availability check.

A Conversation summary carries the other participant (`peer`: id and display name, `null` when the User has none or no longer exists) and `blockedByMe`, true only when the viewer blocked the peer; whether the peer blocked the viewer is never exposed. Names and block states for a page come from the identity public port in one batched read each (`application/ConversationPeers.ts`), not one call per row. No phone, email or other Sign-in Method data crosses this boundary.

The shared send path preserves idempotence across retries and transports. A repeated client message must not create another message or republish its event. Listing-reference messages retain the original snapshot while read paths compute current availability. Deleted messages are redacted for readers while retained for audit context; deletion has a limited owner window.

Watermarks advance monotonically. HTTP refetch remains authoritative after reconnect. A socket room name does not grant access: conversation joins must validate the participant and applicable restrictions. Keep image staging, message persistence, and fanout as separate failure boundaries.

## Start here

- [Module composition](conversations.module.ts)
- [Shared send policy](application/ConversationSendPolicy.ts)
- [Send path and tests](application/SendConversationMessage.ts)
- [Application behaviors and tests](application)
- [Socket and HTTP integration](presentation)
- [Persistence](infrastructure)
- [Product requirements](../../../../../docs/prd/features/34-conversations.md)
- [Schema](../../../../../packages/db/prisma/schema.prisma)
