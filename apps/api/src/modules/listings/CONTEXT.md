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

- **S4 (Listings CRUD)** — `docs/prd/sprints/sprint-04-listings-crud.md`. Schema additions to `Listing`:
  - `dealershipId?` (FK → Dealership) + `publishedAsDealership: Boolean` (dealer posting flag)
  - `vin?` (String, masked-display capable)
  - `condition` enum (`new` | `used`)
  - `engineTypeId?` (FK → EngineType) — see catalog/CONTEXT.md for the enum-vs-catalog decision; current direction is Prisma enums per Decision 3
  - `transmissionId?` (FK → Transmission) — same enum-vs-catalog note
  - `driveTypeId?` (FK → DriveType) — same enum-vs-catalog note
  - `enginePower?` (Int — kW or hp)
  - `regionId` (FK → Region; redundant given cityId → region.id but indexes the common "filter by region" query)
  - `locationText?` (free-form location detail beyond city)
  - `soldAt?` (DateTime — distinct from status transition for "Sold" badge expiry)
  - `viewCount` (Int — view counter)
  - `favoriteCount` (Int — denormalized for sort)
  - `originalPrice` + `originalCurrency` (if seller priced in foreign currency, preserve both)
  - Status enum may evolve: add `reported` and `banned` if moderation flow needs them (S9 driven)
  - `ListingDraft` entity for wizard-state persistence
  - `ListingMedia` additions: `kind` adds `orbit` (Phase 3), `key` column for MinIO object key in addition to / instead of `url`, plus `position` rename, `width?`, `height?`, `durationMs?`, `posterKey?`, `uploadedByUserId`, `uploadedByStaff: Boolean`
  - `ListingsReadPort` interface (cross-context summary reads)
  - Events: `ListingCreated`, `ListingUpdated`, `ListingSold`, `ListingDeleted`
- **S5 (Listings UX)** — saved-search match consumers + Favorite UX
- **S7 (Conversations)** — listing-detail share-via-chat surfaces; listings consume `MessageSent` indirectly
- **S9 (Admin)** — `ListingReported` event + admin moderation flow (status → `reported` / `banned`); `UserSuspended` consumer to auto-archive listings
- **Phase 3** — 360° orbit photos (`ListingMedia.kind = orbit`)

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Listings is its own context
- [ADR-0008](../../../../../docs/adr/0008-media.md) — Direct-to-MinIO upload, eager variants
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state, not aspirational spec
