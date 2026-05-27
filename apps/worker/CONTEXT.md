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
- `src/queues/notification-fanout.processor.ts` — stub processor (no saved-search match algorithm yet)
- `src/queues/orphan-cleanup.processor.ts` — stub processor (no MinIO listing / DB scan yet)

### Other

- `src/main.ts` boots NestJS worker app
- `src/app.module.ts` wires modules
- `src/common/prisma.module.ts` — Prisma access module (currently commented out at the consumer level per issue #16)

## Public surface

None — worker is internal. Only Redis (queues) + Postgres + MinIO connections (MinIO when image+video pipelines actually ship).

## Dependencies

- `apps/api` (shared Prisma models via `packages/db`; emits events that worker consumes)
- `packages/db`
- Redis (BullMQ)
- MinIO (S3 SDK — to be added when image+video pipelines ship)

## Planned additions (future sprints)

Per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md):

- **MLP image reliability** — queued image variant generation may be shaped in S8 only if API-request lifecycle Sharp generation becomes a beta reliability problem:
  - New `src/queues/image-variants.processor.ts` processor
  - `sharp` dep for variant generation (thumbnail / list / detail / fullscreen × JPEG + WebP)
  - `@aws-sdk/client-s3` dep for MinIO read/write
  - Consumes `image-variants` queue → reads from `listing-photos` bucket → writes variants back → updates `ListingMedia` row
- **Post-MLP video pipeline** — video transcoding remains deferred unless a future media bet is shaped:
  - `ffmpeg-static` dep + ffmpeg toolchain
  - Pull source from `listing-videos` MinIO bucket → produce HLS at 320p + 720p + poster at 2s
  - Add any required video processing status fields in the sprint that owns video UX
- **Post-MLP notifications** — Push delivery + notification fan-out:
  - New `src/queues/push.processor.ts` processor
  - `firebase-admin` dep for FCM (and APNS HTTP/2 layer)
  - Saved-search match fan-out (extend existing `notification-fanout` stub):
    - Consume `ListingCreated` events / queue jobs → query `SavedSearch` table → respect per-search debounce → enqueue per-recipient push jobs
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
