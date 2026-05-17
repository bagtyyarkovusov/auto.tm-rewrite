# notifications — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in `docs/prd/sprints/sprint-08-notifications.md`. Push delivery + match algorithm + admin broadcast tooling all ship in S8.

## Purpose

All push delivery + in-app notification feed + admin broadcast tooling. Schema-only today; the dispatch + transport layer ships in S8.

## Owns (entities + tables)

- `FcmDevice` — id, userId (FK → User, Cascade), token (unique), platform (`PushPlatform` enum: android | ios | web), createdAt, updatedAt. Index on `userId`.
- `NotificationHistory` — id, userId (FK → User, Cascade), category (`NotificationCategory` enum: direct_messages | saved_search_matches | listing_activity | admin_announcements | blog_activity | marketing), title, body, data? (JSON), readAt?, createdAt. Index on `(userId, createdAt DESC)`.
- `NotificationPreference` — id, userId (FK → User, Cascade, unique), optOuts (JSON). One row per user.

## Invariants (enforced today)

- `FcmDevice.token` is globally unique (a token can be registered to at most one device row).
- `FcmDevice.userId` references an existing User (FK; deletes cascade).
- `NotificationHistory.userId` references an existing User (FK; deletes cascade).
- `NotificationPreference.userId` is unique (one preference row per user).

## Module shape (today)

- `apps/api/src/modules/notifications/`:
  - `domain/`, `application/`, `infrastructure/` — empty
  - `presentation/` — empty
  - `notifications.module.ts` — empty module
- No dispatch layer, no transport adapters, no event consumers.

## Ports exposed

- (none today — S8 adds `NotificationsDispatchPort` and `PushPort`)

## Ports consumed

- (none today)

## Shipped use-cases

- (none today)

## Events emitted

- (none today)

## Events consumed

- (none today)

## Planned additions (S8 — Notifications + match)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in `docs/prd/sprints/sprint-08-notifications.md`:

- **Schema additions to `FcmDevice`** (rename to `PushToken` may be considered): `deviceId`, `registeredAt`, `lastUsedAt`, `invalidatedAt?` for token-invalidation handling
- **Schema additions to `NotificationHistory`** for broadcast support: `recipientGroup?` (e.g., "all-admins"), `sentByUserId?` (admin-initiated), `deliveryDetails` (JSON per-token success/fail), `totalRecipients`, `successfulDeliveries`, `failedDeliveries` (broadcast metrics)
- **`NotificationsDispatchPort`** interface:

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
  ```

- **`PushPort`** transport abstraction (FCM, APNS, ntfy, test):

  ```ts
  interface PushPort {
    send(deviceToken: string, payload: PushPayload): Promise<PushResult>
  }
  ```

- **Push transport selection** via `PUSH_TRANSPORT` env var:
  - `fcm-apns` (default production) — both platforms via firebase-admin + APNS HTTP/2
  - `ntfy` (fallback) — self-hosted, limited foreground-style notifications
  - `test` (CI / dev) — in-memory, no real delivery
  - On "token invalid" response → mark `FcmDevice.invalidatedAt` (after schema addition) and skip future sends

- **Invariants** to enforce at application layer:
  - User MUST have at least one valid `FcmDevice` to receive push (else notification stays in-app feed only)
  - `NotificationHistory` is append-only (admin can hide from feed but row persists for audit)
  - `direct_messages` category cannot be globally disabled — only per-conversation mute (UI-enforced)
  - `NotificationPreference.optOuts` JSON shape: `{ [category]: 'push' | 'digest' | 'none' }`

- **Events emitted**: `NotificationDelivered` (analytics), `NotificationFailed` (analytics + retry)
- **Events consumed**:
  - `MessageSent` (from `conversations/`) — fires push to offline recipient
  - `SavedSearchMatched` (from `subscriptions/`) — fires push (debounced)
  - `ListingFavorited` (from `listings/`) — digestable activity push
  - `ListingReported` (from `listings/`) — admin notification
  - `DealershipVerified` (from `identity/` or `admin/`) — congrats push to dealership members
- **Ports consumed**: `IdentityReadPort` (resolve user + admin check for broadcasts), `ListingsReadPort` (hydrate match notification body)

## Notable decisions

- [ADR-0009](../../../../../docs/adr/0009-notifications.md) — Dual-stack transport, 6 categories
- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Notifications is its own context
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
