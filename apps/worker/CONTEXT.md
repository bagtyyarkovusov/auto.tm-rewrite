# apps/worker — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Video transcode and broad orphan-cleanup processors remain stubs. S11 ships native FCM and APNS direct-message delivery behind `PushPort`; acquiring provider credentials and configuring them on Railway remain operational work outside the repository. Sign-in Code emails go out through Resend behind `EmailSenderPort` ([ADR-0055](../../docs/adr/0055-resend-sends-sign-in-codes-from-the-worker.md)); the API does not enqueue them yet, and the Resend account, domain DNS and key are operational work outside the repository.

## Purpose

NestJS standalone worker. Consumes BullMQ queues from Redis and runs CPU-bound or fire-and-forget work outside the request path. Hosted on Server A (or moves to a dedicated box if load grows).

## What it contains (today)

### Stack

- `@nestjs/bullmq@^11.0.0` + `bullmq@^5.34.0` + `ioredis@^5.4.2` for queue infrastructure
- `nestjs-pino` for logging
- `zod` for env-schema validation (`src/env.schema.ts`)
- `@auto-tm/db` and `@auto-tm/contracts` workspace deps
- No `sharp` (image variants) dep yet
- `firebase-admin@^14.3.0` (FCM) and `@parse/node-apn@^8.1.0` (APNS), both imported lazily: `firebase-admin` only for `PUSH_TRANSPORT=fcm` or `fcm-apns`, `@parse/node-apn` only for `fcm-apns`
- No `@aws-sdk/client-s3` / MinIO dep yet (image+video pipeline doesn't fetch/push to MinIO today)
- No `ffmpeg-static` or video toolchain yet
- `resend@^6.28.1` (official Resend SDK), imported lazily and only for `EMAIL_DRIVER=resend`. No other workspace depends on it ([ADR-0055](../../docs/adr/0055-resend-sends-sign-in-codes-from-the-worker.md))

### Queue processors (today)

- `src/queues/video-transcode.processor.ts` — stub processor (no ffmpeg integration yet)
- `src/queues/notification-fanout.processor.ts` — handles `direct-message` jobs from the `notification-fanout` queue. Validates the payload against `DirectMessagePushJobSchema`, fetches the recipient's active `FcmDevice` rows, calls the configured `PushPort` per token, records per-token results in `NotificationHistory.deliveryDetails`, and sets `NotificationHistory.status` to `delivered` (at least one token succeeded) or `failed`. On retryable transport failures it leaves the status `pending` and rethrows so BullMQ retries the job (the API enqueues with `attempts: 3`, exponential backoff). Saved-search match evaluation remains post-MLP.
- `src/queues/email-code.processor.ts` — handles `sign-in-code` jobs from the `email-code` queue (`AuthSchemas.EMAIL_CODE_QUEUE` / `EMAIL_CODE_JOB_NAME`). Validates the payload `{ to, code, locale, purpose }` against `AuthSchemas.EmailCodeJobSchema` and runs `SendSignInCodeEmail` with the BullMQ job ID. A sent email completes the job; a provider rejection, a reached daily cap, an invalid payload, a missing job ID or an unknown job name throw BullMQ's `UnrecoverableError`, so the job fails once without using its remaining attempts; a retryable provider failure throws a plain error so BullMQ retries under the producer's `attempts`. The code is never logged: log lines and failure reasons carry the job ID, the masked recipient (`b***@example.com`), the purpose, the attempt and provider error codes only, and an invalid payload logs field paths, not values. The cap-reached line is logged at error level with `alert: "EMAIL_DAILY_CAP_REACHED"`.
- `src/queues/orphan-cleanup.processor.ts` — stub processor (no MinIO listing / DB scan yet)
- `src/queues/account-purge.processor.ts` — daily repeatable job at 03:00 UTC. Finds users with `deletionScheduledAt <= now`, frees both Sign-in Methods (nulls `phone`, `phoneVerifiedAt`, `email`, `emailVerifiedAt`, so a later User can take them) and clears PII (nulls `displayName`/`avatarUrl`), clears `deletionScheduledAt`, and prunes private rows: sessions, TOTP, FCM devices, notification history/preferences, saved searches, favorites, garage, blocked users, dealership memberships, listing drafts. Marketplace content (listings, conversations, messages, reports, audit logs) is retained.

### Push transport (`src/push/`)

- `domain/PushPort.ts` — `PushPort` interface (`send(payload) → PushResult`) and `PUSH_PORT` token. `PushPayload` carries `platform` (`PUSH_PLATFORM` in `domain/types.ts`, mirroring the Prisma `PushPlatform` enum) so the transport can select a provider. Results are `ok`, `INVALID_TOKEN` (permanent, token should be invalidated), `RETRYABLE`, or `PERMANENT`.
- `application/ProcessDirectMessagePush.ts` — pure use-case that fans out a direct-message push to active device tokens, handles `INVALID_TOKEN` invalidation, updates history status, and throws `RetryablePushError` for retryable failures so BullMQ can retry. Because BullMQ retries the whole job, it first reads `NotificationHistoryStore.listSucceededTokens(historyId)` and skips devices an earlier attempt already delivered to, recording them as `{ success: true, skipped: true }` — a retry never sends a duplicate notification.
- `adapters/TestPushTransport.ts` — `PUSH_TRANSPORT=test` implementation. Records every `send()` call in memory and can be configured per-token or with a default result. No external network calls.
- `adapters/FcmApnsPushTransport.ts` — production transport. Routes `ios` device tokens to APNS and `android`/`web` tokens to FCM, and builds the wire data payload. `buildDataPayload` stringifies every job data value and writes the S10 conversation deep link last under the `deepLink` key, so job data can never displace it.
- `adapters/fcm/FcmSender.ts` — `FirebaseFcmSender` wraps a single injected `messaging().send()` function (high-priority Android notification); `createFirebaseSendFn` builds it from service-account credentials under the named app `autotm-push`.
- `adapters/fcm/classifyFcmError.ts` — maps `MessagingErrorCode` values to `PushResult`. `registration-token-not-registered`, `invalid-registration-token`, `installation-id-not-registered`, and `invalid-recipient` are `INVALID_TOKEN`; server/rate/quota/network codes are `RETRYABLE`; everything else, including the ambiguous `invalid-argument`, is `PERMANENT` so a payload defect cannot mass-deactivate devices. A throw with no provider code is `RETRYABLE`.
- `adapters/apns/ApnsSender.ts` — `ParseApnsSender` wraps a single injected node-apn send function; `createApnsSendFn` builds a token-based `apn.Provider` whose host comes from `APNS_PRODUCTION`. `buildApnsNotification` is exported so the wire payload (`deepLink` at the APNS JSON root, beside `aps`) is verifiable without credentials.
- `adapters/apns/UnprovisionedApnsSender.ts` — the APNS side of `PUSH_TRANSPORT=fcm` ([ADR-0047](../../docs/adr/0047-fcm-only-push-transport-for-android-first-launch.md)). Loads no SDK and opens no connection; returns `PERMANENT` with a cause naming the transport. Deliberately not `INVALID_TOKEN`, which would deactivate `FcmDevice` rows that must survive into the `fcm-apns` era.
- `adapters/apns/classifyApnsResponse.ts` — maps node-apn's `{ sent, failed }` response to `PushResult`. Status 410 and `BadDeviceToken` are `INVALID_TOKEN`; 429, 5xx, and provider-token/idle reasons are `RETRYABLE`; a failure without a status (connection fault) is `RETRYABLE`; remaining rejections such as `DeviceTokenNotForTopic` are `PERMANENT`.
- `adapters/credentials.ts` — `readFcmCredentials` / `readApnsCredentials` assemble the provider credential sets from env. Errors name the variable and never echo key material. PEM parsing itself lives in `src/shared/pem.ts` (`normalizePrivateKey`), which unquotes and expands escaped (`\n`, `\r\n`) values and rejects non-PEM input; it is feature-agnostic because `env.schema.ts` validates the same secrets at boot before any module is wired.
- `adapters/UnconfiguredPushTransport.ts` — permanent-failure placeholder for a selected transport that has no adapter (today only ADR-0009's `ntfy` fallback).
- Result `cause` values are provider code or reason strings, never provider error objects, so credentials cannot reach `NotificationHistory.deliveryDetails` or logs.
- `infrastructure/PrismaPushDeviceStore.ts` — reads active `FcmDevice` rows and invalidates dead tokens with `updateMany`, so a concurrently removed row cannot throw P2025 and abort the job before its history row is written.
- `infrastructure/PrismaNotificationHistoryStore.ts` — updates `NotificationHistory.status` and `deliveryDetails`, and reads back the tokens an earlier attempt delivered to. `deliveryDetails` is free-form JSON, so it is parsed defensively: an unreadable shape yields an empty skip list rather than dropping a push.
- `push.module.ts` — wires the push layer. `createPushPort` resolves `PUSH_PORT` to `TestPushTransport` for `PUSH_TRANSPORT=test` (the default), to `FcmApnsPushTransport` with both provider senders for `fcm-apns`, to the same transport with `FirebaseFcmSender` + `UnprovisionedApnsSender` for `fcm`, and to `UnconfiguredPushTransport` otherwise. Provider SDKs and credentials are only touched for the delivering transports, so the default boot needs no push secret, and `fcm` reads no Apple value.

### Sign-in code email (`src/email/`)

- `domain/EmailSenderPort.ts` — `EmailSenderPort` (`send(email, { idempotencyKey }) → EmailSendResult`) and the `EMAIL_SENDER_PORT` token. `OutgoingEmail` is `{ to, subject, text, html }`; the From address belongs to the adapter. Results are `ok`, `REJECTED` (permanent) or `RETRYABLE`, each failure with a provider error code as `cause`, never a provider error object or message.
- `domain/DailySendCap.ts` — `DailySendCap` port (`reserve(sendId, now)` → allowed, or refused with the cap) and `DAILY_SEND_CAP` token. A send is counted once per send ID per UTC day, so a retried job keeps its slot.
- `domain/renderSignInCodeEmail.ts` — pure RU/TK/EN template. The subject carries the code; the body has a purpose-specific lead line (`sign-in`, `sign-in-method`, `account-deletion`), the code, the 10-minute expiry, "AutoTM will never ask you for this code", and an ignore-if-unrequested line. Plain-text and HTML parts, no links, names only AutoTM.
- `domain/types.ts` — `EMAIL_DRIVER`, `EMAIL_SEND_FAILURE`, `EMAIL_LOCALE`, `SIGN_IN_CODE_PURPOSE` (mirroring the contracts enums), `EMAIL_SIGN_IN_CODE_EXPIRY_MINUTES` (10) and `DEFAULT_EMAIL_DAILY_CAP` (80).
- `application/SendSignInCodeEmail.ts` — use case: reserves a daily-cap slot under the job ID, renders the email, sends it with the job ID as the idempotency key, and returns `sent`, `cap-reached`, `rejected` or `retryable`. The cap is checked before the provider is called.
- `adapters/resend/ResendEmailSender.ts` — `EMAIL_DRIVER=resend`. Calls `resend.emails.send` from `EMAIL_FROM` with `idempotencyKey`, no reply-to. `createResendSendFn` builds the SDK client from `RESEND_API_KEY`. A thrown SDK call is `RETRYABLE` with cause `sdk_threw`, and its message is dropped.
- `adapters/resend/classifyResendError.ts` — maps the SDK's `{ name, statusCode }` error. A null status code (network fault), `rate_limit_exceeded`, `application_error`, `internal_server_error` and `concurrent_idempotent_requests` are `RETRYABLE`; every other error, including `validation_error`, `invalid_from_address`, `invalid_api_key`, `daily_quota_exceeded` and `monthly_quota_exceeded`, is `REJECTED`.
- `adapters/MockEmailSender.ts` — `EMAIL_DRIVER=mock` (the default). Records sends in memory, makes no network call, and answers a repeated idempotency key with the first successful result.
- `adapters/InMemoryDailySendCap.ts` — the cap's counting rules in memory, for tests.
- `infrastructure/RedisDailySendCap.ts` — one Redis set of send IDs per UTC day (`email:daily-sends:YYYY-MM-DD`, expiring after 48 hours). A Lua script does the membership check, size check and add atomically, so concurrent workers can't both take the last slot. The cap is per Redis, so it covers one environment.
- `email.module.ts` — wires the email layer. `createEmailSender` resolves `EMAIL_SENDER_PORT` to `ResendEmailSender` for `resend` and `MockEmailSender` otherwise; `DAILY_SEND_CAP` is a `RedisDailySendCap` on its own `ioredis` client from `REDIS_URL`, closed on shutdown.

### Shared (`src/shared/`)

- `pem.ts` — `normalizePrivateKey` plus `InvalidPrivateKeyError`. Feature-agnostic PEM parsing shared by `env.schema.ts` boot validation and the push credential readers. Never echoes key material.

### Other

- `src/main.ts` boots the NestJS worker app. Boot is fail-visible: an env-validation (or any bootstrap) failure logs the contract error and exits with code 1, so a misconfigured deploy surfaces as crashed instead of running a silently broken consumer. The worker has no public route and never runs migrations — the API pre-deploy command is the sole migration authority (ADR-0004/ADR-0039).
- `src/app.module.ts` wires modules, including `PushModule`
- `src/common/prisma.module.ts` — Prisma access module

## Public surface

None — worker is internal. Only Redis (queues) + Postgres + MinIO connections (MinIO when image+video pipelines actually ship).

## Environment variables

Validated fail-closed by `src/env.schema.ts` at boot.

- `EMAIL_DRIVER` — `mock` (default) or `resend`. `resend` requires non-blank `RESEND_API_KEY` and `EMAIL_FROM`, or boot fails. `mock` is not yet rejected in production.
- `EMAIL_FROM` — the From address, e.g. `AutoTM <no-reply@autotm.bagtyyar.dev>`
- `EMAIL_DAILY_CAP` — sends allowed per UTC day, counted in this worker's Redis, a positive integer (default 80)
- `RESEND_API_KEY` — the environment's sending-only Resend key. Set only on the worker service, never logged
- `APP_ENV` — deployed-environment identity (`development` default; `staging`/`production` enable the deployed-env rules below)
- `AUTOTM_COMMIT_SHA` — build-baked commit SHA (from `RAILWAY_GIT_COMMIT_SHA` in `infra/docker/worker.Dockerfile`), default `unknown`
- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string for BullMQ
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` — object storage (used by future media pipelines)
- `PUSH_TRANSPORT` — `test` (S10 default), `fcm`, `fcm-apns`, or `ntfy`. **`test` is rejected when `APP_ENV=production`** (it delivers nothing). Each delivering transport requires its own credential set below and fails boot on any missing, blank or unparseable value
- Push credentials by transport:
  - `fcm` ([ADR-0047](../../docs/adr/0047-fcm-only-push-transport-for-android-first-launch.md), the Android-first launch window): `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`. No Apple value is required or read; an `ios` device token fails `PERMANENT`
  - `fcm-apns`: those three plus `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION` (`"true"`/`"false"`, selects the APNS host explicitly — never derived from `APP_ENV`, because EAS `internal` builds carry production entitlements)
  - `FCM_PRIVATE_KEY` and `APNS_PRIVATE_KEY` may be shell-quoted with escaped `\n` newlines. Only the keys the selected transport uses are parsed at boot, so a malformed secret crashes startup instead of silently failing every send, and a stray `APNS_PRIVATE_KEY` cannot crash an `fcm` worker
- Deployed-env rules (`APP_ENV=staging|production`): data endpoints must be valid non-loopback URLs, hosts must not reference the other environment, and default `minioadmin` credentials are forbidden

## Dependencies

- `apps/api` (shared Prisma models via `packages/db`; emits events that worker consumes; API owns the direct-message push decision/enqueue)
- `packages/db`
- `@auto-tm/contracts` (validates the `direct-message` job payload via `DirectMessagePushJobSchema` and the `sign-in-code` job payload via `AuthSchemas.EmailCodeJobSchema`)
- Resend HTTPS API (`api.resend.com`), only for `EMAIL_DRIVER=resend`
- Redis (BullMQ)
- MinIO (S3 SDK — to be added when image+video pipelines ship)

## Planned additions (future sprints)

Per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md):

- **S8 account-deletion purge** — shipped. Daily `account-purge` BullMQ repeatable job (`AccountPurgeProcessor` + `AccountPurgeScheduler`) runs `PurgeExpiredAccounts` use-case.
- **MLP image reliability** — queued image variant generation may be shaped in S8 only if API-request lifecycle Sharp generation becomes a beta reliability problem:
  - New `src/queues/image-variants.processor.ts` processor
  - `sharp` dep for variant generation (thumbnail / list / detail / fullscreen × JPEG + WebP)
  - `@aws-sdk/client-s3` dep for MinIO read/write
  - Consumes `image-variants` queue → reads from `listing-photos` bucket → writes variants back → updates `ListingMedia` row
- **Post-MLP video pipeline** — video transcoding remains deferred unless a future media bet is shaped:
  - `ffmpeg-static` dep + ffmpeg toolchain
  - Pull source from `listing-videos` MinIO bucket → produce HLS at 320p + 720p + poster at 2s
  - Add any required video processing status fields in the sprint that owns video UX
- **Post-MLP notifications** — Saved-search match fan-out and broadcast notifications:
  - Saved-search match fan-out (extend existing `notification-fanout`):
    - Consume `ListingCreated` events / queue jobs → query `SavedSearch` table → respect per-search debounce → enqueue per-recipient direct-message-style push jobs
- **Phase 2 — orphan media cleanup pipeline** (extend existing stub):
  - Nightly cron at 03:00 TM time
  - Lists MinIO objects with no DB reference > 24h → deletes them
- **Phase 2 — uptime probes**:
  - Cron every 60s
  - Hits `/healthz` on `apps/api`, `apps/admin`, `apps/web`, `apps/sms-gateway`
  - Writes results to Prometheus

## Notable decisions

- [ADR-0008](../../docs/adr/0008-media.md) — Async video pipeline
- [ADR-0009](../../docs/adr/0009-notifications.md) — Push fan-out
- [ADR-0010](../../docs/adr/0010-testing-obs.md) — Uptime probes via worker
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0027](../../docs/adr/0027-mlp-beta-scope.md) — Full notification/media platform deferred out of MLP beta
- [ADR-0039](../../docs/adr/0039-phased-cloud-first-hosting.md) — Railway-era hosting; fail-closed push/env contract at boot
- [ADR-0043](../../docs/adr/0043-native-apns-delivery-via-node-apn.md) — Native APNS via `@parse/node-apn`, FCM via `firebase-admin`
- [ADR-0047](../../docs/adr/0047-fcm-only-push-transport-for-android-first-launch.md) — `PUSH_TRANSPORT=fcm` for the Android-first launch window
- [ADR-0055](../../docs/adr/0055-resend-sends-sign-in-codes-from-the-worker.md) — Resend sends Sign-in Code emails from the worker; 80-a-day cap
