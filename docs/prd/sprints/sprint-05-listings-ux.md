# Sprint 5 — Listings UX (search, filters, favorites, drafts)

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | M4 — I can search + save |
| **Demo audience** | 10-20 beta testers (mocked data) |
| **Estimated time** | ~1 week |

## Goal

Make the marketplace useful for discovery. Search by brand+model+price+city+year; save filter sets; favorite listings; resume drafts. Deep links round-trip from share to install to detail.

## User capability (the demo line)

> "I filter for BMW 3-series under 200k TMT in Ashgabat, find 4 cars, favorite 2, save the search. I open a draft I started last week. I share a listing link from web to mobile and it deep-links to the right screen."

## Bounded contexts touched

- **Primary**: `listings/` (search use-cases + Postgres FTS), `subscriptions/` (SavedSearch persistence — no fan-out yet, that's S8)
- **Supporting**: `identity/Favorite`, deep-linking config in mobile + web

## Acceptance criteria (DoD)

- [ ] `GET /api/v1/listings?brandId=&modelId=&priceMin=&priceMax=&cityId=&yearMin=&yearMax=&q=` with cursor pagination
- [ ] Free-text search uses Postgres FTS with `pg_catalog.simple` tokenizer (charter §10) — handles Cyrillic + Latin both
- [ ] Filter sheet on mobile: brand → model → price slider → city multi-select → year range → body type → color
- [ ] Sort options: recency (default), price-low-to-high, price-high-to-low
- [ ] **Favorites**: `POST /api/v1/listings/{id}/favorite` (idempotent), `DELETE /api/v1/listings/{id}/favorite`, `GET /api/v1/me/favorites`
- [ ] **Drafts**: auto-save every 5 s while editing in the wizard; restore on next entry to Sell flow
- [ ] **Saved searches**: `POST /api/v1/saved-searches` (name + filters JSON), `GET /api/v1/me/saved-searches`, `DELETE /api/v1/saved-searches/{id}` (no notifications yet — that's S8)
- [ ] **Deep links**:
  - Mobile scheme: `autotm://listings/{id}`
  - Universal Links: `https://auto.tm/{locale}/listings/{id}` opens the app if installed, web fallback otherwise
  - OG metadata on web listing detail (title, image, description) so chat previews look right
- [ ] Realistic filter combo returns results in <200 ms p95 (seed data with 10k listings for testing)
- [ ] **Mobile picker UI**: `apps/mobile/app/(modals)/brand-picker.tsx` + `model-picker.tsx` composed from existing RNR primitives (Dialog, Card, Input, Button) — consumes S3 catalog API via `apiClient` (deferred from S3 per the pre-S3 grill)
- [ ] **App-wide locale store** (Zustand) + query-key invalidation hook: when locale changes, `catalog.*` queries refetch with new `?locale=` and visible labels flip without re-mount (deferred from S3)
- [ ] **`react-i18next`** installed in `apps/mobile` for app chrome / static UI translation strings. Catalog-backed labels (engine type, transmission, drive type, body type, color, etc.) come from localized catalog API responses, not hard-coded frontend enum JSON.
- [ ] **Web filter component**: `apps/web/src/components/filter/BrandModelSelect.tsx`
- [ ] `listings/CONTEXT.md` + `subscriptions/CONTEXT.md` updated (per [ADR-0019](../../adr/0019-context-md-describes-current-state.md) — describe what shipped)
- [ ] `docs/prd/03-roadmap.md` updated (S5 🟢, S6 🟡)

## Tests required (TDD mandatory)

- **Domain**: `ListingFilter` (composable predicates), `SavedSearch` (filter serialization round-trip)
- **Application**: `SearchListings`, `SaveSearch`, `FavoriteListing`, `SaveDraft`, `RestoreDraft` — one test per use-case
- **Infrastructure** (Testcontainers): FTS index hits expected paths; cursor pagination is stable across same-second creates (tie-break by id)
- **Presentation** (e2e): filter combination returns expected listings; favorite toggles idempotently
- **Performance**: query plan inspection on the worst-case filter combo

## Files this sprint creates / touches

```
apps/api/src/modules/listings/
├── domain/
│   └── ListingFilter.ts          Composable filter predicate
├── application/
│   ├── SearchListings.ts          Cursor-paginated, filter+sort
│   ├── FavoriteListing.ts, UnfavoriteListing.ts, ListMyFavorites.ts
│   ├── SaveDraft.ts, RestoreDraft.ts, DeleteDraft.ts
└── infrastructure/
    ├── PrismaListingSearchRepository.ts   FTS + filter SQL builder

apps/api/src/modules/subscriptions/
├── domain/
│   ├── SavedSearch.ts
│   └── ports/SavedSearchRepository.ts
├── application/
│   ├── CreateSavedSearch.ts, ListMySavedSearches.ts, DeleteSavedSearch.ts
│   ├── UpdateSavedSearch.ts
├── infrastructure/
│   └── PrismaSavedSearchRepository.ts
├── presentation/
│   └── SavedSearchesController.ts
└── subscriptions.module.ts

packages/db/prisma/migrations/<ts>_listings_fts_index/migration.sql
  -- Adds tsvector column + GIN index on listings.title/description

apps/mobile/app/(tabs)/search.tsx              (real filter sheet)
apps/mobile/app/(modals)/save-search.tsx
apps/web/src/app/[locale]/listings/page.tsx    (filter UI)
apps/web/next.config.ts                         (universal-link verifier)
apps/mobile/app.json                            (associated domains)
```

## References

- **PRD features**: [`../features/33-search-discovery.md`](../features/33-search-discovery.md), [`../features/35-subscriptions.md`](../features/35-subscriptions.md)
- **End-to-end flows**: [`../flows/62-buy-flow.md`](../flows/62-buy-flow.md), [`../flows/63-share-listing-in-chat.md`](../flows/63-share-listing-in-chat.md)
- **Charter sections**: §10 (Search — Postgres FTS upgrade path to Meilisearch documented), §16 (Pagination)

## Previous-sprint dependencies

- S2 — auth (Favorite + SavedSearch + Draft are auth-gated)
- S3 — Catalog (filter sheet needs real pickers)
- S4 — Listings (need a listing model to filter against)

## Open questions / risks

- **FTS multilingual**: `pg_catalog.simple` tokenizer doesn't stem. Adequate for short titles, may struggle with descriptive search. Charter docs Meilisearch as upgrade path; defer to Phase 3.
- **Tie-breaking in cursor pagination**: same-second `createdAt` requires composite cursor (`createdAt, id`). Ship this from the start to avoid pagination drift.
- **Saved-search filter schema versioning**: filters are JSON. If we change filter shape in a later sprint, old saved searches break. Decision: store `filterSchemaVersion: 1` alongside; migrate forward.
