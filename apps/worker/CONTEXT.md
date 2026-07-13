# apps/worker — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Most worker jobs are stub processors today; full video transcode, push delivery, and broad orphan-cleanup pipelines are post-MLP unless required by a shaped beta reliability issue.

## Purpose

NestJS standalone worker. Consumes BullMQ queues from Redis and runs CPU-bound or fire-and-forget work outside the request path. Hosted on Server A (or moves to a dedicated box if load grows).

## What it contains (today)

### Stack

- `@nestjs/bullmq@^11.0.0` + `bullmq@^5.34.0` + `ioredis@^5.4.2` for queue infrastructure
- `nestjs-pino` for logging
- `zod` for env-schema validation (`src/env.schema.ts`)
- `@auto-tm/db` and `@auto-tm/contracts` workspace deps
- No `sharp` (image variants) dep yet
- No `firebase-admin` / FCM dep yet
- No `@aws-sdk/client-s3` / MinIO dep yet (image+video pipeline doesn't fetch/push to MinIO today)
- No `ffmpeg-static` or video toolchain yet

### Queue processors (today)

- `src/queues/video-transcode.processor.ts` — stub processor (no ffmpeg integration yet)
- `src/queues/notification-fanout.processor.ts` — handles `direct-message` jobs from the `notification-fanout` queue. Validates the payload against `DirectMessagePushJobSchema`, fetches the recipient's active `FcmDevice` rows, calls the configured `PushPort` per token, records per-token results in `NotificationHistory.deliveryDetails`, and updates `NotificationHistory.status` to `delivered` or `failed`. Saved-search match evaluation remains post-MLP.
- `src/queues/orphan-cleanup.processor.ts` — stub processor (no MinIO listing / DB scan yet)
- `src/queues/account-purge.processor.ts` — daily repeatable job at 03:00 UTC. Finds users with `deletionScheduledAt <= now`, tombstones PII (`phone → deleted:<id>`, nulls `displayName`/`avatarUrl`), clears `deletionScheduledAt`, and prunes private rows: sessions, TOTP, FCM devices, notification history/preferences, saved searches, favorites, garage, blocked users, dealership memberships, listing drafts. Marketplace content (listings, conversations, messages, reports, audit logs) is retained.

### Push transport (`src/push/`)

- `domain/PushPort.ts` — `PushPort` interface (`send(payload) → PushResult`) and `PUSH_PORT` token. Results are `ok`, `INVALID_TOKEN` (permanent, token should be invalidated), `RETRYABLE`, or `PERMANENT`.
- `application/ProcessDirectMessagePush.ts` — pure use-case that fans out a direct-message push to active device tokens, handles `INVALID_TOKEN` invalidation, updates history status, and throws `RetryablePushError` for retryable failures so BullMQ can retry.
- `adapters/TestPushTransport.ts` — `PUSH_TRANSPORT=test` implementation. Records every `send()` call in memory and can be configured per-token or with a default result. No external network calls.
- `adapters/FcmApnsPushTransport.ts` — production shell that returns `PERMANENT` failure because FCM/APNS credentials are not wired in S10.
- `infrastructure/PrismaPushDeviceStore.ts` — reads active `FcmDevice` rows and invalidates dead tokens.
- `infrastructure/PrismaNotificationHistoryStore.ts` — updates `NotificationHistory.status` and `deliveryDetails`.
- `push.module.ts` — wires the push layer. `PUSH_PORT` resolves to `TestPushTransport` when `PUSH_TRANSPORT=test` (the S10 default) and to `FcmApnsPushTransport` otherwise.

### Other

- `src/main.ts` boots NestJS worker app
- `src/app.module.ts` wires modules, including `PushModule`
- `src/common/prisma.module.ts` — Prisma access module

## Public surface

None — worker is internal. Only Redis (queues) + Postgres + MinIO connections (MinIO when image+video pipelines actually ship).

## Environment variables

- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string for BullMQ
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` — object storage (used by future media pipelines)
- `PUSH_TRANSPORT` — `test` (S10 default), `fcm-apns`, or `ntfy`
- Optional production transport env names (not consumed until credentials are wired): `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_SIGNING_KEY`

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
  - `firebase-admin` dep for FCM (and APNS HTTP/2 layer) when production credentials are wired
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
