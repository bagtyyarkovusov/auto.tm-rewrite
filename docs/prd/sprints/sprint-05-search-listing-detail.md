# Sprint 5 — Search + listing detail

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 (MLP beta) |
| **Milestone** | M4 — I can find relevant cars |
| **Demo audience** | 10-20 beta testers with seeded listings |
| **Estimated time** | ~1 week |

> **Scope refinement (2026-06-06, pre-issue):** Web listing-detail/feed SSR is **not** in S5 — it moved to **S8** (`Public web + legal links`, which already absorbs S4's deferred #95) per [ADR-0027](../../adr/0027-mlp-beta-scope.md) and the 2026-05-29 entry in [`sprint-04-listings-crud-retro.md`](sprint-04-listings-crud-retro.md). S5's buyer surface is **mobile-only**. Locks with this content when the roadmap row flips 🟡.

## Goal

Make the S4 listing surface useful for buyers. A buyer can narrow the feed by the few filters that matter, open a listing detail screen, and decide whether to contact the seller.

This sprint intentionally does **less** than the old Listings UX sprint. It does not ship favorites, saved searches, deep-link install flows, complex sort modes, or the notification foundation.

## User capability (the demo line)

> "I filter for BMW 3-series under 200k TMT in Ashgabat, open a listing, inspect the photos/specs/price, and know how to contact the seller."

## Bounded contexts touched

- **Primary**: `listings/` — search use-case + filter criteria
- **Supporting**: `catalog/` read data for picker labels; mobile listing surfaces (web SSR detail/feed → S8)

## Acceptance criteria (DoD)

- [ ] `GET /api/v1/listings` accepts MLP filters: `brandId`, `modelId`, `cityId`, `priceMin`, `priceMax`, `yearMin`, `yearMax`, `condition`
- [ ] Cursor pagination remains stable across same-second creates (`publishedAt`, `id` tie-break)
- [ ] Default sort remains recency only (`publishedAt DESC, id DESC`)
- [ ] Mobile feed filter sheet supports brand → model, city, price range, year range, condition
- [ ] Mobile listing detail shows photo gallery, specs, price, seller block, Call, Message, Share
- [ ] Empty and zero-result states are clear: reset filters, no fake recommendations
- [ ] Free-text search, favorites, saved searches, price sort, body/color filters, install deep-linking, and **public web SSR (listing detail + feed → S8 per #95)** are deferred
- [ ] `listings/CONTEXT.md` updated if new search invariants or endpoints ship
- [ ] `docs/prd/03-roadmap.md` updated when S5 closes

## Tests required

- **Domain/application**: filter criteria serialization and `SearchListings`
- **Infrastructure**: repository query with representative filters, cursor stability
- **Presentation**: API e2e for filtered listing feed
- **Client smoke**: mobile filter sheet applies filters and listing detail renders seeded listing data

## Files this sprint creates / touches

```
apps/api/src/modules/listings/
├── domain/
│   └── ListingFilter.ts
├── application/
│   └── SearchListings.ts
└── infrastructure/
    └── PrismaListingSearchRepository.ts

apps/mobile/app/(tabs)/search.tsx
apps/mobile/app/listings/[id].tsx
```

## References

- **PRD features**: [`../features/32-listings.md`](../features/32-listings.md), [`../features/33-search-discovery.md`](../features/33-search-discovery.md)
- **End-to-end flow**: [`../flows/62-buy-flow.md`](../flows/62-buy-flow.md)
- **ADRs**: [ADR-0027](../../adr/0027-mlp-beta-scope.md), [ADR-0022](../../adr/0022-city-first-listing-location.md)

## Previous-sprint dependencies

- S2 — auth for action-gated contact buttons
- S3 — catalog data for filters
- S4 — listing model, feed, and listing detail foundation

## No-gos

- No saved-search persistence
- No notification or digest work
- No favorites tab
- No broad filter matrix
- No Meilisearch
- No GPS/radius/map search
