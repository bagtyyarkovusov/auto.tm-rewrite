# notifications — CONTEXT

## Purpose

All push delivery + in-app notification feed + admin broadcast tooling. Responds to events from across the system and fans out via FCM/APNS (or the fallback transport).

## Owns (entities + tables)

- `PushToken` — id, userId, platform (`android` / `ios` / `web`), token, deviceId, registeredAt, lastUsedAt, invalidatedAt?
- `NotificationHistory` — id, recipientUserId?, recipientGroup?, category (enum), title, body, payload (JSON), sentByUserId? (admin-initiated), sentAt, deliveryDetails (JSON: per-token success/fail), totalRecipients, successfulDeliveries, failedDeliveries
- `NotificationPreference` — { userId, category, enabled, channel (`push` / `digest` / `none`) } — per-category opt-out config

## Categories (6 in MVP)

```ts
enum NotificationCategory {
  DIRECT_MESSAGE      // can only mute per-conversation, not globally
  SAVED_SEARCH_MATCH  // per-search opt-out
  LISTING_ACTIVITY    // favorites, views — digestable
  ADMIN_ANNOUNCEMENT  // per-announcement opt-out; "important" flag bypasses
  BLOG_ACTIVITY       // opt-in (default off)
  MARKETING           // opt-in (required by app store policy)
}
```

## Invariants

- A user MUST have at least one valid `PushToken` to receive push (otherwise notification goes to in-app feed only)
- `PushToken.invalidatedAt` set when FCM/APNS returns "token invalid"; token is then ignored
- `NotificationHistory` is append-only (never deleted; admin can hide from feed but row persists for audit)
- `NotificationPreference.channel = 'none'` means user gets neither push nor in-app entry for this category
- `DIRECT_MESSAGE` cannot be set to `enabled=false` — only per-conversation mute is allowed (UI enforces)

## Ports exposed

```ts
interface NotificationsDispatchPort {
  send(input: {
    recipientUserId: string
    category: NotificationCategory
    title: string
    body: string
    payload?: Record<string, unknown>
    deepLink?: string
  }): Promise<void>
}

interface PushPort {  // The transport abstraction (FCM, APNS, ntfy, test)
  send(deviceToken, payload): Promise<PushResult>
}
```

## Ports consumed

```ts
IdentityReadPort       // resolve user + check role (admin) for broadcasts
ListingsReadPort       // hydrate notification body for saved-search matches
```

## Events emitted

- `NotificationDelivered` (analytics)
- `NotificationFailed` (analytics + retry decisions)

## Events consumed

- `MessageSent` (from `conversations/`) — fires push to offline recipient
- `SavedSearchMatched` (from `subscriptions/`) — fires push (debounced)
- `ListingFavorited` (from `listings/`) — digestable activity push
- `ListingReported` — admin notification
- `DealershipVerified` — congrats push to dealership members

## Push transport selection

Env var `PUSH_TRANSPORT` selects the `PushPort` implementation:
- `fcm-apns` (default production) — both platforms via firebase-admin and APNS HTTP/2
- `ntfy` (fallback) — self-hosted, only triggers a limited foreground-style notification
- `test` (CI / dev) — in-memory, no real delivery

If FCM/APNS returns "token invalid" → mark `PushToken.invalidatedAt` and skip future sends.

## Notable decisions

- [ADR-0009](../../../../docs/adr/0009-notifications.md) — Dual-stack transport, 6 categories
- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Notifications is its own context
