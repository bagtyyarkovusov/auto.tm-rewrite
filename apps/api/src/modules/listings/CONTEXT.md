# listings — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in [`docs/prd/features/32-listings.md`](../../../../../docs/prd/features/32-listings.md) and the relevant sprint files under [`docs/prd/sprints/`](../../../../../docs/prd/sprints/).

## Purpose

Car ads — the core economic object. Listings have specs, photos, optional video, location, price, and a seller (User).

## Owns (entities + tables)

> Schema today is intentionally skinny — the full PRD-defined Listing shape ships in S4 (Listings CRUD). See "Planned additions" below for the gap between current schema and the S4 target.

- `Listing` — id, sellerId (FK → User), status (`ListingStatus` enum: draft | pending_review | active | sold | archived | rejected; default draft), brandId (FK → Brand), modelId (FK → Model), generationId? (FK → Generation), colorId? (FK → Color), bodyTypeId? (FK → BodyType), cityId (FK → City), year?, mileageKm?, priceAmount (Float), priceCurrency (`Currency` enum: TMT | USD | AED; default TMT), description?, deletedAt?, publishedAt?, createdAt, updatedAt. Indexes on `(status, publishedAt DESC)`, `(brandId, modelId, status)`, `(cityId, status)`.
- `ListingMedia` — id, listingId (FK → Listing, onDelete: Cascade), kind (`MediaKind` enum: image | video), url, sortOrder, createdAt. Index on `(listingId, sortOrder)`.
- `Favorite` — id, userId (FK → User, Cascade), listingId (FK → Listing, Cascade), createdAt. Unique on `(userId, listingId)`.

## Invariants (enforced today)

- `Listing.sellerId` references an existing User (FK; onDelete cascades to listings).
- `Listing.brandId` and `Listing.modelId` reference existing rows in the catalog. **Cross-FK validity** (model.brandId === listing.brandId) is NOT enforced by the schema — must be enforced at application layer in S4.
- `Listing.cityId` references an existing City (FK).
- Soft-delete via `Listing.deletedAt` — listings are never hard-deleted at the schema level.
- `Favorite` unique constraint: a user can favorite a listing at most once.
- `ListingMedia.onDelete: Cascade` — deleting a Listing deletes its media rows.

## Module shape (today)

- `apps/api/src/modules/listings/`:
  - `domain/` — empty (S4 adds entities + ports)
  - `application/` — empty (S4 adds use-cases)
  - `infrastructure/` — empty (S4 adds Prisma repositories)
  - `presentation/listings.controller.ts` — stub controller (no real endpoints yet)
  - `listings.module.ts` — registers `ListingsController` only

## Ports exposed

- (none today — S4 adds `ListingsReadPort` for cross-context reads)

## Ports consumed

- (none today)

## Shipped use-cases

- (none today — S4 ships the full CRUD set: `CreateDraft`, `PublishListing`, `EditListing`, `MarkSold`, `DeleteListing`, `AttachMedia`, `ListFeed`)

## Events emitted

- (none today)

## Events consumed

- (none today)

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are NOT in CONTEXT.md as if they exist today. Authoritative spec for each lives in the named sprint file or PRD feature.

- **S4 (Listings CRUD)** — `docs/prd/sprints/sprint-04-listings-crud.md` (scope refined 2026-05-18 via pre-S4 grill — see `sprint-04-listings-crud-pre-retro.md`). Schema additions to `Listing`:
  - `vin?` (String) — locked post-publish
  - `condition` enum (`new` | `used`)
  - `engineTypeId?`, `transmissionId?`, `driveTypeId?` (FKs → new catalog lookup entities; trilingual)
  - `enginePower?` (Int — kW or hp)
  - `regionId` (FK → Region; redundant given cityId but indexes regional filter queries)
  - `locationText?` (free-form location detail beyond city)
  - `soldAt?` (DateTime — used by 14-day query-time fade filter in `ChronologicalRankingAdapter`)
  - `viewCount Int @default(0)`, `favoriteCount Int @default(0)` — denormalized; not incremented in S4; consumed by S19 ranking
  - `contactPhone?` (String) — override of `seller.phoneE164`
  - `allowCalls Boolean @default(true)`, `allowChat Boolean @default(true)` — must be `(allowCalls OR allowChat)`
  - Status enum adds `reported` + `banned` (for S9 admin moderation activation); Phase 1 only writes `active`/`sold`/`archived`/`rejected` values
  - New entities: `ListingDraft` (JSON-payload wizard state, separate from `Listing`), `ExchangeRate` (admin-managed FX table)
  - `ListingMedia` changes: rename `url`→`key` (destructive — table empty today); add `width?`, `height?`, `durationMs?`, `posterKey?`
  - Ports: `ListingsReadPort` (cross-context summary reads), `VinDecoderPort` + `NullVinDecoder` adapter, `MediaContentClassifierPort` + `NullContentClassifier`, `FeedRankingPort` + `ChronologicalRankingAdapter` (per [ADR-0021](../../../../../docs/adr/0021-feed-ranking-port.md)), `ExchangeRatePort`, `ImageVariantGenerator` (sync Sharp in S4; async swap in S8), `MediaStoragePort`
  - 8 listing use-cases (`CreateDraft`, `UpdateDraft`, `PublishListing`, `EditListing`, `MarkSold`, `ArchiveListing`, `RepublishListing`, `DeleteListing`) + 4 media + 5 read use-cases
  - Events emitted: `ListingCreated`, `ListingUpdated`, `ListingSold`, `ListingDeleted` (no in-process consumers in S4; S5/S7/S9 subscribe later)
  - Edit invariants: `brandId`, `modelId`, `generationId`, `year`, `vin` locked post-publish
  - 14-day-sold-fade: query-time filter in S4; physical archival cron in S8
- **S5 (Listings UX)** — saved-search match consumers, Favorite UX, filter sheet (forward-defined `filters` param in `ListFeed` already in place), availability hours for contact prefs
- **S6 (Garage + Dealership)** — dealership posting (`dealershipId?` + `publishedAsDealership` columns + cross-context port + wizard step), Sell-from-Garage entry tile + pre-fill, OwnedVehicle redesign (FK columns + status enum), bi-directional Listing↔Garage sync, dealership PRO badge on detail
- **S7 (Conversations)** — listing-detail Message button becomes functional; chat threads consume `ListingSold` event to auto-close
- **S8 (Notifications + Subscriptions)** — `ListingCreated` event consumer for saved-search match; sold-listing auto-archive cron; async variant generation via worker (`QueuedImageVariantGenerator`); video HLS pipeline (ffmpeg + poster frame); MinIO orphan cleanup cron
- **S9 (Admin)** — `ListingReported` event + admin moderation queue + report-button UI + `reported`/`banned` status activation + `AdminEditListing` (locked-field override) + admin FX rate write UI + `UserSuspended` consumer to auto-archive listings
- **Phase 2 (S11-S16 — Trust layer)** — `MlContentClassifier` (NudeNet + YOLO + pHash) replaces `NullContentClassifier`; inspected-listing tier system + tier-invalidate-on-structural-edit; flipper-detection signals; "First owner" claim; phone-number-reuse detection; edit-triggered re-review; "Photos by AutoTM" pro media attribution adds `ListingMedia.uploadedByUserId` + `uploadedByStaff`; `TmProxyVinDecoder` replaces `NullVinDecoder`; Phase 2 purge cron hard-deletes old soft-deleted listings + their media
- **S19 (Phase 3 — Ranking refinements)** — `PersonalizedRankingAdapter` replaces `ChronologicalRankingAdapter` per [ADR-0021](../../../../../docs/adr/0021-feed-ranking-port.md); recency decay + completeness + trending + personalization + sort tabs (Newest / Cheapest / Closest)
- **Phase 3 (S17)** — 360° orbit photos (`ListingMedia.kind = orbit`)

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Listings is its own context
- [ADR-0008](../../../../../docs/adr/0008-media.md) — Direct-to-MinIO upload, eager variants
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state, not aspirational spec
- [ADR-0021](../../../../../docs/adr/0021-feed-ranking-port.md) — Feed ranking via port abstraction; S4 ships `ChronologicalRankingAdapter`, S19 ships `PersonalizedRankingAdapter`
