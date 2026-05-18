# Sprint 4 — Listings CRUD

| | |
|---|---|
| **Status** | 🟡 In progress |
| **Phase** | 1 |
| **Milestone** | M3 — I can browse cars |
| **Demo audience** | Internal group |
| **Estimated time** | ~1.5 weeks |

> **Scope refinement (2026-05-18)**. This sprint file was tightened by a pre-S4 grill that closed 17 unresolved design + scope gaps before issue creation. See [`sprint-04-listings-crud-pre-retro.md`](sprint-04-listings-crud-pre-retro.md) for the decision audit trail and [ADR-0021](../../adr/0021-feed-ranking-port.md) for the ranking-port decision that originated from the same grill. Locked at this content; further scope shifts go in an end-of-sprint retro per [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md).

## Goal

Seller creates a listing with photos (≤20) via a 7-step wizard. Anonymous user browses the chronological feed + detail page on mobile and web. Owner can edit, mark sold, archive, republish, or delete. Listings are TMT-displayed but multi-currency-input (TMT/USD/AED) with admin-managed FX rates. Feed is chronological in S4; smart ranking lands in S19 via a port swap. Video media primitives can exist behind the API boundary, but mobile video UX is deferred.

## User capability (the demo line)

> "I tap Sell, fill the 7-step wizard (VIN → photos → brand/model → specs → price → location → contact), publish, and my listing appears in the chronological feed. An anonymous user opens the listing on web or mobile, sees everything, and would be able to call the seller (chat shows 'coming soon' until S7)."

## Bounded contexts touched

- **Primary**: `listings/` — domain entities, use-cases, ports, repositories, controllers
- **Supporting**:
  - `catalog/` — extension issue adds `EngineType` + `Transmission` + `DriveType` lookup entities + read endpoints + seed
  - `identity/` — read-only consumer of `User.phoneE164` as default contact phone (no new identity work in S4)
  - MinIO — direct presigned uploads + 4×JPEG/WebP variant generation via Sharp
  - mobile (Expo) — wizard, listing detail, My Listings, feed; full upload-staging state machine
  - web (Next.js) — read-only SSR detail + feed pages with OG metadata + Schema.org JSON-LD

## Acceptance criteria (DoD)

### Catalog extension (first S4 issue, must land before Listing schema migration)

- [ ] New catalog entities (trilingual, no slug): `EngineType`, `Transmission`, `DriveType`
- [ ] Seed data: 6 engine types (gasoline, diesel, hybrid, electric, LPG, CNG), 4 transmissions (manual, automatic, robot/AMT-DCT, CVT), 4 drive types (FWD, RWD, AWD, 4WD)
- [ ] Read endpoints: `GET /api/v1/catalog/engine-types`, `transmissions`, `drive-types`
- [ ] Domain entities + repositories + use-cases + Prisma adapters
- [ ] Contracts: `EngineTypeSummary`, `TransmissionSummary`, `DriveTypeSummary` Zod schemas
- [ ] Admin write API deferred to S9 (matches Color/BodyType pattern)
- [ ] `catalog/CONTEXT.md` updated to describe shipped state

### Listing schema (Prisma migration)

Per [ADR-0019](../../adr/0019-context-md-describes-current-state.md), the listings CONTEXT.md gets updated at the end of this sprint to describe what shipped.

- [ ] `Listing` adds:
  - `vin?` (String) — locked post-publish
  - `condition` enum (`new` | `used`)
  - `engineTypeId?` (FK → catalog `EngineType`)
  - `transmissionId?` (FK → catalog `Transmission`)
  - `driveTypeId?` (FK → catalog `DriveType`)
  - `enginePower?` (Int — kW or hp)
  - `regionId` (FK → Region; redundant given cityId but indexes regional filter queries)
  - `locationText?` (free-form location detail beyond city)
  - `soldAt?` (DateTime — distinct from status transition for "Sold" badge expiry)
  - `viewCount Int @default(0)` — denormalized; not incremented in S4; consumed by S19 ranking
  - `favoriteCount Int @default(0)` — denormalized; not incremented in S4; consumed by S19 ranking
  - `contactPhone?` (String) — override of `seller.phoneE164`
  - `allowCalls Boolean @default(true)` — must be true OR allowChat
  - `allowChat Boolean @default(true)` — must be true OR allowCalls
  - `acceptsExchange Boolean @default(false)` — seller says they may consider vehicle exchange; informational only in S4
  - `installmentAvailable Boolean @default(false)` — seller says installment/payment-plan discussion is possible; AutoTM does not finance or verify terms in S4
- [ ] Existing `Listing.year` and `Listing.mileageKm` remain nullable at the database level for historical/admin flexibility, but `PublishListing` must require `year` for new mobile listings and must require `mileageKm` when `condition='used'`. This follows marketplace parity (Auto.ru / AutoTrader-style flows require model year and used-car mileage). `vin` and `generationId` remain optional.
- [ ] **Dropped from S4 scope** (deferred elsewhere): `dealershipId?` + `publishedAsDealership` (S6); `ownedVehicleId?` (S6); `originalPrice?` + `originalCurrency?` (multi-currency handled by `priceAmount`+`priceCurrency` directly)
- [ ] `Listing.status` enum: keep existing 6 values (`draft` | `pending_review` | `active` | `sold` | `archived` | `rejected`); **add 2 values for S9 use**: `reported`, `banned`. Phase 1 only writes `active`/`sold`/`archived`/`rejected` values; `draft` / `pending_review` retained but unused in Phase 1.
- [ ] Rename existing `Listing.deletedAt` semantics confirmed: soft-delete only on Listing (per ADR-0001).
- [ ] New `ListingDraft` entity: `id, userId (FK → User, Cascade), payload (Json), createdAt, updatedAt`. Index `(userId, updatedAt DESC)`. Drafts ONLY live here; `Listing.status=draft` is unused.
- [ ] `ListingMedia` changes:
  - **Rename** `url` → `key` (MinIO object key); destructive rename (table is empty today)
  - Add: `width?`, `height?`, `durationMs?`, `posterKey?` (videos)
  - Keep: `kind` (image | video — no `orbit` in Phase 1), `sortOrder`
  - **Defer to later sprints**: `uploadedByUserId` (S6 — dealership member uploads), `uploadedByStaff: Boolean` (S14 — Photos by AutoTM)
- [ ] New `ExchangeRate` entity: `id, fromCurrency (Currency), toCurrency (Currency), rate (Float), updatedAt, setByUserId?`. Unique `(fromCurrency, toCurrency)`. Seed: `(USD, TMT, <rate>)` + `(AED, TMT, <rate>)`.
- [ ] Prisma migration is reversible; existing rows survive (test locally with seeded data before merging).

### State machine + use-cases (8 use-cases on Listing/Draft)

Phase 1 active states: `active`, `sold`, `archived`. Soft-delete via `deletedAt` is orthogonal.

| Use-case | Transitions / behavior | AuditLog action |
|---|---|---|
| `CreateDraft` | Creates `ListingDraft` row with empty `payload`. | — |
| `UpdateDraft` | Autosave wizard step into `payload`. | — |
| `PublishListing` | Validates required fields from draft (photos, brand, model, year, condition, mileage for used cars, price, region/city, description, contact method) → creates `Listing(active)` + sets `publishedAt` → deletes the `ListingDraft` row. Validates `EXCHANGE_RATE_MISSING` if `priceCurrency` other than TMT and rate is absent. | `listing.published` |
| `EditListing` | Patches an existing Listing. Rejects with `LISTING_FIELD_LOCKED` on attempts to change `brandId`, `modelId`, `generationId`, `year`, `vin`. Validates `allowCalls OR allowChat`. | `listing.price_changed` when amount or currency changes; otherwise no entry |
| `MarkSold` | `active → sold`, sets `soldAt = NOW()`. | `listing.marked_sold` |
| `ArchiveListing` | `active | sold → archived`. | `listing.archived` |
| `RepublishListing` | `archived → active`, sets new `publishedAt`. | `listing.republished` |
| `DeleteListing` | Sets `deletedAt = NOW()`; preserves status. ListingMedia rows + MinIO objects retained for admin / restoration. | `listing.deleted` |

Plus media use-cases (orthogonal to state machine):

- `AttachMedia` — calls `MediaContentClassifierPort.classify(key)`; in S4 always returns `isAcceptable: true`. Registers ListingMedia row. Sync Sharp variant generation via `ImageVariantGenerator` port.
- `RemoveMedia` — deletes ListingMedia row + MinIO object (hard-delete, per ADR-0001).
- `ReorderMedia` — updates `sortOrder` for owner-selected ordering.
- `PresignUpload` — returns presigned MinIO PUT URL with content-type + size constraints.

Plus read use-cases:

- `GetListingDetail` — public; 404 if soft-deleted or non-existent.
- `ListFeed` — depends on `FeedRankingPort`. Cursor-paginated. Filter signature forward-defined for S5; S4 always passes empty filters.
- `ListMyListings` — owner-scoped; excludes soft-deleted.
- `ListMyDrafts` — owner-scoped ListingDraft rows.
- `GetExchangeRates` — public; returns current FX rates.

### Ports (S4 ships interfaces + initial adapters)

| Port | S4 adapter | Future swap |
|---|---|---|
| `VinDecoderPort` | `NullVinDecoder` (always returns `{ decoded: false }`) | Phase 2: `TmProxyVinDecoder` (real VIN decode via Proxy PC) |
| `MediaContentClassifierPort` | `NullContentClassifier` (always returns `{ isAcceptable: true }`) | Phase 2: `MlContentClassifier` (NudeNet + YOLO + pHash; flips listing to `pending_review` on fail) |
| `ImageVariantGenerator` | `SharpImageVariantGenerator` (sync in API request lifecycle; 4 sizes × JPEG+WebP per photo) | S8: `QueuedImageVariantGenerator` (enqueues BullMQ job; worker runs Sharp off the API process) |
| `FeedRankingPort` | `ChronologicalRankingAdapter` (sorts by `publishedAt DESC, id DESC`; includes 14-day-sold-fade filter) | S19: `PersonalizedRankingAdapter` (recency decay + completeness + trending + personalization) — see [ADR-0021](../../adr/0021-feed-ranking-port.md) |
| `ExchangeRatePort` | `PrismaExchangeRateRepository` | — |
| `ListingsReadPort` | `PrismaListingsReadRepository` | — |
| `ListingEventPublisher` | `EventEmitterListingEventPublisher` | — |
| `MediaStoragePort` | `MinioMediaStorageAdapter` (presign + key resolution) | — |

### `ListingsReadPort` shape (cross-context contract)

```typescript
interface ListingsReadPort {
  getListingSummary(id: string): Promise<ListingSummary | null>;
  getListingSummaries(ids: string[]): Promise<ListingSummary[]>;
  getListingsForOwner(ownerId: string, query?: { cursor?: FeedCursor; limit?: number }): Promise<{ items: ListingSummary[]; nextCursor?: FeedCursor }>;
  matchesFilters(listingId: string, filters: ListingFilterCriteria): Promise<boolean>;
}

interface ListingSummary {
  id: string;
  sellerId: string;
  status: 'active' | 'sold' | 'archived';
  brandId: string;
  modelId: string;
  year?: number;
  priceAmount: number;
  priceCurrency: 'TMT' | 'USD' | 'AED';
  displayPriceTmt: number;     // computed via ExchangeRatePort at read time
  coverMediaKey?: string;
  cityId: string;
  publishedAt: Date;
}
```

Consumed in future sprints: conversations (S7 post_ref cards), subscriptions (S5/S8 saved-search match), notifications (S8 digests), admin (S9 moderation queue).

### Events emitted (in S4 with no in-process consumers)

- `ListingCreated` (on publish — `status='draft' → 'active'`)
- `ListingUpdated` (on description/price/specs changes)
- `ListingSold` (on `MarkSold`)
- `ListingDeleted` (on soft-delete)

Future consumers: S5 subscriptions (`ListingCreated`), S7 conversations (`ListingSold` → close chat threads), S9 admin (`ListingReported` event will be added in S9). Locking event names + payloads early lets future sprints subscribe without renegotiation.

### HTTP endpoints (18 total)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/listings` | Public | Chronological feed; opaque cursor pagination; no user-supplied filters in S4 |
| GET | `/api/v1/listings/:id` | Public | 404 if soft-deleted; serializes `priceAmount`+`priceCurrency`+`displayPriceTmt` |
| GET | `/api/v1/me/listings` | Required | Caller's own listings; excludes soft-deleted; cursor-paginated by `updatedAt DESC` |
| GET | `/api/v1/me/drafts` | Required | Caller's `ListingDraft` rows; cursor-paginated by `updatedAt DESC` |
| POST | `/api/v1/listings/drafts` | Required | Create draft |
| PATCH | `/api/v1/listings/drafts/:id` | Required | Autosave step (idempotent) |
| DELETE | `/api/v1/listings/drafts/:id` | Required | Discard draft (also clears mobile staging dir) |
| POST | `/api/v1/listings/drafts/:id/publish` | Required | Validates required fields + FX rate availability → creates Listing → deletes draft |
| PATCH | `/api/v1/listings/:id` | Required (owner) | Edit existing listing; rejects locked-field changes |
| POST | `/api/v1/listings/:id/sold` | Required (owner) | Mark sold |
| POST | `/api/v1/listings/:id/archive` | Required (owner) | Archive |
| POST | `/api/v1/listings/:id/republish` | Required (owner) | Republish archived |
| DELETE | `/api/v1/listings/:id` | Required (owner) | Soft-delete |
| POST | `/api/v1/listings/:id/media/attach` | Required (owner) | Register uploaded asset |
| DELETE | `/api/v1/listings/:id/media/:mediaId` | Required (owner) | Hard-delete media |
| PUT | `/api/v1/listings/:id/media/order` | Required (owner) | Reorder media |
| POST | `/api/v1/uploads/presign` | Required | Presigned MinIO PUT URL; `{ kind, contentType, sizeBytes }` |
| GET | `/api/v1/exchange-rates` | Public | Current FX rates |

### Cursor pagination

Opaque base64-encoded JSON token, composite `(timestamp, id)`:

```
encoded: base64(JSON.stringify({ publishedAt: "2026-05-17T14:32:01Z", id: "abc-123-..." }))
```

Public feed sorts `publishedAt DESC, id DESC`. My Listings / My Drafts sort `updatedAt DESC, id DESC`. Default `limit=20`, max `limit=50`. Response: `{ items, nextCursor }` — `nextCursor: null` signals end of feed. Clients treat cursor as opaque.

### Media pipeline

- Photos: ≤20 per listing; client-compressed (`expo-image-manipulator`) to ≤5 MB JPEG; server enforces via MinIO presign conditions
- Video media primitives may exist behind the API boundary, but #93's mobile wizard exposes photos only. Do not render a disabled/coming-soon video control in the S4 create wizard; real mobile video capture/playback UX lands with the S8 media pipeline.
- Variant naming convention (synced for client + server): `listings/<listingId>/<mediaId>/{original|thumbnail|list|detail|fullscreen}.{jpg|webp}`
- API serializes Listing detail responses with full variant URLs constructed at read time
- Sync Sharp generation on `AttachMedia` in S4; S8 swaps `ImageVariantGenerator` adapter to enqueue work to BullMQ
- Mobile staging:
  - Files at `${FileSystem.documentDirectory}listing-staging/<draftId>/<photoId>.jpg`
  - State machine: `selected → compressed → presigned → uploading → uploaded → attached`; retry states `failed` / `waiting_for_network`
  - No MMKV/AsyncStorage — state reconstructed on app launch from filesystem + server's `draft.payload.attachedMediaIds`
  - Lifecycle: file deleted on attach success OR RemoveMedia; entire `<draftId>/` directory deleted on draft discard or publish; orphan cleanup on app launch removes directories for non-existent drafts
  - Resume on `AppState 'active'` + `NetInfo isConnected`
  - Phase 1: whole-file retry only (no multipart resumable, no guaranteed OS-level background upload)
  - The user may continue later wizard steps while uploads run, but Publish is blocked until at least one photo is attached successfully and there are no required pending or failed uploads. Failed thumbnails render Retry + Remove.

### Currency / FX behavior

- Sellers price in TMT, USD, or AED (currency picker in wizard step 5)
- All public displays show `displayPriceTmt` computed at read time via `ExchangeRatePort.getRate(priceCurrency, 'TMT') × priceAmount`
- Listing detail page display (asymmetric):
  - **Owner viewing own listing**: TMT primary + `≈ original currency` secondary (e.g., `1,890,000 TMT` + `≈ $20,000`)
  - **Public buyer viewing listing**: TMT only (e.g., `1,890,000 TMT`)
  - Mobile client branches on `viewer.userId === listing.sellerId`
- `EditListing` accepts currency changes; clearing the amount field on currency-toggle is mobile UX (no auto-conversion to avoid rounding ugliness). In the wizard, if the seller switches TMT/USD/AED after entering an amount, clear the amount field, focus it, and show helper text asking for the price in the newly selected currency.
- `PublishListing` rejects with `EXCHANGE_RATE_MISSING` if rate row absent for non-TMT priceCurrency
- Mobile Publish is blocked for non-TMT listings while the required FX rate is unavailable; show an inline helper such as "Exchange rate unavailable. Try TMT or contact support."
- Seller terms under price: optional `acceptsExchange` and `installmentAvailable` switches. There is no separate `negotiable` flag in S4; sellers can mention negotiation in Description. Seller terms do not change price validation: `priceAmount` must remain the full asking price, never a down payment or installment amount. S4 does not collect installment duration, down payment, bank, or trade-in target details.
- Feed/listing cards show small secondary seller-term badges under price when true; detail shows the same badges near price with helper text. S4 has no buyer application form, exchange matching, credit lead routing, or financing workflow.
- FX rate updates: admin UI defers to S9; manual DB updates seed initial rates; FX-rate updates do NOT write AuditLog entries against affected listings (would be noise)
- Admin updates FX rate → seller's TMT-equivalent display updates next read; seller sees "Shown in TMT at today's rate — your <original> price is unchanged" tooltip in My Listings (mobile)

### Wizard (mobile, 7 steps)

Per PRD feature 32 + flow 61 — order is fixed, photos start compressing in step 2 so they upload in parallel with steps 3-7:

1. **VIN** — optional manual text; Skip prominent; no OCR, decoder, checking, or auto-fill UI in #93. `VinDecoderPort` can remain a Null adapter behind the API boundary for Phase 2, but the mobile wizard must not promise lookup.
2. **Photos** — Camera/Library; min 1 max 20; freeform photo set with lightweight helper chips (front, interior, odometer) but no required angle checklist; client-compresses immediately to staging; first photo is cover and shows a Cover badge; drag to reorder changes the cover; no separate Set cover action; failed thumbnails render Retry + Remove
3. **Brand → Model → Generation → Year** — input-like trigger rows opening searchable picker sheets; Model disabled until Brand; `year` is required; `generationId` is optional/skippable because seed data may be empty in S4 and empty sheet state says no generations exist yet
4. **Specs** — Condition defaults to Used; Mileage is visible and required for used cars, optional/hidden for new cars; Color, Body type, Transmission, Drive type, Engine type, and Engine power are optional completeness fields and do not block publish in S4
5. **Price & currency** — Amount input + Currency picker (TMT default); changing currency clears the amount instead of converting it; `≈ X TMT` live helper for non-TMT; missing non-TMT FX rate blocks Publish with an honest helper; optional Seller terms switches for Exchange possible and Installment possible
6. **Location** — Region picker → City picker → optional area/landmark text. No GPS/current-location button, map pin, exact address, or first-open location prompt.
7. **Description + Contact** — Description is required, has no minimum beyond non-empty, is capped at 2000 chars, and is stored exactly as written with no auto-translation or language selector in S4; optional `contactPhone` override (defaults to `seller.phoneE164`); `allowCalls` + `allowChat` switches (default ON; at-least-one validation); show compact Review summary above Publish, not a separate Preview route
- Navigation is linear Next/Back in S4. The Review summary may deep-link back to completed steps for correction, but there is no full arbitrary stepper navigation.
- Drafts auto-save through the server only: debounced while editing, forced on every step transition via `UpdateDraft`, and never presented as offline-saved unless local draft persistence is explicitly added later. Save failure keeps the user on the current step with Retry.
- Resume on next visit picks up at the last completed step. If existing drafts are present, Sell shows a lightweight entry with the latest draft as the primary Continue action plus New listing; full draft management belongs in My Listings / #94.
- Discard draft lives in the wizard header overflow menu and opens a destructive confirmation `AlertDialog`; it is not a footer action.
- Edit mode: identity fields (brandId, modelId, generationId, year, vin) render disabled with tooltips

### Edit invariants (locked post-publish)

`EditListing` rejects patches that change `brandId`, `modelId`, `generationId`, `year`, or `vin` with error code `LISTING_FIELD_LOCKED`. Mobile wizard's edit mode renders these fields as disabled. Drafts (`ListingDraft.payload`) have no locks — full editability before publish. Admin override is S9 work (`AdminEditListing`).

### Listing title

There is no manual `Listing.title` field in S4. Mobile and web derive the display title from structured catalog data: `Year + Brand + Model + Generation/trim when available`. Seller-written free text belongs only in Description.

### Feed visibility query

Default `ListFeed` via `ChronologicalRankingAdapter`:

```sql
SELECT * FROM listings
WHERE deleted_at IS NULL
  AND (
    status = 'active'
    OR (status = 'sold' AND sold_at > NOW() - INTERVAL '14 days')
  )
ORDER BY published_at DESC, id DESC
LIMIT 21;
```

The 14-day-sold-fade lives inside `ChronologicalRankingAdapter` (per ADR-0021, an invariant of *this specific ranking strategy*, not a global rule). S19's `PersonalizedRankingAdapter` decides its own visibility predicates.

S8 adds a BullMQ cron job that physically transitions stale-sold rows to `archived` for "My Listings" tidiness; S4's query filter already handles the public-feed disappearance correctly without the cron.

### Audit log

In addition to `listing.price_changed` (locked Q9 / Q13), S4 writes AuditLog entries on these state transitions:

- `listing.published` — `{ brandId, modelId, cityId, priceAmount, priceCurrency }`
- `listing.marked_sold` — `{ priceAmount, priceCurrency, daysActive }`
- `listing.archived` — `{ previousStatus: 'active' | 'sold' }`
- `listing.republished` — `{ previousArchivedAt: ISO8601 }`
- `listing.deleted` — `{ status: <state at deletion>, mediaCount }`
- `listing.price_changed` — `{ oldPriceAmount, oldPriceCurrency, newPriceAmount, newPriceCurrency }`

Routine edits (description, specs, contact prefs) and media operations (attach/remove/reorder) do NOT write AuditLog entries (low signal, high volume).

### Web parity (SSR read-only)

- `apps/web/src/app/[locale]/listings/page.tsx` — feed; SSR fetch via API; Load-More-button pagination; no filter UI in S4
- `apps/web/src/app/[locale]/listings/[id]/page.tsx` — detail; SSR; full OG metadata + Schema.org `Vehicle` JSON-LD; tap-to-call via `tel:` link; Message button greyed out ("Chat coming soon")
- No web wizard; no /me/* routes; no auth on web in Phase 1
- Direct Caddy variant URLs in `<img srcset>`; no Next.js Image wrapper
- Locale handling: `[locale]` URL segment → Accept-Language header to API

### Anonymous browsing

Public reads work without auth headers: `GET /listings`, `GET /listings/:id`, `GET /catalog/*`, `GET /exchange-rates`. Mobile + web both support full anonymous browsing of feed + detail.

### Documentation updates

- [ ] `listings/CONTEXT.md` updated to describe current implemented state per [ADR-0019](../../adr/0019-context-md-describes-current-state.md)
- [ ] `catalog/CONTEXT.md` updated to add EngineType/Transmission/DriveType per same rule
- [ ] `docs/prd/03-roadmap.md` updated at sprint close (S4 🟢, S5 🟡)

## Tests required (TDD mandatory)

- **Domain**: `Listing` state machine transitions; `Price` VO with `Currency` enum; `MediaCount` invariant (≤20 photos + ≤1 video); `Listing.canEditField()` helper for locked-field enforcement
- **Application**: one test class per use-case (`CreateDraft`, `UpdateDraft`, `PublishListing`, `EditListing`, `MarkSold`, `ArchiveListing`, `RepublishListing`, `DeleteListing`, `AttachMedia`, `RemoveMedia`, `ReorderMedia`, `PresignUpload`, `GetListingDetail`, `ListFeed`, `ListMyListings`, `ListMyDrafts`, `GetExchangeRates`). Each use-case test injects fake ports.
- **`EditListing` specifically**: per-locked-field rejection (5 separate spec cases); price-change AuditLog rider; currency change clearing amount
- **`PublishListing` specifically**: `EXCHANGE_RATE_MISSING` rejection; required-fields validation including missing `year` and missing used-car `mileageKm`; `at-least-one-contact-method` validation; draft → listing transition + draft deletion
- **`ChronologicalRankingAdapter`** (Testcontainers): cursor pagination + 14-day-fade + soft-delete exclusion
- **Infrastructure** (Testcontainers): `PrismaListingRepository` round-trips, `PrismaListingDraftRepository`, `PrismaExchangeRateRepository`, `PrismaListingsReadRepository`, `MinioMediaStorageAdapter` presigned URL with correct expiry + conditions (mock MinIO endpoint or live container)
- **Presentation** (e2e): full publish → fetch detail → list-in-feed cycle; locked-field rejection; cursor pagination end-of-feed; anonymous public reads succeed
- **Mobile**: upload staging queue state transitions, offline/reconnect retry from staged file, publish blocked while required media is not attached, feed pull-to-refresh, listing-detail manual retry, draft autosave + resume, wizard edit-mode field-locking UI

## Files this sprint creates / touches

```
apps/api/src/modules/listings/
├── domain/
│   ├── Listing.ts                            Root entity + state machine + canEditField helper
│   ├── ListingDraft.ts                       Wizard in-flight state entity
│   ├── ListingMedia.ts                       Media metadata + invariants
│   ├── Price.ts                              VO (amount + currency)
│   ├── ExchangeRate.ts                       VO + entity
│   ├── ListingStatus.ts                      State machine enum + transition rules
│   ├── types.ts                              Locked-fields constant, error codes
│   └── ports/
│       ├── ListingRepository.ts
│       ├── ListingDraftRepository.ts
│       ├── ListingsReadPort.ts               Cross-context read surface (4 methods)
│       ├── MediaStoragePort.ts               Presigned URL + key resolution
│       ├── ImageVariantGenerator.ts          Sharp adapter swappable to worker in S8
│       ├── ListingEventPublisher.ts          Emits 4 listing events
│       ├── VinDecoderPort.ts                 Phase 2 swap to real decoder
│       ├── MediaContentClassifierPort.ts     Phase 2 swap to ML classifier
│       ├── FeedRankingPort.ts                S19 swap to PersonalizedRankingAdapter
│       └── ExchangeRatePort.ts
├── application/
│   ├── CreateDraft.ts, UpdateDraft.ts
│   ├── PublishListing.ts, EditListing.ts
│   ├── MarkSold.ts, ArchiveListing.ts, RepublishListing.ts, DeleteListing.ts
│   ├── AttachMedia.ts, RemoveMedia.ts, ReorderMedia.ts
│   ├── PresignUpload.ts
│   ├── GetListingDetail.ts, ListFeed.ts
│   ├── ListMyListings.ts, ListMyDrafts.ts
│   └── GetExchangeRates.ts
├── infrastructure/
│   ├── PrismaListingRepository.ts
│   ├── PrismaListingDraftRepository.ts
│   ├── PrismaListingsReadRepository.ts
│   ├── PrismaExchangeRateRepository.ts
│   ├── MinioMediaStorageAdapter.ts
│   ├── SharpImageVariantGenerator.ts
│   ├── NullVinDecoder.ts
│   ├── NullContentClassifier.ts
│   ├── ChronologicalRankingAdapter.ts        Per ADR-0021
│   └── EventEmitterListingEventPublisher.ts
├── presentation/
│   ├── ListingsController.ts                 Public feed + detail + owner mutations
│   ├── DraftsController.ts                   Draft CRUD + publish
│   ├── MyListingsController.ts               /me/listings + /me/drafts
│   ├── UploadsController.ts                  /uploads/presign
│   └── ExchangeRatesController.ts            /exchange-rates
└── listings.module.ts

apps/api/src/modules/catalog/
├── domain/
│   ├── EngineType.ts, Transmission.ts, DriveType.ts
│   └── ports/{EngineType,Transmission,DriveType}Repository.ts
├── application/
│   └── ListEngineTypes.ts, ListTransmissions.ts, ListDriveTypes.ts
├── infrastructure/
│   └── Prisma{EngineType,Transmission,DriveType}Repository.ts
└── presentation/
    └── catalog.controller.ts                 Add 3 routes

packages/db/prisma/
├── schema.prisma                              + Listing field additions, ListingDraft, ExchangeRate, 3 catalog tables, ListingMedia rename
└── seed/
    ├── engine-types.json, transmissions.json, drive-types.json
    └── exchange-rates.json                    Initial USD→TMT, AED→TMT

packages/contracts/src/schemas/
├── listings.ts                                Full DTOs: ListingSummary, ListingDetail, ListingDraft, draft payload Zod, error codes
├── uploads.ts                                 Presign request/response
├── exchange-rates.ts                          FX rate DTOs
└── catalog.ts                                 +3 entity DTOs (EngineType, Transmission, DriveType)

apps/mobile/
├── app/(tabs)/sell.tsx                        7-step wizard (real implementation; replaces stub)
├── app/listings/[id].tsx                      Detail page
├── app/(tabs)/my-listings.tsx                 My Listings + drafts merged view
└── src/listings/
    ├── uploadStaging/                         FileSystem helpers, state reconstruction, queue manager
    └── wizard/                                 Per-step components, draft autosave, edit-mode locking UI

apps/web/src/app/[locale]/listings/
├── page.tsx                                   Feed (SSR + Load More)
└── [id]/page.tsx                              Detail (SSR + OG + JSON-LD)
```

## References

- **PRD feature**: [`../features/32-listings.md`](../features/32-listings.md)
- **End-to-end flow**: [`../flows/61-create-listing.md`](../flows/61-create-listing.md)
- **CONTEXT spec source** (current-state mirror, target for end-of-sprint update): [`apps/api/src/modules/listings/CONTEXT.md`](../../../apps/api/src/modules/listings/CONTEXT.md)
- **Charter sections**: §11 (Media handling), §16 (Pagination, soft-delete), §17 (Currency, multi-currency seller input)
- **Pre-S4 scope refinement**: [`sprint-04-listings-crud-pre-retro.md`](sprint-04-listings-crud-pre-retro.md)
- **ADRs**:
  - [0001](../../adr/0001-architecture.md) — Listings as bounded context; soft-delete only on Listing
  - [0008](../../adr/0008-media.md) — Media pipeline (MinIO + Sharp + Caddy + HLS)
  - [0019](../../adr/0019-context-md-describes-current-state.md) — CONTEXT.md = current state
  - [0020](../../adr/0020-document-hierarchy-and-mutability.md) — Doc hierarchy + sprint lock rule
  - [0021](../../adr/0021-feed-ranking-port.md) — Feed ranking via port abstraction

## Previous-sprint dependencies

- **S2 — auth** ✅ shipped — sellers must be authenticated for all mutations; anonymous OK for public reads
- **S3 — Catalog** ✅ shipped — Brand/Model/Generation/Color/BodyType/Region/City available; S4's first issue extends catalog with EngineType/Transmission/DriveType

## Out of scope (deferred to later sprints)

- **Dealership posting** (`dealershipId?`, `publishedAsDealership`, dealership-staff-as-uploader logic) → **S6** (Garage + Dealership)
- **Sell-from-Garage entry point** + OwnedVehicle redesign (status enum, FK columns) + bi-directional Garage↔Listing sync → **S6**
- **Pre-publish moderation** + `pending_review` status activation → no Phase 1 plan; possible Phase 2 trust-layer feature
- **Reported / banned status activation** + admin moderation queue + report-button UI → **S9**
- **Availability hours** (per-listing contact-time prefs) → **S5**
- **Phone-on-first-message** ("защищён" badge) → punted (PRD open question)
- **Saved searches + filters + favorites** → **S5**
- **Async variant generation** (move Sharp from API to BullMQ worker) → **S8**
- **Video HLS pipeline** (ffmpeg + poster frame) → **S8**
- **14-day-fade cron** (physically transitions stale-sold rows to archived) → **S8**
- **MinIO orphan cleanup cron** → **S8** (per ADR-0008)
- **Web filter sheet** + favorites + chat on web → **S5 / S7**
- **Web auth** → **S5 / S7** (when chat or favorites need it)
- **Smart feed ranking** (`PersonalizedRankingAdapter`) → **S19** (Phase 3) per ADR-0021
- **Admin FX rate write UI** → **S9** (manual DB updates in S4)
- **Real VIN decoder** (`TmProxyVinDecoder`) → **Phase 2**
- **ML content moderation** (`MlContentClassifier` — NudeNet + YOLO + pHash) → **Phase 2 trust layer**

## Open questions / risks

- **Initial FX rate values**: S4 must seed `(USD, TMT, ?)` and `(AED, TMT, ?)` — pick reasonable opening values based on current real rates; admin updates them in DB until S9 ships UI. Decision: load current real values at seed time; admin can update manually in `psql` until S9.
- **Image variant generation latency**: synchronous Sharp on 4-8 variants × 5 MB photos × N concurrent uploads may slow API. Mitigation: TM volume is low (per ADR-0008 estimate <50 listings/day); S8 swap to worker is straightforward. If user reports >3s p95 publish time, accelerate S8.
- **`url`→`key` rename in ListingMedia**: destructive migration but table has zero rows today. Safe. CI gate ensures no test data exists pre-merge.
- **Mobile staging size growth**: no per-app cap in S4. Orphan cleanup on launch is the only safety. Re-evaluate if real-device telemetry shows >500 MB staging usage.
- **Multi-device draft sync edge case**: phone A compresses + uploads partially → phone B opens draft → photos not on phone B disk render as `lost`. Acceptable Phase 1 UX; multi-device draft sync deferred.
