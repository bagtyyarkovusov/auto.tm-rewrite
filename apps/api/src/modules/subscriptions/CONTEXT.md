# subscriptions — CONTEXT

## Purpose

Saved searches — users define filter criteria; when a matching listing is created, they get a push notification. Auto.ru calls this "Поиски" (Saved Searches). Our Phase 1 MVP feature.

## Owns (entities + tables)

- `SavedSearch` — id, userId, name?, filters (JSON typed via Zod), notifyEnabled: bool, lastNotifiedAt?, createdAt
- `SavedSearchMatchHistory` — id, savedSearchId, listingId, notifiedAt — keeps record of which listings already notified this search (no duplicate alerts)

## Filters schema (JSON column)

```ts
type SavedSearchFilters = {
  brandIds?: string[]
  modelIds?: string[]
  generationIds?: string[]
  yearMin?: number
  yearMax?: number
  priceMin?: number
  priceMax?: number
  currency?: 'TMT' | 'USD' | 'AED'
  mileageMax?: number
  regionIds?: string[]
  condition?: 'new' | 'used'
  sellerType?: 'private' | 'dealer'
}
```

Validated via Zod (`packages/contracts/`).

## Invariants

- A `SavedSearch` always has `userId` (no anonymous saved searches)
- `filters` cannot be empty — at least one filter dimension must be specified
- `priceMin <= priceMax` if both set; `yearMin <= yearMax` if both set
- A user has max 50 saved searches (soft limit; UI warns at 40)
- `notifyEnabled = false` saves the search but skips notification fan-out

## Ports exposed

```ts
interface SavedSearchReadPort {
  getSummaryForUser(userId): Promise<Array<{ id, name?, filters, notifyEnabled, lastNotifiedAt?, createdAt }>>
}
```

## Ports consumed

```ts
ListingsReadPort     // for hydrating match notifications
NotificationsPort    // to fire the actual push
```

## Events emitted

- `SavedSearchMatched` — fired when a listing matches a saved search; consumed by `notifications/`

## Events consumed

- `ListingCreated` — primary trigger. Handler:
  1. Query saved searches whose filters match the new listing (single SQL query against JSON columns + indexes)
  2. For each match: check `lastNotifiedAt` debounce (1/hr per search)
  3. Insert `SavedSearchMatchHistory` row
  4. Emit `SavedSearchMatched` event for `notifications/` to handle

## Match algorithm

```sql
SELECT id, userId
FROM saved_searches
WHERE notify_enabled = true
  AND (filters->>'brandIds' IS NULL OR :brandId = ANY(JSONB->>'brandIds'))
  AND (filters->>'modelIds' IS NULL OR :modelId = ANY(JSONB->>'modelIds'))
  AND (filters->>'yearMin' IS NULL OR :year >= (filters->>'yearMin')::int)
  AND ...
```

With GIN indexes on the JSON columns, this is < 50ms even at millions of searches.

## Rate limiting

- Per-search: max 1 push per hour, bundled digest format ("3 new BMW X5s near you")
- Per-user: soft cap 10 pushes/day across all saved searches (admin-tunable)

## Notable decisions

- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Subscriptions is its own context (not part of listings)
- [ADR-0009](../../../../docs/adr/0009-notifications.md) — Match notifications go through PushPort
