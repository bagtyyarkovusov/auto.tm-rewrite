# apps/worker — CONTEXT

## Purpose

NestJS standalone worker. Consumes BullMQ queues from Redis and runs CPU-bound or fire-and-forget work outside the request path. Hosted on Server A (or moves to a dedicated box if load grows).

## What it does

### Video transcoding

- Consumes `video-transcode` queue jobs
- Pulls source video from MinIO (`listing-videos` bucket)
- Runs ffmpeg to produce:
  - HLS playlist + segments at 320p + 720p
  - Poster frame at 2s mark
- Writes outputs back to MinIO
- Updates `Listing.videoStatus` and emits `VideoReady` event

### Image variant generation

- Consumes `image-variants` queue jobs
- Pulls source from MinIO (`listing-photos` bucket)
- Runs Sharp to produce thumbnail / list / detail / fullscreen variants in JPEG + WebP
- Writes outputs back to MinIO
- Updates `ListingMedia` row

### Saved-search match fan-out

- Consumes `notification-fanout` queue jobs (triggered by `ListingCreated` event)
- Queries `SavedSearch` table for matches
- Respects per-search debounce (1/hr)
- Enqueues per-recipient push jobs

### Push delivery

- Consumes `push` queue jobs
- Calls FCM / APNS / ntfy via `PushPort`
- Records result in `NotificationHistory.deliveryDetails`

### Orphan media cleanup

- Cron schedule (nightly 03:00 TM time)
- Lists MinIO objects with no DB reference > 24h old
- Deletes them

### Uptime probes

- Cron every 60s
- Hits `/healthz` on `apps/api`, `apps/admin`, `apps/web`, `apps/sms-gateway`
- Writes results to Prometheus

## Public surface

None — worker is internal. Only Redis (queues) + Postgres + MinIO connections.

## Dependencies

- `apps/api` (shared Prisma models via `packages/db`)
- `packages/db`
- Redis (BullMQ)
- MinIO (S3 SDK)

## Notable decisions

- [ADR-0008](../../docs/adr/0008-media.md) — Async video pipeline
- [ADR-0009](../../docs/adr/0009-notifications.md) — Push fan-out
- [ADR-0010](../../docs/adr/0010-testing-obs.md) — Uptime probes via worker
