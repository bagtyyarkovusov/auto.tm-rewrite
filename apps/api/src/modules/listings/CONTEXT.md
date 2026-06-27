# listings — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in [`docs/prd/features/32-listings.md`](../../../../../docs/prd/features/32-listings.md) and the relevant sprint files under [`docs/prd/sprints/`](../../../../../docs/prd/sprints/).

## Purpose

Car ads — the core economic object. Listings have specs, photos, optional video, location, price, and a seller (User).

## Owns (entities + tables)

- `Listing` — id, sellerId (FK → User), status (`ListingStatus` enum: draft | pending_review | active | sold | archived | rejected | reported | banned; default draft), brandId (FK → Brand), modelId (FK → Model), generationId? (scalar ID; no Prisma relation today), colorId? (scalar ID; no Prisma relation today), bodyTypeId? (scalar ID; no Prisma relation today), cityId (FK → City), year?, mileageKm?, priceAmount (Float), priceCurrency (`Currency` enum: TMT | USD | AED; default TMT), description?, deletedAt?, publishedAt?, createdAt, updatedAt. **S4 schema additions**: vin?, condition? (`ListingCondition` enum: new | used; nullable at DB level, required by `PublishListing`), engineTypeId? (FK → EngineType), transmissionId? (FK → Transmission), driveTypeId? (FK → DriveType), enginePower?, regionId? (FK → Region), locationText?, soldAt?, viewCount (Int @default(0)), favoriteCount (Int @default(0)), contactPhone?, allowCalls (Boolean @default(true)), allowChat (Boolean @default(true)), acceptsExchange (Boolean @default(false)), installmentAvailable (Boolean @default(false)). Indexes on `(status, publishedAt DESC)`, `(brandId, modelId, status)`, `(cityId, status)`.
- `ListingMedia` — id, listingId (FK → Listing, onDelete: Cascade), kind (`MediaKind` enum: image | video), **key** (String — MinIO object key), sortOrder, width?, height?, durationMs?, posterKey?, createdAt. Index on `(listingId, sortOrder)`.
- `ListingDraft` — id, userId (FK → User, onDelete: Cascade), payload (Json), createdAt, updatedAt. Index on `(userId, updatedAt DESC)`.
- `ExchangeRate` — id, fromCurrency (`Currency`), toCurrency (`Currency`), rate (Float), updatedAt, setByUserId?. Unique on `(fromCurrency, toCurrency)`.
- `Favorite` — id, userId (FK → User, Cascade), listingId (FK → Listing, Cascade), createdAt. Unique on `(userId, listingId)`.

## Domain entities (S4 — #86)

All entities live in `apps/api/src/modules/listings/domain/` as pure TypeScript classes with `readonly` fields and constructor invariants:

- `Listing` — root entity. Immutable. Constructor enforces `allowCalls OR allowChat`. State transitions (`markSold`, `archive`, `republish`, `softDelete`) return new instances. `canEditField(field)` returns `false` for `brandId`, `modelId`, `generationId`, `year`, `vin`. Includes `acceptsExchange` and `installmentAvailable` booleans.
- `ListingDraft` — wizard in-flight state. `payload: Record<string, unknown>` (opaque to domain).
- `ListingMedia` — media metadata. Invariants: `posterKey` and `durationMs` only allowed when `kind === 'video'`.
- `Price` — value object `{ amount: number; currency: Currency }`. Validates `amount > 0`.
- `ListingFilter` — value object. `static create(criteria)` validates price range (`priceMin ≤ priceMax`), year range (`yearMin ≤ yearMax`), and condition (`new` | `used`). Immutable; `toCriteria()` returns a copy; `isEmpty()` when no field is set.
- `ExchangeRate` — entity `{ fromCurrency, toCurrency, rate, updatedAt }`. Validates `rate > 0`.
- `Favorite` — entity `{ id, userId, listingId, createdAt }`. Immutable. Created via `Favorite.create()`.
- `ListingStatus` — `type ListingStatus = 'active' | 'sold' | 'archived' | 'banned'` + `canTransition(from, to)` helper. `banned` has no owner transitions; admin ban/unban bypasses `canTransition` via `ListingsAdminPort`.

## Invariants (enforced today)

- `Listing.sellerId` references an existing User (FK; onDelete cascades to listings).
- `Listing.brandId` and `Listing.modelId` reference existing rows in the catalog. **Cross-catalog consistency** (`model.brandId === listing.brandId`, `generation.modelId === listing.modelId`) is NOT enforced by the schema or application layer today.
- `Listing.cityId` references an existing City (FK).
- `Listing.generationId`, `colorId`, and `bodyTypeId` are nullable scalar catalog IDs today; Prisma does not model FK relations for these three fields yet.
- `Listing.engineTypeId`, `transmissionId`, and `driveTypeId` reference catalog lookup tables as nullable FKs.
- `Listing.regionId` references an existing Region as a nullable FK.
- **`allowCalls OR allowChat` must be true** — enforced at domain layer in `Listing` constructor (not schema-level CHECK constraint).
- **`acceptsExchange`** and **`installmentAvailable`** are simple seller-declared booleans persisted on `Listing`; no financing workflow or exchange matching in S4.
- Soft-delete via `Listing.deletedAt` — listings are never hard-deleted at the schema level.
- `Favorite` unique constraint: a user can favorite a listing at most once.
- `ListingMedia.onDelete: Cascade` — deleting a Listing deletes its media rows.
- `ListingDraft.onDelete: Cascade` — deleting a User deletes their drafts.
- `ExchangeRate` unique constraint: one rate row per `(fromCurrency, toCurrency)` pair.
- **Locked fields post-publish**: `brandId`, `modelId`, `generationId`, `year`, `vin` cannot be edited after publish. Enforced via `Listing.canEditField()`; application layer rejects patches in `EditListing`.
- **State machine transitions** (Phase 1): `active → sold`, `active → archived`, `sold → archived`, `archived → active` (republish). Enforced via `canTransition()` helper. `banned` has no owner transitions; admin ban/unban bypasses `canTransition` via `ListingsAdminPort`.
- **Banned listing enforcement** (S7): `banned` listings are omitted from public feed/search/favorites (`ChronologicalRankingAdapter` and `PrismaListingsReadRepository` exclude `banned`). Non-owner public detail reads return `NOT_FOUND`. Owner-scoped surfaces (`/me/listings`, owner detail) show the listing with `status: "banned"` (frontend renders generic banned notice). Owner mutations (`EditListing`, `MarkSold`, `ArchiveListing`, `RepublishListing`, `DeleteListing`, `AttachMedia`, `RemoveMedia`, `ReorderMedia`) are blocked with `FORBIDDEN` while banned. New contact/messages for banned listings are blocked via `conversations/` synchronous state checks (`getListingSummary` excludes `banned`).
- **Suspended-user enforcement** (S7): authenticated marketplace mutations in `listings/` are blocked for suspended users (`CreateDraft`, `UpdateDraft`, `DiscardDraft`, `PresignUpload`, `PublishListing`, `EditListing`, `MarkSold`, `ArchiveListing`, `RepublishListing`, `DeleteListing`, `AttachMedia`, `RemoveMedia`, `ReorderMedia`, `AddFavorite`, `RemoveFavorite`) via `IdentityCheckPort.isSuspended` checks in controllers. Returns HTTP 403 `FORBIDDEN` with `details.reason = "USER_SUSPENDED"`. Reads (`ListFeed`, `GetListingDetail`, `ListMyListings`, `ListMyDrafts`, `ListMyFavorites`) remain available.

## Module shape (today)

- `apps/api/src/modules/listings/`:
  - `domain/` — **7 entity/value-object classes + `ListingStatus` helper + types + 12 ports** (S4 #86, S5 #154, S8 #188)
  - `application/` — 22 use-cases (S4 #88-#92, S8 #188): `CreateDraft`, `UpdateDraft`, `ValidateDraftStep`, `ListMyDrafts`, `DiscardDraft`, `PresignUpload`, `PublishListing`, `MarkSold`, `ArchiveListing`, `RepublishListing`, `DeleteListing`, `EditListing`, `AttachMedia`, `RemoveMedia`, `ReorderMedia`, `GetListingDetail`, `ListFeed`, `ListMyListings`, `GetExchangeRates`, `AddFavorite`, `RemoveFavorite`, `ListMyFavorites`
  - `infrastructure/` — 13 adapters: `NullVinDecoder`, `NullContentClassifier`, `ChronologicalRankingAdapter` (full implementation per [ADR-0021](../../../../../docs/adr/0021-feed-ranking-port.md); applies `ListingFilterCriteria` including FX-aware price filtering via injected `ExchangeRatePort`), `EventEmitterListingEventPublisher` (S4 #86), `PrismaListingDraftRepository`, `PrismaListingRepository` (S4 #89), `PrismaListingMediaRepository` (S4 #91), `PrismaExchangeRateRepository` (S4 #89), `PrismaListingsReadRepository` (cross-context read surface), `PrismaListingsAdminRepository` (S7 — transaction-scoped `ListingsAdminPort` adapter for admin ban/unban), `PrismaFavoriteRepository` (S8 #188), `MinioMediaStorageAdapter` (S4 #88), `SharpImageVariantGenerator` (S4 #91)
  - `presentation/listings.controller.ts` — listings health check, public feed + detail, owner publish/state/edit/delete endpoints, and media attach/remove/reorder endpoints
  - `presentation/DraftsController.ts` — draft CRUD + validate-step + list my drafts
  - `presentation/UploadsController.ts` — presign upload endpoint
  - `presentation/MyListingsController.ts` — `/me/listings` (owner-scoped)
  - `presentation/ExchangeRatesController.ts` — `/exchange-rates` (public)
  - `presentation/FavoritesController.ts` — `POST/DELETE /api/v1/listings/:id/favorite`, `GET /api/v1/favorites`
  - `listings.module.ts` — registers null/sync adapters, repositories, and use-cases with DI tokens; imports `IdentityModule` for `IdentityCheckPort.isSuspended` enforcement in controllers

## Ports exposed

| Port | Symbol | File | Consumers |
|---|---|---|---|
| `ListingsReadPort` | `LISTINGS_READ_PORT` | `domain/ports/ListingsReadPort.ts` | Cross-context: contact seller (S6), minimal admin (S7), post-MLP subscriptions/notifications |
| `ListingsAdminPort` | `LISTINGS_ADMIN_PORT` | `domain/ports/ListingsAdminPort.ts` | Cross-context: `admin/` S7 moderation (`BanListing`, `UnbanListing`) — transaction-scoped `banActiveListing` / `unbanBannedListing` |
| `VinDecoderPort` | `VIN_DECODER_PORT` | `domain/ports/VinDecoderPort.ts` | Internal: `PublishListing` use-case |
| `MediaContentClassifierPort` | `MEDIA_CONTENT_CLASSIFIER_PORT` | `domain/ports/MediaContentClassifierPort.ts` | Internal: `AttachMedia` use-case |
| `ImageVariantGenerator` | `IMAGE_VARIANT_GENERATOR` | `domain/ports/ImageVariantGenerator.ts` | Internal: `AttachMedia` use-case |
| `FeedRankingPort` | `FEED_RANKING_PORT` | `domain/ports/FeedRankingPort.ts` | Internal: `ListFeed` use-case |
| `ExchangeRatePort` | `EXCHANGE_RATE_PORT` | `domain/ports/ExchangeRatePort.ts` | Internal: `PublishListing`, `ListFeed`, `GetListingDetail`, `GetExchangeRates` |
| `MediaStoragePort` | `MEDIA_STORAGE_PORT` | `domain/ports/MediaStoragePort.ts` | Internal: `PresignUpload`, `AttachMedia` |
| `ListingEventPublisher` | `LISTING_EVENT_PUBLISHER` | `domain/ports/ListingEventPublisher.ts` | Internal: state-transition use-cases |

Repository ports (consumed only within `listings/`):

| Port | Symbol | File |
|---|---|---|
| `ListingRepository` | `LISTING_REPOSITORY` | `domain/ports/ListingRepository.ts` |
| `ListingDraftRepository` | `LISTING_DRAFT_REPOSITORY` | `domain/ports/ListingDraftRepository.ts` |
| `ListingMediaRepository` | `LISTING_MEDIA_REPOSITORY` | `domain/ports/ListingMediaRepository.ts` |
| `FavoriteRepository` | `FAVORITE_REPOSITORY` | `domain/ports/FavoriteRepository.ts` |

## Ports consumed

- `IdentityCheckPort` from `identity/` (via `IdentityModule` export) — used by controllers to verify ownership.

## Shipped use-cases

- `CreateDraft` — creates `ListingDraft` for authenticated user
- `UpdateDraft` — patches draft payload (idempotent autosave)
- `ListMyDrafts` — paginated list of caller's drafts by `updatedAt DESC`
- `DiscardDraft` — hard-deletes a draft (owner-validated)
- `PresignUpload` — generates presigned MinIO PUT URL with content-type/size enforcement
- `PublishListing` — validates draft payload (requires `year`, requires `mileageKm` when `condition='used'`, requires non-empty `description`, requires ≥1 attached photo with `key`, requires `allowCalls || allowChat`) + FX rate → creates `Listing(active)` + media rows → deletes draft (atomic transaction)
- `MarkSold` — `active → sold`, writes `listing.marked_sold` audit log, emits `ListingSold`
- `ArchiveListing` — `active | sold → archived`, writes `listing.archived` audit log
- `RepublishListing` — `archived → active`, writes `listing.republished` audit log
- `DeleteListing` — soft-delete, preserves media rows, writes `listing.deleted` audit log, emits `ListingDeleted`
- `EditListing` — patches an existing published Listing directly when the client submits saved edits; it does not create or consume `ListingDraft` and does not autosave partial edit state. Rejects locked-field changes (`brandId`, `modelId`, `generationId`, `year`, `vin`). Validates `allowCalls || allowChat`. Writes `listing.price_changed` audit log when amount/currency changes.
- `AttachMedia` — registers uploaded asset on a listing; calls `ImageVariantGenerator` (sync Sharp) for images; enforces ≤20 photos + ≤1 video
- `RemoveMedia` — hard-deletes `ListingMedia` row + all variant MinIO objects (best-effort)
- `ReorderMedia` — bulk-updates `sortOrder` for owner-selected ordering in one Prisma transaction
- `ValidateDraftStep` — validates a single wizard step payload against the shared step schema without persisting it; used for step-level guard logic before autosave or publish
- `GetExchangeRates` — returns all stored exchange rates
- `AddFavorite` — favorites an active listing; idempotent; returns 404 for non-existent, deleted, or non-active listings; increments `listing.favoriteCount`
- `RemoveFavorite` — removes a favorite; idempotent; decrements `listing.favoriteCount`
- `ListMyFavorites` — paginated list of the caller's favorited listings via `GET /api/v1/favorites`; excludes banned/deleted listings (filtered by `ListingsReadPort.getListingSummaries`)

## HTTP routes

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/api/v1/listings/ping` | Public | Health check |
| POST | `/api/v1/listings/drafts` | Required | `CreateDraft` |
| PATCH | `/api/v1/listings/drafts/:id` | Required | `UpdateDraft` |
| POST | `/api/v1/listings/drafts/:id/validate-step` | Required | `ValidateDraftStep` |
| DELETE | `/api/v1/listings/drafts/:id` | Required | `DiscardDraft` |
| GET | `/api/v1/me/drafts` | Required | `ListMyDrafts` |
| GET | `/api/v1/me/listings` | Required | `ListMyListings` |
| POST | `/api/v1/uploads/presign` | Required | `PresignUpload` |
| GET | `/api/v1/listings` | Public | `ListFeed` | Accepts `cursor`, `limit`, and MLP filters (`brandId`, `modelId`, `cityId`, `priceMin`, `priceMax`, `yearMin`, `yearMax`, `condition`). Includes `coverMediaKey` when listing has media |
| GET | `/api/v1/listings/:id` | Public (auth optional) | `GetListingDetail` | Banned listings: non-owner → 404; owner → full detail with `status: "banned"`. Includes `isFavorited` when caller is authenticated |
| GET | `/api/v1/exchange-rates` | Public | `GetExchangeRates` |
| POST | `/api/v1/listings/drafts/:id/publish` | Required | `PublishListing` |
| PATCH | `/api/v1/listings/:id` | Required (owner) | `EditListing` |
| POST | `/api/v1/listings/:id/sold` | Required | `MarkSold` |
| POST | `/api/v1/listings/:id/archive` | Required | `ArchiveListing` |
| POST | `/api/v1/listings/:id/republish` | Required | `RepublishListing` |
| DELETE | `/api/v1/listings/:id` | Required | `DeleteListing` |
| POST | `/api/v1/listings/:id/media/attach` | Required (owner) | `AttachMedia` |
| DELETE | `/api/v1/listings/:id/media/:mediaId` | Required (owner) | `RemoveMedia` |
| PUT | `/api/v1/listings/:id/media/order` | Required (owner) | `ReorderMedia` |
| POST | `/api/v1/listings/:id/favorite` | Required | `AddFavorite` | Active listings only; idempotent; 404 for missing/deleted/banned/non-active |
| DELETE | `/api/v1/listings/:id/favorite` | Required | `RemoveFavorite` | Idempotent |
| GET | `/api/v1/favorites` | Required | `ListMyFavorites` | Cursor pagination; excludes banned/deleted listings |

## Events emitted

- `ListingCreated` — emitted by `PublishListing` after transaction commit (no in-process consumers in S4; post-MLP subscriptions may consume)
- `ListingUpdated` — emitted by `EditListing` after successful patch (no in-process consumers in S4)
- `ListingSold` — emitted by `MarkSold` after DB update (no in-process consumers in S4; post-MLP rich chat may consume for system messages)
- `ListingDeleted` — emitted by `DeleteListing` after soft-delete (no in-process consumers in S4)

## Events consumed

- (none today)

## Audit log actions written

- `listing.published` — `{ brandId, modelId, cityId, priceAmount, priceCurrency }`
- `listing.price_changed` — `{ oldPriceAmount, oldPriceCurrency, newPriceAmount, newPriceCurrency }`
- `listing.marked_sold` — `{ priceAmount, priceCurrency, daysActive }`
- `listing.archived` — `{ previousStatus }`
- `listing.republished` — `{ previousArchivedAt }`
- `listing.deleted` — `{ status, mediaCount }`

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are NOT in CONTEXT.md as if they exist today. Authoritative spec for each lives in the named sprint file or PRD feature.

- **S4 (Listings CRUD) — shipped**; domain + ports + null adapters in #86; draft use-cases + controller in #88; publish + state transitions + audit log + FX rate in #89; media use-cases in #91; read use-cases + `ChronologicalRankingAdapter` + `PrismaListingsReadRepository` + `GetExchangeRates` in #92
- **S5 (Search + listing detail) — shipped**; `ListingFilter` VO (#154) + `FeedQuerySchema` filter params (#153); `ChronologicalRankingAdapter` FX-aware price filtering (#155); `ListFeed` forwards filters via controller query params (#156); mobile filter sheet + 5 filter controls + filtered query hook + zero-result state (#157–#164)
- **S6 (Contact seller)** — listing-detail Message button becomes functional; simple contact threads consume listing summaries
- **S7 (Minimal admin + moderation) — shipped** — `banned` status activated in domain (`ListingStatus`) and schema (`ListingStatus` enum). `ListingsAdminPort` (`LISTINGS_ADMIN_PORT`) exposes `banActiveListing` and `unbanBannedListing` as transaction-scoped methods; `PrismaListingsAdminRepository` implements them with `where: { status: "active"|"banned" }` for race-safe updates. Enforcement: `banned` omitted from public feed/search/favorites (`ChronologicalRankingAdapter` + `PrismaListingsReadRepository`); non-owner detail → 404; owner detail shows `status: "banned"` (frontend generic notice); owner mutations blocked (`FORBIDDEN`). New contact/messages blocked for banned listings via `conversations/` `getListingSummary` exclusion. Admin orchestrates in `admin/` (`BanListing`, `UnbanListing`) with single-transaction report resolution + listing mutation + audit. Unban does not clear favorites or resolve pending reports.
- **S8 (Private beta polish)** — beta-critical query/index polish, legal/share/public-web integration, and operational cleanup. Listing launch-safety flags are server-side environment/deployment config in the MLP. `LISTING_PUBLISH_ENABLED=false` blocks `PublishListing` while allowing existing owner reads and draft editing unless `LISTING_MUTATIONS_ENABLED=false` is also set. `LISTING_MUTATIONS_ENABLED=false` makes owner listing write routes read-only for create/edit/publish/media/mark-sold/archive/republish/delete while public browse/detail and contact stay governed by their own policies. Disabled listing writes return HTTP 403 `FORBIDDEN` with `details.reason = "FEATURE_DISABLED"` and do not expose internal flag names. Account deletion remains owned by `identity/` and is not blocked by listing kill switches.
- **Post-MLP discovery bets** — saved-search match consumers, broader discovery UX beyond saved-listing Favorites, availability hours for contact prefs
- **Post-MLP Garage/Dealership** — dealership posting (`dealershipId?` + `publishedAsDealership` columns + cross-context port + wizard step), Sell-from-Garage entry tile + pre-fill, OwnedVehicle redesign (FK columns + status enum), bi-directional Listing↔Garage sync, dealership PRO badge on detail
- **Post-MLP notifications/media pipeline** — `ListingCreated` event consumer for saved-search match; sold-listing auto-archive cron; async variant generation via worker (`QueuedImageVariantGenerator`); video HLS pipeline (ffmpeg + poster frame); MinIO orphan cleanup cron for uploaded objects that never receive a `ListingMedia` row
- **Post-MLP admin dashboard** — `AdminEditListing` (locked-field override) + admin FX rate write UI
- **Trust bet** — `MlContentClassifier` (NudeNet + YOLO + pHash) replaces `NullContentClassifier`; inspected-listing tier system + tier-invalidate-on-structural-edit; flipper-detection signals; "First owner" claim; phone-number-reuse detection; edit-triggered re-review; "Photos by AutoTM" pro media attribution adds `ListingMedia.uploadedByUserId` + `uploadedByStaff`; `TmProxyVinDecoder` replaces `NullVinDecoder`; purge cron hard-deletes old soft-deleted listings + their media
- **Post-MLP ranking refinement bet** — `PersonalizedRankingAdapter` replaces `ChronologicalRankingAdapter` per [ADR-0021](../../../../../docs/adr/0021-feed-ranking-port.md); recency decay + completeness + trending + personalization + sort tabs (Newest / Cheapest / Closest)
- **Premium media bet** — 360° orbit photos (`ListingMedia.kind = orbit`)

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Listings is its own context
- [ADR-0008](../../../../../docs/adr/0008-media.md) — Direct-to-MinIO upload, eager variants
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state, not aspirational spec
- [ADR-0021](../../../../../docs/adr/0021-feed-ranking-port.md) — Feed ranking via port abstraction; S4 ships `ChronologicalRankingAdapter`, later ranking bet ships `PersonalizedRankingAdapter`
- Mobile upload pipeline + wizard state machine documented in [`apps/mobile/src/listings/CONTEXT.md`](../../../../../../apps/mobile/src/listings/CONTEXT.md)
