# notifications — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational notification-platform content lives in `docs/prd/features/36-notifications.md`. Per [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md), the full notification platform (dispatch, transport, feed, broadcasts) is post-MLP; direct-message push-token registration and the API-side push decision/history/enqueue layer shipped first.

## Purpose

All push delivery + in-app notification feed + admin broadcast tooling. Push-token registration and direct-message push decision/history/enqueue are implemented; external transport dispatch lives in `apps/worker` and is wired in #245.

## Owns (entities + tables)

- `FcmDevice` — id, userId (FK → User, Cascade), token (unique), platform (`PushPlatform` enum: android | ios | web), createdAt, updatedAt, deviceId?, registeredAt, lastUsedAt, invalidatedAt?. Indexes on `userId` and `(userId, invalidatedAt)`.
- `NotificationHistory` — id, userId (FK → User, Cascade), category (`NotificationCategory` enum), status (`NotificationHistoryStatus` enum: pending | delivered | failed, default pending), title, body, data? (JSON), deliveryDetails? (JSON), readAt?, createdAt. Index on `(userId, createdAt DESC)`.
- `NotificationPreference` — id, userId (FK → User, Cascade, unique), optOuts (JSON). One row per user.

## Domain layer

Pure TypeScript, no Nest decorators, no Prisma imports.

- `PushToken` — domain entity with validation, `touch()`, `reassignTo()`, `invalidate()`.
- `DirectMessageNotification` — value object that builds a lock-screen-safe title, body, deep link, and `data` payload from a `MessageSent` event.
- `types.ts` — `PushPlatform`, `PushTokenDomainError`, push-token error codes, direct-message notification copy constants, suppression-reason constants, and `DIRECT_MESSAGE_NOTIFICATION_CATEGORY`.

## Invariants (enforced today)

- `FcmDevice.token` is globally unique (a token maps to at most one device row).
- `FcmDevice.userId` references an existing User (FK; deletes cascade).
- `NotificationHistory.userId` references an existing User (FK; deletes cascade).
- `NotificationPreference.userId` is unique (one preference row per user).
- Registering a token that already belongs to the same user reactivates/touches the row.
- Registering a token that belongs to a different user reassigns the unique row to the current user (`invalidatedPrevious: true`).
- Revoking a token is idempotent and no-ops when the token is missing, already invalidated, or owned by another user.
- **Direct-message push suppression** — a `MessageSent` event never produces more than one push decision per recipient. The API enqueues one job to the worker when the recipient is eligible; the worker fans out to individual device tokens in #245.
- **Online suppression rule** — push is suppressed when the recipient has at least one active socket connection according to `PresencePort.isUserOnline()`. The chat socket will deliver the message in-app, so a native notification would be noisy.
- **Mute suppression rule** — push is suppressed when `ConversationStatePort.isMuted(conversationId, recipientId)` returns `true` (the recipient muted this conversation).
- **Block suppression rule** — push is suppressed when either user has blocked the other (via `IdentityReadPort.isUserBlockedBy`).
- **No-token suppression rule** — push is suppressed when the recipient has zero active `FcmDevice` rows.
- **Self-message suppression rule** — push is suppressed when `senderId === recipientId`.
- **History status rule** — `NotificationHistory.status` is `pending` when the API records an eligible decision, and the worker updates it to `delivered` or `failed`. Skipped cases are tested but leave no history row.
- **Preview safety rule** — text messages use the message body truncated to 100 characters; image, post_ref, and deleted messages use generic lock-screen copy (`Фото`, `Объявление`, `Сообщение удалено`) so the payload is safe for lock screens.
- **Deep-link rule** — every direct-message notification carries deep link `/conversations/{conversationId}` inside both the enqueue payload and `NotificationHistory.data`.

## Module shape (today)

- `apps/api/src/modules/notifications/`:
  - `domain/PushToken.ts` — domain entity with validation, `touch()`, `reassignTo()`, `invalidate()`.
  - `domain/DirectMessageNotification.ts` — value object that builds title/body/deep-link/data from a `MessageSent` event.
  - `domain/types.ts` — `PushPlatform`, error codes, notification copy constants, suppression-reason constants.
  - `domain/ports/PushTokenRepository.ts` — repository port.
  - `domain/ports/NotificationHistoryRepository.ts` — port for recording `NotificationHistory` rows.
  - `domain/ports/PushQueuePort.ts` — port for enqueueing push jobs to the worker.
  - `application/RegisterPushToken.ts` — register or re-register a token.
  - `application/RevokePushToken.ts` — invalidate a token.
  - `application/ListPushTokens.ts` — list active tokens for the current user.
  - `application/EvaluateDirectMessagePush.ts` — eligibility check for bidirectional block state and active token presence.
  - `application/DecideDirectMessageNotification.ts` — full decision use-case: online, mute, self-message, block/token checks; records history and enqueues the worker job for eligible messages.
  - `application/MessageSentEventHandler.ts` — `@OnEvent("MessageSent")` handler that delegates to `DecideDirectMessageNotification`.
  - `infrastructure/PrismaPushTokenRepository.ts` — Prisma-backed `FcmDevice` adapter.
  - `infrastructure/PrismaNotificationHistoryRepository.ts` — Prisma-backed `NotificationHistory` adapter.
  - `infrastructure/BullMqPushQueueProducer.ts` — BullMQ producer that adds jobs to the `notification-fanout` queue for the worker.
  - `presentation/notifications.controller.ts` — HTTP routes.
  - `notifications.module.ts` — NestJS module wiring; imports `EventEmitterModule`, `IdentityModule`, `ConversationsModule`, `RealtimeModule`, and `BullModule.registerQueue({ name: "notification-fanout" })`.

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
- `NotificationHistoryRepository` (`domain/ports/NotificationHistoryRepository.ts`):
  ```ts
  interface NotificationHistoryRepository {
    save(notification: DirectMessageNotification): Promise<{ id: string }>
  }
  ```
- `PushQueuePort` (`domain/ports/PushQueuePort.ts`):
  ```ts
  interface PushQueuePort {
    enqueue(notification: DirectMessageNotification, historyId: string): Promise<void>
  }
  ```

## Ports consumed

- `PrismaService` (via `@auto-tm/db`) — `PrismaPushTokenRepository` and `PrismaNotificationHistoryRepository` map Prisma rows to/from domain objects.
- `IdentityReadPort` (`IDENTITY_READ_PORT`) from `identity/` — used by `EvaluateDirectMessagePush` for bidirectional block checks (`isUserBlockedBy`).
- `PresencePort` (`PRESENCE_PORT`) from `realtime/` — used by `DecideDirectMessageNotification` to suppress push when the recipient is socket-online.
- `ConversationStatePort` (`CONVERSATION_STATE_PORT`) from `conversations/` — used by `DecideDirectMessageNotification` to read per-conversation mute state.

## Shipped use-cases

- `RegisterPushToken` — validates token + platform, handles same-user re-registration, cross-user reassignment, and inserts/upserts the row.
- `RevokePushToken` — soft-invalidates the token for the authenticated user; idempotent.
- `ListPushTokens` — returns active tokens ordered by `lastUsedAt DESC`.
- `EvaluateDirectMessagePush` — returns `shouldSend: true` only when the recipient has not blocked the sender, the sender has not blocked the recipient, and the recipient has at least one active push token. Otherwise returns `shouldSend: false` with reason `BLOCKED` or `NO_TOKENS`.
- `DecideDirectMessageNotification` — consumes a `MessageSent` event and decides whether to enqueue a direct-message push. Applies self-message, online, mute, block, and no-token suppression rules. For eligible messages it builds a `DirectMessageNotification`, writes a `NotificationHistory` row, and enqueues a job via `PushQueuePort`.
- `MessageSentEventHandler` — listens for `MessageSent` from `conversations/` and delegates to `DecideDirectMessageNotification`.

## HTTP routes

- `POST /api/v1/notifications/tokens` — register/update a push token. Body: `{ token, platform, deviceId? }`. Response: `{ registered: true, invalidatedPrevious?: boolean, token: PushTokenSummary }`.
- `GET /api/v1/notifications/tokens` — list active tokens for the authenticated user. Response: `{ items: PushTokenSummary[] }`.
- `DELETE /api/v1/notifications/tokens/:token` — revoke a token. Response: `{ revoked: boolean }`.
- `GET /api/v1/notifications/ping` — public health/ping route.

## Events emitted

- (none today)

## Events consumed

- `MessageSent` (from `conversations/`) — triggers `DecideDirectMessageNotification`, which may record history and enqueue a `notification-fanout` job for the worker.

## Worker integration

- Direct-message pushes are enqueued on the BullMQ queue `notification-fanout` with job name `direct-message` and payload `{ category, recipientUserId, historyId, title, body, deepLink, data }`. The `historyId` lets the worker update the corresponding `NotificationHistory` row.
- The worker processor (`apps/worker/src/queues/notification-fanout.processor.ts`) owns external transport selection and per-token delivery; it validates the payload with `DirectMessagePushJobSchema` and calls `ProcessDirectMessagePush`.

## Planned additions (post-MLP notification platform)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in `docs/prd/features/36-notifications.md` and must be shaped into a sprint before implementation. [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) defers this work out of the MLP beta.

- Schema additions to `NotificationHistory` for broadcast support: `recipientGroup?` (e.g., "all-admins"), `sentByUserId?` (admin-initiated), `deliveryDetails` (JSON per-token success/fail), `totalRecipients`, `successfulDeliveries`, `failedDeliveries` (broadcast metrics)
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

- Push transport selection via `PUSH_TRANSPORT` env var:
  - `fcm-apns` (default production) — both platforms via firebase-admin + APNS HTTP/2
  - `ntfy` (fallback) — self-hosted, limited foreground-style notifications
  - `test` (CI / dev) — in-memory, no real delivery
  - On "token invalid" response → mark `FcmDevice.invalidatedAt` (after schema addition) and skip future sends

- Invariants to enforce at application layer:
  - User MUST have at least one valid `FcmDevice` to receive push (else notification stays in-app feed only)
  - `NotificationHistory` is append-only (admin can hide from feed but row persists for audit)
  - `direct_messages` category cannot be globally disabled — only per-conversation mute (UI-enforced)
  - `NotificationPreference.optOuts` JSON shape: `{ [category]: 'push' | 'digest' | 'none' }`

- Events emitted: `NotificationDelivered` (analytics), `NotificationFailed` (analytics + retry)
- Events consumed:
  - `MessageSent` (from `conversations/`) — fires push to offline recipient
  - `SavedSearchMatched` (from `subscriptions/`) — fires push (debounced)
  - `ListingFavorited` (from `listings/`) — digestable activity push
  - `ContentReportCreated` (from `admin/`) — future admin notification; emitted only for newly inserted report rows, not duplicate pending reuse; not consumed in S7
  - `DealershipVerified` (from `identity/` or `admin/`) — congrats push to dealership members
  - S7 moderation events such as `ListingBanned`, `ListingUnbanned`, `UserSuspended`, and `UserUnsuspended` are not consumed for user-facing notifications in the MLP. Moderation feedback notifications require explicit future PRD coverage and must not expose admin free-text reasons.
- Ports consumed: `IdentityReadPort` (resolve user + admin check for broadcasts), `ListingsReadPort` (hydrate match notification body)

## Notable decisions

- [ADR-0009](../../../../../docs/adr/0009-notifications.md) — Dual-stack transport, 6 categories
- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Notifications is its own context
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) — Full notification platform is post-MLP
