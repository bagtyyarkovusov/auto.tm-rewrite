# ADR-0008: Media upload + serving pipeline

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

Listings live or die on photos and videos. Auto.ru shows this clearly — image-heavy detail pages with multiple variants. We need:

- Fast uploads on slow TM mobile data
- Multiple variants per image (thumbnail / list / detail / fullscreen)
- Short listing video support (≤60s, ≤720p)
- Air-gap-friendly (no Bunny Stream / Mux / Cloudinary)
- Direct-from-client uploads (don't bottleneck through API)

## Decision

### Storage: MinIO (self-hosted)

- S3-compatible API — works with `@aws-sdk/client-s3` unchanged
- Runs as Docker container on Server A
- Volume-mounted persistent storage (`/minio-data`)
- Buckets:
  - `listing-photos`
  - `listing-videos`
  - `chat-attachments`
  - `user-avatars`
  - `inspection-reports` (Phase 2)
  - `orbit-photos` (Phase 3)

### Upload path: presigned URL → direct to MinIO

1. Client requests `POST /api/v1/uploads/<kind>` with file metadata
2. API returns `{ uploadUrl, key, expiresIn: 600 }` — a presigned MinIO PUT URL valid 10 min
3. Client `PUT`s file directly to MinIO via the presigned URL
4. Client confirms upload with `POST /api/v1/listings/:id/photos { key }`
5. API enqueues background variant generation

**Rationale:** API never holds bytes — bandwidth-bound concerns scale independently of CPU-bound API work.

### Image variants — eager (on upload)

Worker generates 4 variants per uploaded photo using Sharp:

| Variant | Size | Use |
|---|---|---|
| `thumbnail` | 200×200 cover | Avatar-like contexts |
| `list` | 600×400 cover | Listing card in feed |
| `detail` | 1200×800 contain | Listing detail screen |
| `fullscreen` | 2400×1600 contain | Pinch-to-zoom |

Each variant produced as both **JPEG** (quality 85) and **WebP** (quality 80). Client picks based on `Accept` header.

### Video pipeline — async worker

1. Client compresses with `react-native-compressor`: ≤60s, 720p, ~1 Mbps H.264, ~7-10 MB max
2. Direct presigned upload to MinIO
3. API enqueues video transcode job (BullMQ + Redis)
4. `apps/worker` picks up job, runs ffmpeg:
   - HLS variants at 320p + 720p (adaptive bitrate)
   - Poster frame extracted at 2s mark
   - Original kept for archival
5. Worker updates `Listing.videoStatus = 'ready'` and pushes notification

Mobile playback: `expo-video` (supports HLS natively).
Web playback: standard HTML5 `<video>` with HLS.js.

### Client-side compression — mandatory

- **Photos**: `expo-image-manipulator` resizes to max 2400px wide, JPEG quality 80 — typical 400-800 KB
- **Videos**: `react-native-compressor` enforces ≤60s + 720p + ~1 Mbps — typical 7-10 MB for 60s

Hard caps enforced **both** client-side (better UX) and server-side (security). Server rejects oversized uploads.

### Serving — Caddy in front of MinIO

- All media served at `https://media.auto.tm/<bucket>/<key>`
- Caddy reverse-proxies to MinIO, adds:
  - `Cache-Control: public, max-age=31536000, immutable` on variant URLs (object keys include hash)
  - TLS termination
  - HTTP/2 + HTTP/3
- No on-the-fly resizing — variants pre-generated

### Orphan cleanup

Nightly cron in worker:
- Scan MinIO for objects > 24h old with no DB reference
- Delete

Prevents storage bloat from abandoned uploads.

## Consequences

### Positive
- API not a bandwidth bottleneck
- 4 image variants per upload = perfect-size image always served
- HLS for video gives adaptive playback over slow TM mobile networks
- Self-hosted = no third-party billing surprises
- One pipeline serves all media types

### Negative / accepted costs
- 4× storage cost per image (acceptable: storage is cheap, latency is precious)
- Server-side ffmpeg load — at 100+ videos/day we'll need a dedicated worker box (acceptable: Phase 1 expected <50/day)
- Self-hosted MinIO has no global CDN fallback (acceptable: TM-only users, single TM origin)

### Neutral
- We accept that Phase 1 has no AI-driven photo enhancements (background removal, color correction). Those are Phase 3+ if ever.

## Alternatives considered

- **Through-API upload** — rejected: bandwidth bottleneck, kills API CPU during big uploads.
- **Lazy variant generation** — rejected: first request latency unacceptable; storage saving doesn't matter at this scale.
- **Bunny Stream / Mux** — rejected per ADR-0005 (air-gap).
- **No video support** — rejected: auto.ru shows it works; competitive necessity.

## References

- Charter §11 (media handling)
- Related: ADR-0005 (hosting), ADR-0010 (worker observability)
