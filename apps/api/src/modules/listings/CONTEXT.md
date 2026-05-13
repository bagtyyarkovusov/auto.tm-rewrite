# listings — CONTEXT

## Purpose

Car ads — the core economic object. Listings have specs, photos, optional video, location, price, and an owner (User, optionally posting as a Dealership).

## Owns (entities + tables)

- `Listing` — id, ownerUserId, dealershipId? (if `publishedAsDealership=true`), publishedAsDealership: bool, brandId, modelId, generationId?, year, mileage, vin?, condition, transmissionId, engineTypeId, enginePower?, driveTypeId, colorId, originalPrice, originalCurrency, price (in user's display currency), currency, regionId, cityId?, locationText?, description, status (`draft` / `active` / `sold` / `archived` / `reported` / `banned`), favoriteCount, viewCount, createdAt, publishedAt?, soldAt?, deletedAt?
- `ListingMedia` — id, listingId, kind (`photo` / `video` / `orbit`), key (MinIO object key), position, width?, height?, durationMs?, posterKey? (for videos), uploadedByUserId, uploadedByStaff: bool, createdAt
- `Favorite` — { userId, listingId, createdAt }
- `ListingDraft` — id, userId, payload (JSON wizard state), updatedAt

## Invariants

- `Listing.ownerUserId` is the legal owner regardless of `publishedAsDealership`
- If `publishedAsDealership=true`, then `ownerUser` must currently belong to `dealershipId`
- `Listing.brandId` and `Listing.modelId` must be related (model.brandId === listing.brandId)
- `Listing.generationId` (if set) must reference a Generation with `modelId === listing.modelId`
- `Listing.year` must fall within Generation's `[yearStart, yearEnd ?? now]` if generation is set
- `Listing.status = 'active'` is the only state visible in public feed
- `Listing.status = 'sold'` is visible for 14 days with "Sold" badge, then auto-archived
- `Favorite` requires authenticated user; anonymous users cannot favorite
- `ListingMedia` photos: max 20 per listing; videos: max 1 per listing
- Soft-delete via `deletedAt` — listings are never hard-deleted (preserve chat history)

## Ports exposed

```ts
interface ListingsReadPort {
  getListingSummary(id): Promise<{ id, title, photoUrl, price, currency, regionName, brandName, modelName, year } | null>
  getListingsForOwner(userId, options): Promise<ListingSummary[]>
  matchesFilters(listingId, filters): Promise<boolean>  // for saved-search use
}
```

## Ports consumed

```ts
CatalogReadPort        // resolve brand/model/generation/region names
IdentityReadPort       // resolve owner / dealership info
MediaUploadPort        // generate presigned MinIO URLs
VinDecoderPort         // optional auto-fill (mocked in MVP)
```

## Events emitted

- `ListingCreated` — fires on `status → active` transition. Consumed by `subscriptions/` for match fan-out and `notifications/` for analytics.
- `ListingUpdated` — fires on description/price changes
- `ListingSold` — fires when seller marks as sold
- `ListingDeleted` — fires on soft-delete
- `ListingReported` — fires when a user reports the listing

## Events consumed

- `UserSuspended` — automatically marks all `active` listings of that user as `archived`
- `DealershipVerified` — adds PRO badge to all listings where `publishedAsDealership=true` for that dealership

## Notable decisions

- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Listings is its own context
- [ADR-0008](../../../../docs/adr/0008-media.md) — Direct-to-MinIO upload, eager variants
- [ADR-0007](../../../../docs/adr/0007-i18n.md) — Single-locale content, no per-language fields
