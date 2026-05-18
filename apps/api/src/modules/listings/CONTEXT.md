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

## Domain entities (S4 — #86)

All entities live in `apps/api/src/modules/listings/domain/` as pure TypeScript classes with `readonly` fields and constructor invariants:

- `Listing` — root entity. Immutable. Constructor enforces `allowCalls OR allowChat`. State transitions (`markSold`, `archive`, `republish`, `softDelete`) return new instances. `canEditField(field)` returns `false` for `brandId`, `modelId`, `generationId`, `year`, `vin`.
- `ListingDraft` — wizard in-flight state. `payload: Record<string, unknown>` (opaque to domain).
- `ListingMedia` — media metadata. Invariants: `posterKey` and `durationMs` only allowed when `kind === 'video'`.
- `Price` — value object `{ amount: number; currency: Currency }`. Validates `amount > 0`.
- `ExchangeRate` — entity `{ fromCurrency, toCurrency, rate, updatedAt }`. Validates `rate > 0`.
- `ListingStatus` — `type ListingStatus = 'active' | 'sold' | 'archived'` + `canTransition(from, to)` helper.

## Invariants (enforced today)

- `Listing.sellerId` references an existing User (FK; onDelete cascades to listings).
- `Listing.brandId` and `Listing.modelId` reference existing rows in the catalog. **Cross-FK validity** (model.brandId === listing.brandId) is NOT enforced by the schema — must be enforced at application layer in S4.
- `Listing.cityId` references an existing City (FK).
- `Listing.engineTypeId`, `transmissionId`, `driveTypeId` reference catalog lookup tables (FK, onDelete SET NULL).
- `Listing.regionId` references an existing Region (FK, onDelete SET NULL).
- **`allowCalls OR allowChat` must be true** — enforced at domain layer in `Listing` constructor (not schema-level CHECK constraint).
- Soft-delete via `Listing.deletedAt` — listings are never hard-deleted at the schema level.
- `Favorite` unique constraint: a user can favorite a listing at most once.
- `ListingMedia.onDelete: Cascade` — deleting a Listing deletes its media rows.
- `ListingDraft.onDelete: Cascade` — deleting a User deletes their drafts.
- `ExchangeRate` unique constraint: one rate row per `(fromCurrency, toCurrency)` pair.
- **Locked fields post-publish**: `brandId`, `modelId`, `generationId`, `year`, `vin` cannot be edited after publish. Enforced via `Listing.canEditField()`; application layer rejects patches in `EditListing`.
- **State machine transitions** (Phase 1): `active → sold`, `active → archived`, `sold → archived`, `archived → active` (republish). Enforced via `canTransition()` helper.

## Module shape (today)

- `apps/api/src/modules/listings/`:
  - `domain/` — **6 entities + types + 10 ports** (S4 #86)
  - `application/` — 10 use-cases (S4 #88, #89): `CreateDraft`, `UpdateDraft`, `ListMyDrafts`, `DiscardDraft`, `PresignUpload`, `PublishListing`, `MarkSold`, `ArchiveListing`, `RepublishListing`, `DeleteListing`
  - `infrastructure/` — 8 adapters: `NullVinDecoder`, `NullContentClassifier`, `ChronologicalRankingAdapter` (skeleton), `EventEmitterListingEventPublisher` (S4 #86), `PrismaListingDraftRepository`, `PrismaListingRepository` (S4 #89), `PrismaExchangeRateRepository` (S4 #89), `MinioMediaStorageAdapter` (S4 #88)
  - `presentation/listings.controller.ts` — public feed stub + 5 owner mutation endpoints (`publish`, `markSold`, `archive`, `republish`, `delete`)
  - `presentation/DraftsController.ts` — draft CRUD + list my drafts
  - `presentation/UploadsController.ts` — presign upload endpoint
  - `listings.module.ts` — registers null/sync adapters, repositories, and use-cases with DI tokens

## Ports exposed

| Port | Symbol | File | Consumers |
|---|---|---|---|
| `ListingsReadPort` | `LISTINGS_READ_PORT` | `domain/ports/ListingsReadPort.ts` | Cross-context: conversations (S7), subscriptions (S5/S8), notifications (S8), admin (S9) |
| `VinDecoderPort` | `VIN_DECODER_PORT` | `domain/ports/VinDecoderPort.ts` | Internal: `PublishListing` use-case |
| `MediaContentClassifierPort` | `MEDIA_CONTENT_CLASSIFIER_PORT` | `domain/ports/MediaContentClassifierPort.ts` | Internal: `AttachMedia` use-case |
| `ImageVariantGenerator` | `IMAGE_VARIANT_GENERATOR` | `domain/ports/ImageVariantGenerator.ts` | Internal: `AttachMedia` use-case |
| `FeedRankingPort` | `FEED_RANKING_PORT` | `domain/ports/FeedRankingPort.ts` | Internal: `ListFeed` use-case |
| `ExchangeRatePort` | `EXCHANGE_RATE_PORT` | `domain/ports/ExchangeRatePort.ts` | Internal: `PublishListing`, `ListFeed`, `GetListingDetail` |
| `MediaStoragePort` | `MEDIA_STORAGE_PORT` | `domain/ports/MediaStoragePort.ts` | Internal: `PresignUpload`, `AttachMedia` |
| `ListingEventPublisher` | `LISTING_EVENT_PUBLISHER` | `domain/ports/ListingEventPublisher.ts` | Internal: state-transition use-cases |

Repository ports (consumed only within `listings/`):

| Port | Symbol | File |
|---|---|---|
| `ListingRepository` | `LISTING_REPOSITORY` | `domain/ports/ListingRepository.ts` |
| `ListingDraftRepository` | `LISTING_DRAFT_REPOSITORY` | `domain/ports/ListingDraftRepository.ts` |
| `ListingMediaRepository` | `LISTING_MEDIA_REPOSITORY` | `domain/ports/ListingMediaRepository.ts` |

## Ports consumed

- `IdentityCheckPort` from `identity/` (via `IdentityModule` export) — used by controllers to verify ownership.

## Shipped use-cases

- `CreateDraft` — creates `ListingDraft` for authenticated user
- `UpdateDraft` — patches draft payload (idempotent autosave)
- `ListMyDrafts` — paginated list of caller's drafts by `updatedAt DESC`
- `DiscardDraft` — hard-deletes a draft (owner-validated)
- `PresignUpload` — generates presigned MinIO PUT URL with content-type/size enforcement
- `PublishListing` — validates draft payload + FX rate → creates `Listing(active)` + media rows → deletes draft (atomic transaction)
- `MarkSold` — `active → sold`, writes `listing.marked_sold` audit log, emits `ListingSold`
- `ArchiveListing` — `active | sold → archived`, writes `listing.archived` audit log
- `RepublishListing` — `archived → active`, writes `listing.republished` audit log
- `DeleteListing` — soft-delete, preserves media rows, writes `listing.deleted` audit log, emits `ListingDeleted`

Remaining S4 use-cases in #90-#92: `EditListing`, `AttachMedia`, `RemoveMedia`, `ReorderMedia`, `GetListingDetail`, `ListFeed`, `ListMyListings`, `GetExchangeRates`

## HTTP routes

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/api/v1/listings/drafts` | Required | `CreateDraft` |
| PATCH | `/api/v1/listings/drafts/:id` | Required | `UpdateDraft` |
| DELETE | `/api/v1/listings/drafts/:id` | Required | `DiscardDraft` |
| GET | `/api/v1/me/drafts` | Required | `ListMyDrafts` |
| POST | `/api/v1/uploads/presign` | Required | `PresignUpload` |
| POST | `/api/v1/listings/drafts/:id/publish` | Required | `PublishListing` |
| POST | `/api/v1/listings/:id/sold` | Required | `MarkSold` |
| POST | `/api/v1/listings/:id/archive` | Required | `ArchiveListing` |
| POST | `/api/v1/listings/:id/republish` | Required | `RepublishListing` |
| DELETE | `/api/v1/listings/:id` | Required | `DeleteListing` |

## Events emitted

- `ListingCreated` — emitted by `PublishListing` after transaction commit (no in-process consumers in S4; S5 subscriptions will consume)
- `ListingSold` — emitted by `MarkSold` after DB update (no in-process consumers in S4; S7 conversations will consume)
- `ListingDeleted` — emitted by `DeleteListing` after soft-delete (no in-process consumers in S4)

Future events (not yet emitted):
- `ListingUpdated` — will be emitted by `EditListing` (#90)

## Events consumed

- (none today)

## Audit log actions written

- `listing.published` — `{ brandId, modelId, cityId, priceAmount, priceCurrency }`
- `listing.marked_sold` — `{ priceAmount, priceCurrency, daysActive }`
- `listing.archived` — `{ previousStatus }`
- `listing.republished` — `{ previousArchivedAt }`
- `listing.deleted` — `{ status, mediaCount }`

Future audit actions:
- `listing.price_changed` — will be written by `EditListing` (#90)

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are NOT in CONTEXT.md as if they exist today. Authoritative spec for each lives in the named sprint file or PRD feature.

- **S4 (Listings CRUD) — domain + ports + null adapters shipped in #86**; draft use-cases + controller in #88; publish + state transitions + audit log in #89; remaining S4 work: `EditListing` + read use-cases + media use-cases + feed ranking (#90-#92)
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
