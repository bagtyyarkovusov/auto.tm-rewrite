# notifications — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational notification-platform content lives in `docs/prd/features/36-notifications.md`. Per [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md), the full notification platform (dispatch, transport, feed, broadcasts) is post-MLP; direct-message push-token registration shipped first.

## Purpose

All push delivery + in-app notification feed + admin broadcast tooling. Push-token registration for direct-message push is implemented; the dispatch + transport layer is post-MLP.

## Owns (entities + tables)

- `FcmDevice` — id, userId (FK → User, Cascade), token (unique), platform (`PushPlatform` enum: android | ios | web), createdAt, updatedAt, deviceId?, registeredAt, lastUsedAt, invalidatedAt?. Indexes on `userId` and `(userId, invalidatedAt)`.
- `NotificationHistory` — id, userId (FK → User, Cascade), category (`NotificationCategory` enum: direct_messages | saved_search_matches | listing_activity | admin_announcements | blog_activity | marketing), title, body, data? (JSON), readAt?, createdAt. Index on `(userId, createdAt DESC)`.
- `NotificationPreference` — id, userId (FK → User, Cascade, unique), optOuts (JSON). One row per user.

## Invariants (enforced today)

- `FcmDevice.token` is globally unique (a token maps to at most one device row).
- `FcmDevice.userId` references an existing User (FK; deletes cascade).
- `NotificationHistory.userId` references an existing User (FK; deletes cascade).
- `NotificationPreference.userId` is unique (one preference row per user).
- Registering a token that already belongs to the same user reactivates/touches the row.
- Registering a token that belongs to a different user reassigns the unique row to the current user (`invalidatedPrevious: true`).
- Revoking a token is idempotent and no-ops when the token is missing, already invalidated, or owned by another user.

## Module shape (today)

- `apps/api/src/modules/notifications/`:
  - `domain/PushToken.ts` — domain entity with validation, `touch()`, `reassignTo()`, `invalidate()`.
  - `domain/types.ts` — `PushPlatform`, error codes, `PushTokenDomainError`.
  - `domain/ports/PushTokenRepository.ts` — repository port.
  - `application/RegisterPushToken.ts` — register or re-register a token.
  - `application/RevokePushToken.ts` — invalidate a token.
  - `application/ListPushTokens.ts` — list active tokens for the current user.
  - `application/EvaluateDirectMessagePush.ts` — decides whether a direct-message push should be sent by checking block state in both directions and active token presence.
  - `application/MessageSentEventHandler.ts` — `@OnEvent("MessageSent")` handler that delegates to `EvaluateDirectMessagePush`; suppresses push when blocked or no tokens. Actual transport dispatch is deferred to the push-worker slice.
  - `infrastructure/PrismaPushTokenRepository.ts` — Prisma-backed repository adapter.
  - `presentation/notifications.controller.ts` — HTTP routes.
  - `notifications.module.ts` — NestJS module wiring; imports `EventEmitterModule` and `IdentityModule`.

## Ports exposed

- `PushTokenRepository` (`domain/ports/PushTokenRepository.ts`):
  ```ts
  interface PushTokenRepository {
    findByToken(token: string): Promise<PushToken | null>
    findById(id: string): Promise<PushToken | null>
    listActiveForUser(userId: string): Promise<PushToken[]>
    save(token: PushToken): Promise<void>
    update(token: PushToken): Promise<void>
  }
  ```

## Ports consumed

- `PrismaService` (via `@auto-tm/db`) — `PrismaPushTokenRepository` maps `FcmDevice` rows to/from `PushToken`.
- `IdentityReadPort` (`IDENTITY_READ_PORT`) from `identity/` — used by `EvaluateDirectMessagePush` for bidirectional block checks (`isUserBlockedBy`).

## Shipped use-cases

- `RegisterPushToken` — validates token + platform, handles same-user re-registration, cross-user reassignment, and inserts/upserts the row.
- `RevokePushToken` — soft-invalidates the token for the authenticated user; idempotent.
- `ListPushTokens` — returns active tokens ordered by `lastUsedAt DESC`.
- `EvaluateDirectMessagePush` — returns `shouldSend: true` only when the recipient has not blocked the sender, the sender has not blocked the recipient, and the recipient has at least one active push token. Otherwise returns `shouldSend: false` with reason `BLOCKED` or `NO_TOKENS`.
- `MessageSentEventHandler` — listens for `MessageSent` from `conversations/` and suppresses push via `EvaluateDirectMessagePush` when ineligible. Does not dispatch transport; that remains post-MLP.

## HTTP routes

- `POST /api/v1/notifications/tokens` — register/update a push token. Body: `{ token, platform, deviceId? }`. Response: `{ registered: true, invalidatedPrevious?: boolean, token: PushTokenSummary }`.
- `GET /api/v1/notifications/tokens` — list active tokens for the authenticated user. Response: `{ items: PushTokenSummary[] }`.
- `DELETE /api/v1/notifications/tokens/:token` — revoke a token. Response: `{ revoked: boolean }`.
- `GET /api/v1/notifications/ping` — public health/ping route.

## Events emitted

- (none today)

## Events consumed

- `MessageSent` (from `conversations/`) — triggers `EvaluateDirectMessagePush` and suppresses push for blocked or no-token cases.

## Planned additions (post-MLP notification platform)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in `docs/prd/features/36-notifications.md` and must be shaped into a sprint before implementation. [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) defers this work out of the MLP beta.

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
  - `ContentReportCreated` (from `admin/`) — future admin notification; emitted only for newly inserted report rows, not duplicate pending reuse; not consumed in S7
  - `DealershipVerified` (from `identity/` or `admin/`) — congrats push to dealership members
  - S7 moderation events such as `ListingBanned`, `ListingUnbanned`, `UserSuspended`, and `UserUnsuspended` are not consumed for user-facing notifications in the MLP. Moderation feedback notifications require explicit future PRD coverage and must not expose admin free-text reasons.
- **Ports consumed**: `IdentityReadPort` (resolve user + admin check for broadcasts), `ListingsReadPort` (hydrate match notification body)

## Notable decisions

- [ADR-0009](../../../../../docs/adr/0009-notifications.md) — Dual-stack transport, 6 categories
- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Notifications is its own context
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) — Full notification platform is post-MLP
