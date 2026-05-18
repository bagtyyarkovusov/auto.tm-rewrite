# listings — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in [`docs/prd/features/32-listings.md`](../../../../../docs/prd/features/32-listings.md) and the relevant sprint files under [`docs/prd/sprints/`](../../../../../docs/prd/sprints/).

## Purpose

Car ads — the core economic object. Listings have specs, photos, optional video, location, price, and a seller (User).

## Owns (entities + tables)

- `Listing` — id, sellerId (FK → User), status (`ListingStatus` enum: draft | pending_review | active | sold | archived | rejected | reported | banned; default draft), brandId (FK → Brand), modelId (FK → Model), generationId? (FK → Generation), colorId? (FK → Color), bodyTypeId? (FK → BodyType), cityId (FK → City), year?, mileageKm?, priceAmount (Float), priceCurrency (`Currency` enum: TMT | USD | AED; default TMT), description?, deletedAt?, publishedAt?, createdAt, updatedAt. **S4 schema additions**: vin?, condition (`ListingCondition` enum: new | used), engineTypeId? (FK → EngineType), transmissionId? (FK → Transmission), driveTypeId? (FK → DriveType), enginePower?, regionId? (FK → Region), locationText?, soldAt?, viewCount (Int @default(0)), favoriteCount (Int @default(0)), contactPhone?, allowCalls (Boolean @default(true)), allowChat (Boolean @default(true)). Indexes on `(status, publishedAt DESC)`, `(brandId, modelId, status)`, `(cityId, status)`.
- `ListingMedia` — id, listingId (FK → Listing, onDelete: Cascade), kind (`MediaKind` enum: image | video), **key** (String — MinIO object key), sortOrder, width?, height?, durationMs?, posterKey?, createdAt. Index on `(listingId, sortOrder)`.
- `ListingDraft` — id, userId (FK → User, onDelete: Cascade), payload (Json), createdAt, updatedAt. Index on `(userId, updatedAt DESC)`.
- `ExchangeRate` — id, fromCurrency (`Currency`), toCurrency (`Currency`), rate (Float), updatedAt, setByUserId?. Unique on `(fromCurrency, toCurrency)`.
- `Favorite` — id, userId (FK → User, Cascade), listingId (FK → Listing, Cascade), createdAt. Unique on `(userId, listingId)`.

## Invariants (enforced today)

- `Listing.sellerId` references an existing User (FK; onDelete cascades to listings).
- `Listing.brandId` and `Listing.modelId` reference existing rows in the catalog. **Cross-FK validity** (model.brandId === listing.brandId) is NOT enforced by the schema — must be enforced at application layer in S4.
- `Listing.cityId` references an existing City (FK).
- `Listing.engineTypeId`, `transmissionId`, `driveTypeId` reference catalog lookup tables (FK, onDelete SET NULL).
- `Listing.regionId` references an existing Region (FK, onDelete SET NULL).
- `allowCalls OR allowChat` must be true — enforced at application layer (not schema-level CHECK constraint).
- Soft-delete via `Listing.deletedAt` — listings are never hard-deleted at the schema level.
- `Favorite` unique constraint: a user can favorite a listing at most once.
- `ListingMedia.onDelete: Cascade` — deleting a Listing deletes its media rows.
- `ListingDraft.onDelete: Cascade` — deleting a User deletes their drafts.
- `ExchangeRate` unique constraint: one rate row per `(fromCurrency, toCurrency)` pair.

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

- **S4 (Listings CRUD) — schema shipped in #85**; remaining S4 work: domain entities + ports + use-cases + controllers + contracts (issues #86 onward)
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
