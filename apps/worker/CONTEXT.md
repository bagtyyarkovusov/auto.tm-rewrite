# apps/worker — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Video transcode and broad orphan-cleanup processors remain stubs. S11 ships native FCM and APNS direct-message delivery behind `PushPort`; acquiring provider credentials and configuring them on Railway remain operational work outside the repository.

## Purpose

NestJS standalone worker. Consumes BullMQ queues from Redis and runs CPU-bound or fire-and-forget work outside the request path. Hosted on Server A (or moves to a dedicated box if load grows).

## What it contains (today)

### Stack

- `@nestjs/bullmq@^11.0.0` + `bullmq@^5.34.0` + `ioredis@^5.4.2` for queue infrastructure
- `nestjs-pino` for logging
- `zod` for env-schema validation (`src/env.schema.ts`)
- `@auto-tm/db` and `@auto-tm/contracts` workspace deps
- No `sharp` (image variants) dep yet
- `firebase-admin@^14.3.0` (FCM) and `@parse/node-apn@^8.1.0` (APNS), both imported lazily and only when `PUSH_TRANSPORT=fcm-apns`
- No `@aws-sdk/client-s3` / MinIO dep yet (image+video pipeline doesn't fetch/push to MinIO today)
- No `ffmpeg-static` or video toolchain yet

### Queue processors (today)

- `src/queues/video-transcode.processor.ts` — stub processor (no ffmpeg integration yet)
- `src/queues/notification-fanout.processor.ts` — handles `direct-message` jobs from the `notification-fanout` queue. Validates the payload against `DirectMessagePushJobSchema`, fetches the recipient's active `FcmDevice` rows, calls the configured `PushPort` per token, records per-token results in `NotificationHistory.deliveryDetails`, and sets `NotificationHistory.status` to `delivered` (at least one token succeeded) or `failed`. On retryable transport failures it leaves the status `pending` and rethrows so BullMQ retries the job (the API enqueues with `attempts: 3`, exponential backoff). Saved-search match evaluation remains post-MLP.
- `src/queues/orphan-cleanup.processor.ts` — stub processor (no MinIO listing / DB scan yet)
- `src/queues/account-purge.processor.ts` — daily repeatable job at 03:00 UTC. Finds users with `deletionScheduledAt <= now`, tombstones PII (`phone → deleted:<id>`, nulls `displayName`/`avatarUrl`), clears `deletionScheduledAt`, and prunes private rows: sessions, TOTP, FCM devices, notification history/preferences, saved searches, favorites, garage, blocked users, dealership memberships, listing drafts. Marketplace content (listings, conversations, messages, reports, audit logs) is retained.

### Push transport (`src/push/`)

- `domain/PushPort.ts` — `PushPort` interface (`send(payload) → PushResult`) and `PUSH_PORT` token. `PushPayload` carries `platform` (`PUSH_PLATFORM` in `domain/types.ts`, mirroring the Prisma `PushPlatform` enum) so the transport can select a provider. Results are `ok`, `INVALID_TOKEN` (permanent, token should be invalidated), `RETRYABLE`, or `PERMANENT`.
- `application/ProcessDirectMessagePush.ts` — pure use-case that fans out a direct-message push to active device tokens, handles `INVALID_TOKEN` invalidation, updates history status, and throws `RetryablePushError` for retryable failures so BullMQ can retry. Because BullMQ retries the whole job, it first reads `NotificationHistoryStore.listSucceededTokens(historyId)` and skips devices an earlier attempt already delivered to, recording them as `{ success: true, skipped: true }` — a retry never sends a duplicate notification.
- `adapters/TestPushTransport.ts` — `PUSH_TRANSPORT=test` implementation. Records every `send()` call in memory and can be configured per-token or with a default result. No external network calls.
- `adapters/FcmApnsPushTransport.ts` — production transport. Routes `ios` device tokens to APNS and `android`/`web` tokens to FCM, and builds the wire data payload. `buildDataPayload` stringifies every job data value and writes the S10 conversation deep link last under the `deepLink` key, so job data can never displace it.
- `adapters/fcm/FcmSender.ts` — `FirebaseFcmSender` wraps a single injected `messaging().send()` function (high-priority Android notification); `createFirebaseSendFn` builds it from service-account credentials under the named app `autotm-push`.
- `adapters/fcm/classifyFcmError.ts` — maps `MessagingErrorCode` values to `PushResult`. `registration-token-not-registered`, `invalid-registration-token`, `installation-id-not-registered`, and `invalid-recipient` are `INVALID_TOKEN`; server/rate/quota/network codes are `RETRYABLE`; everything else, including the ambiguous `invalid-argument`, is `PERMANENT` so a payload defect cannot mass-deactivate devices. A throw with no provider code is `RETRYABLE`.
- `adapters/apns/ApnsSender.ts` — `ParseApnsSender` wraps a single injected node-apn send function; `createApnsSendFn` builds a token-based `apn.Provider` whose host comes from `APNS_PRODUCTION`. `buildApnsNotification` is exported so the wire payload (`deepLink` at the APNS JSON root, beside `aps`) is verifiable without credentials.
- `adapters/apns/classifyApnsResponse.ts` — maps node-apn's `{ sent, failed }` response to `PushResult`. Status 410 and `BadDeviceToken` are `INVALID_TOKEN`; 429, 5xx, and provider-token/idle reasons are `RETRYABLE`; a failure without a status (connection fault) is `RETRYABLE`; remaining rejections such as `DeviceTokenNotForTopic` are `PERMANENT`.
- `adapters/credentials.ts` — `readFcmCredentials` / `readApnsCredentials` assemble the provider credential sets from env. Errors name the variable and never echo key material. PEM parsing itself lives in `src/shared/pem.ts` (`normalizePrivateKey`), which unquotes and expands escaped (`\n`, `\r\n`) values and rejects non-PEM input; it is feature-agnostic because `env.schema.ts` validates the same secrets at boot before any module is wired.
- `adapters/UnconfiguredPushTransport.ts` — permanent-failure placeholder for a selected transport that has no adapter (today only ADR-0009's `ntfy` fallback).
- Result `cause` values are provider code or reason strings, never provider error objects, so credentials cannot reach `NotificationHistory.deliveryDetails` or logs.
- `infrastructure/PrismaPushDeviceStore.ts` — reads active `FcmDevice` rows and invalidates dead tokens with `updateMany`, so a concurrently removed row cannot throw P2025 and abort the job before its history row is written.
- `infrastructure/PrismaNotificationHistoryStore.ts` — updates `NotificationHistory.status` and `deliveryDetails`, and reads back the tokens an earlier attempt delivered to. `deliveryDetails` is free-form JSON, so it is parsed defensively: an unreadable shape yields an empty skip list rather than dropping a push.
- `push.module.ts` — wires the push layer. `createPushPort` resolves `PUSH_PORT` to `TestPushTransport` for `PUSH_TRANSPORT=test` (the default), to `FcmApnsPushTransport` with both provider senders for `fcm-apns`, and to `UnconfiguredPushTransport` otherwise. Provider SDKs and credentials are only touched for `fcm-apns`, so the default boot needs no push secret.

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

- `APP_ENV` — deployed-environment identity (`development` default; `staging`/`production` enable the deployed-env rules below)
- `AUTOTM_COMMIT_SHA` — build-baked commit SHA (from `RAILWAY_GIT_COMMIT_SHA` in `infra/docker/worker.Dockerfile`), default `unknown`
- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string for BullMQ
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` — object storage (used by future media pipelines)
- `PUSH_TRANSPORT` — `test` (S10 default), `fcm-apns`, or `ntfy`. **`test` is rejected when `APP_ENV=production`** (it delivers nothing); `fcm-apns` requires the complete credential set below, and both private keys must parse as PEM, or boot fails
- Push credentials (required together when `PUSH_TRANSPORT=fcm-apns`): `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION` (`"true"`/`"false"`, selects the APNS host explicitly — never derived from `APP_ENV`, because EAS `internal` builds carry production entitlements). `FCM_PRIVATE_KEY` and `APNS_PRIVATE_KEY` may be shell-quoted with escaped `\n` newlines; both are parsed at boot so a malformed secret crashes startup instead of silently failing every send
- Deployed-env rules (`APP_ENV=staging|production`): data endpoints must be valid non-loopback URLs, hosts must not reference the other environment, and default `minioadmin` credentials are forbidden

## Dependencies

- `apps/api` (shared Prisma models via `packages/db`; emits events that worker consumes; API owns the direct-message push decision/enqueue)
- `packages/db`
- `@auto-tm/contracts` (validates the `direct-message` job payload via `DirectMessagePushJobSchema`)
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
- [ADR-0043](../../docs/adr/0043-native-apns-delivery-via-node-apn.md) — Native APNS via `@parse/node-apn`, FCM via `firebase-admin` (**Proposed**)
