# ADR-0009: Push notifications (FCM + APNS + fallback)

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

The MVP centers on chat and notifications. Push delivery to mobile devices when the app is backgrounded is critical — users must know about new messages and saved-search matches.

FCM (Android) and APNS (iOS) are the standard channels. Both have been verified reachable from our TM VM provider. But:

- We may need to switch providers or run a self-hosted fallback if connectivity changes
- Different events warrant different notification policies (some are urgent, some can be batched, some are opt-out)
- The mobile app should also receive events in real-time when foregrounded — via the WebSocket connection

## Decision

### Transport: FCM + APNS happy path, fallback abstraction kept

Primary path:
- Android: FCM (server submits to `fcm.googleapis.com`)
- iOS: APNS HTTP/2 (server submits to `api.push.apple.com`)

Both use `firebase-admin` SDK from `apps/api` and `apps/worker`.

A `PushPort` interface abstracts the transport:

```ts
interface PushPort {
  send(deviceToken: string, payload: PushPayload): Promise<PushResult>
}
```

Implementations:
- `FcmPushAdapter` — production
- `ApnsPushAdapter` — production iOS
- `NtfyPushAdapter` — fallback (ntfy.sh-style self-hosted, only used if FCM/APNS prove unreliable)
- `InMemoryPushTest` — tests + dev

Selection via env var `PUSH_TRANSPORT=fcm|apns|ntfy|test`.

### In-app delivery (foreground)

When the user has the app open, events flow over the existing chat WebSocket (Socket.IO). The push transport is for *backgrounded* delivery only. This means:

- Foreground notification = WebSocket event → in-app banner
- Background notification = FCM/APNS push → OS notification tray

### Categories — 6 in MVP

| Category | Default | Opt-out granularity |
|---|---|---|
| Direct messages | ON | Per-conversation mute only (cannot disable globally) |
| Saved-search matches | ON | Per-saved-search |
| Listing activity (favorites, views) | ON | Daily-digest-only option |
| Admin announcements | ON | Per-announcement (admins can flag "important" → bypass mute) |
| Blog activity | OFF by default | Opt-in |
| Marketing | OFF by default | Opt-in (required by app store policies for marketing pushes) |

User preferences stored in `notifications.NotificationPreference` keyed by `{userId, category}`.

### Saved-search match notifications

Triggered by `ListingCreated` domain event. `subscriptions/` queries Postgres for matching searches, fans out to `notifications/` per match. Rate-limited:

- Max **1 notification per saved-search per hour**, bundled into a digest
- Stored debounce state: `SavedSearch.lastNotifiedAt`

### History + in-app feed

Every push fires also writes a `NotificationHistory` row. The mobile and admin apps render an in-app feed from this table. Admin can re-send, view delivery stats, export.

### Delivery model

1. `MessageSent` event fires
2. `notifications/` handler:
   - Persists in-app feed entry
   - Checks recipient's online status via Socket.IO room presence
   - If online: WebSocket-only (no push, avoid duplicate buzz)
   - If offline: enqueue FCM/APNS push job in BullMQ
3. Worker picks job, sends push, updates `NotificationHistory.deliveryDetails`

## Consequences

### Positive
- FCM/APNS are battle-tested; users get push the way they expect
- `PushPort` abstraction makes provider swap a config change, not a code change
- WebSocket for foreground avoids redundant native notifications when user is already looking
- History table is auditable and supports admin "send announcement to N users" UX

### Negative / accepted costs
- `firebase-admin` dependency on `apps/api` — outbound calls to Google. Verified reachable; if blocked later, we switch.
- Per-conversation mute (no global "disable all DMs") is intentional — disabling chat notifications is hostile UX
- ~3 days of work for the dual-stack abstraction (kept anyway)

### Neutral
- We accept that iOS users may receive slightly delayed pushes vs Android because APNS has stricter throttling — acceptable.

## Alternatives considered

- **Self-hosted only (ntfy / Gotify) from day 1** — rejected: FCM/APNS work, give better UX, and don't require users to install separate apps.
- **OneSignal / Knock / Courier** — rejected: third-party SaaS, air-gap incompatible.
- **No push, polling only** — rejected: chat without push is unusable in 2026.

## References

- Charter §8 (notifications), §10 (push)
- Related: ADR-0005 (hosting), ADR-0006 (auth — admin opt-out)
