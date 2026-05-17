# Sprint 4 — Listings CRUD

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | M3 — I can browse cars |
| **Demo audience** | Internal group |
| **Estimated time** | ~1.5 weeks |

## Goal

Seller creates a listing with photos (≤20) and one short video (≤60 s). Anonymous user browses the list page + detail page on mobile and web. Edit + mark-sold + delete supported.

## User capability (the demo line)

> "I tap Sell, fill the wizard (brand, model, year, price, city, photos), publish, and my listing appears in the feed. An anonymous user opens the listing and sees everything."

## Bounded contexts touched

- **Primary**: `listings/`
- **Supporting**: `identity/` (seller resolution); MinIO (presigned uploads); mobile + web UIs

## Acceptance criteria (DoD)

### Schema additions (Prisma migration)

S4 broadens the skeletal `Listing` model (see `apps/api/src/modules/listings/CONTEXT.md` Planned section) to match what the wizard + detail page need. Per [ADR-0019](../../adr/0019-context-md-describes-current-state.md), the CONTEXT.md gets updated at the end of this sprint to describe what shipped.

- [ ] `Listing` adds: `dealershipId?` (FK → Dealership), `publishedAsDealership: Boolean @default(false)`, `vin?` (String), `condition` enum (`new` | `used`), `engineTypeId?` (FK → catalog `EngineType`), `transmissionId?` (FK → catalog `Transmission`), `driveTypeId?` (FK → catalog `DriveType`), `enginePower?` (Int — kW or hp), `regionId` (FK → Region; redundant given cityId but indexes regional filter queries), `locationText?` (free-form), `soldAt?` (DateTime), `viewCount @default(0)`, `favoriteCount @default(0)`, `originalPrice?` (Float) + `originalCurrency?` (Currency enum) for foreign-currency seller pricing. `EngineType`, `Transmission`, and `DriveType` are catalog-owned trilingual lookup entities, localized through the catalog API rather than frontend enum translation files.
- [ ] `Listing.status` enum may add `reported` and `banned` (moderation states). Coordinate with S9 if status flow needs them earlier.
- [ ] New `ListingDraft` entity: id, userId (FK → User, Cascade), payload (JSON of in-flight wizard state), updatedAt. Index on userId.
- [ ] `ListingMedia` adds: `key` (MinIO object key — rename or add alongside existing `url`), `position` (rename `sortOrder` if S4 prefers — or keep `sortOrder` and align contract), `width?`, `height?`, `durationMs?`, `posterKey?` (videos), `uploadedByUserId`, `uploadedByStaff: Boolean @default(false)`. `kind` enum stays (image | video); `orbit` is Phase 3 (S17).
- [ ] Prisma migration is reversible; existing rows survive (test locally with seeded data before merging).

### Endpoints + behavior

- [ ] `POST /api/v1/listings` creates a draft; `POST /api/v1/listings/{id}/publish` activates it
- [ ] `GET /api/v1/listings/{id}` returns full detail; **public — no auth required**
- [ ] `GET /api/v1/listings` returns paginated cursor feed; **public**
- [ ] `PATCH /api/v1/listings/{id}` edits own listing (owner check)
- [ ] `POST /api/v1/listings/{id}/sold` marks sold (transitions status, sets `publishedAt`-style `soldAt`)
- [ ] `DELETE /api/v1/listings/{id}` soft-deletes (sets `deletedAt`; charter §16)
- [ ] **Media upload**: `POST /api/v1/uploads/presign` returns a MinIO presigned URL; client uploads direct; `POST /api/v1/listings/{id}/media/attach` registers the object
- [ ] Photos: ≤20 per listing; client-compressed to ≤5 MB each via `expo-image-manipulator` (mobile) or browser canvas (web)
- [ ] Video: ≤1 per listing, ≤60 s, ≤10 MB; client-compressed via `react-native-compressor` (mobile)
- [ ] Image variants generated on upload via Sharp (synchronous for S4 — async pipeline lands in S8 worker)
- [ ] Mobile create-listing wizard: 6 steps (brand-model → year → details → price → photos → review)
- [ ] Web listing detail page renders with OG metadata (preview-ready for share-in-chat in S7)
- [ ] Anonymous browsing works without auth headers
- [ ] `listings/CONTEXT.md` updated to describe everything shipped (per ADR-0019: CONTEXT mirrors current state)
- [ ] `docs/prd/03-roadmap.md` updated (S4 🟢, S5 🟡)

### Ports + events

- [ ] `ListingsReadPort` (`getListingSummary`, `getListingsForOwner`, `matchesFilters`) — for cross-context summary reads (consumed by conversations, subscriptions, admin)
- [ ] Events emitted: `ListingCreated` (on `status → active`), `ListingUpdated` (on description/price changes), `ListingSold` (on mark-sold), `ListingDeleted` (on soft-delete)
- [ ] **Note**: `ListingReported` event + `reported`/`banned` status fold-in deferred to S9 admin moderation; S4 does NOT need to emit them.

## Tests required (TDD mandatory)

- **Domain**: `ListingDraft`, `ListingStatus` transitions (state machine — draft → active → sold | archived), `Price` VO with `Currency` enum, `MediaCount` invariant (≤20 photos + ≤1 video)
- **Application**: `CreateDraft`, `PublishListing`, `EditListing`, `MarkSold`, `DeleteListing`, `AttachMedia`, `ListFeed` — one test class per use-case
- **Infrastructure** (Testcontainers): `PrismaListingRepository` round-trips, `MinioPresignAdapter` returns a URL with correct expiry (mock MinIO endpoint)
- **Presentation** (e2e): full publish → fetch detail → list-in-feed cycle

## Files this sprint creates / touches

```
apps/api/src/modules/listings/
├── domain/
│   ├── Listing.ts                Root entity with state machine
│   ├── ListingMedia.ts
│   ├── Price.ts                  VO (amount + currency)
│   ├── ListingStatus.ts          State machine enum + transition rules
│   └── ports/
│       ├── ListingRepository.ts
│       ├── MediaStoragePort.ts   Presigned URL + variants
│       └── ListingEventPublisher.ts
├── application/
│   ├── CreateDraft.ts, PublishListing.ts, EditListing.ts, MarkSold.ts, DeleteListing.ts
│   ├── AttachMedia.ts, RemoveMedia.ts, ReorderMedia.ts
│   ├── GetListingDetail.ts, ListFeed.ts, ListMyListings.ts
│   └── PresignUpload.ts
├── infrastructure/
│   ├── PrismaListingRepository.ts
│   ├── MinioMediaStorageAdapter.ts
│   ├── SharpImageVariantGenerator.ts
│   └── EventEmitterListingEventPublisher.ts
├── presentation/
│   ├── ListingsController.ts
│   ├── MyListingsController.ts
│   └── UploadsController.ts
└── listings.module.ts

packages/contracts/src/schemas/listings.ts       (extend with full Listing + DTOs)
apps/mobile/app/(tabs)/sell.tsx (real wizard)
apps/mobile/app/listings/[id].tsx
apps/web/src/app/[locale]/listings/[id]/page.tsx (full detail + OG)
apps/web/src/app/[locale]/listings/page.tsx       (feed)
```

## References

- **PRD feature**: [`../features/32-listings.md`](../features/32-listings.md)
- **End-to-end flow**: [`../flows/61-create-listing.md`](../flows/61-create-listing.md)
- **CONTEXT spec source** (current-state mirror, target for end-of-sprint update): [`apps/api/src/modules/listings/CONTEXT.md`](../../../apps/api/src/modules/listings/CONTEXT.md)
- **Charter sections**: §11 (Media handling), §16 (Pagination, soft-delete), §17 (Currency)
- **ADRs**: 0008 (Media), 0001 (Architecture — soft-delete only on Listing + BlogPost), [0019](../../adr/0019-context-md-describes-current-state.md) (CONTEXT.md describes current state — listings/CONTEXT.md gets updated at end of S4)

## Previous-sprint dependencies

- S2 — auth (sellers must be authenticated)
- S3 — Catalog (need real brands/models/cities for the wizard)

## Open questions / risks

- **Image variant timing**: S4 uses synchronous Sharp (slower upload). S8 moves it async to the worker. Decision: ship synchronous first; if upload time >3 s p95, accelerate the worker move.
- **Video transcoding deferral**: original-only in S4; ffmpeg HLS lands in S8. Detail page playback uses original video until then (HTML5 `<video>` + MP4).
- **Storage cost**: 5 MB × 20 photos × N listings adds up fast. Document an orphan-cleanup cron schedule in S8.
- **Pre-publish moderation**: charter is ambiguous. Decision: auto-publish in Phase 1; admin can ban post-hoc. Add a pre-publish-required toggle for Phase 2.
