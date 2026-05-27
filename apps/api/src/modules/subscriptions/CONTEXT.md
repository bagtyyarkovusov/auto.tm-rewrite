# subscriptions — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in `docs/prd/features/35-subscriptions.md`. Per [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md), saved searches and match notifications are post-MLP bets.

## Purpose

Saved searches — users define filter criteria; when a matching listing is created, they get a push notification. Schema-only today; UX, match algorithm, and notification fan-out ship only after a post-MLP bet is shaped.

## Owns (entities + tables)

- `SavedSearch` — id, userId (FK → User, Cascade), filters (JSON), pushEnabled (Boolean, default true), lastDigestAt?, createdAt, updatedAt. Index on `userId`.

## Invariants (enforced today)

- `SavedSearch.userId` references an existing User (FK; deletes cascade with the user).
- `SavedSearch.filters` is a JSON column — no schema-level validation. Application-level Zod parsing lands when a post-MLP saved-search bet is shaped.

## Module shape (today)

- `apps/api/src/modules/subscriptions/`:
  - `domain/`, `application/`, `infrastructure/` — empty
  - `presentation/subscriptions.controller.ts` — stub
  - `subscriptions.module.ts` — registers stub controller

## Ports exposed

- (none today — post-MLP saved-search work adds `SavedSearchReadPort`)

## Ports consumed

- (none today)

## Shipped use-cases

- (none today)

## Events emitted

- (none today)

## Events consumed

- (none today)

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md):

- **Saved-search creation** — `docs/prd/features/35-subscriptions.md`. Adds:
  - Use-cases: `CreateSavedSearch`, `DeleteSavedSearch`, `ListSavedSearches`, `ToggleNotifications`
  - Validated filters schema (Zod in `packages/contracts/`):

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

  - Application invariants: at least one filter dimension required; `priceMin <= priceMax`; `yearMin <= yearMax`; soft cap of 50 saved searches per user (UI warns at 40); `pushEnabled = false` skips notification fan-out.
  - `SavedSearchReadPort` for cross-context summaries.

- **Match notifications** — `docs/prd/features/35-subscriptions.md` + `docs/prd/features/36-notifications.md`. Adds:
  - New `SavedSearchMatchHistory` entity (id, savedSearchId, listingId, notifiedAt) to prevent duplicate alerts.
  - `ListingCreated` consumer that runs the match algorithm:
    1. Query saved searches matching the new listing (JSON-column filter against GIN indexes)
    2. Check `lastDigestAt` debounce (max 1 push/hour per search; bundled-digest format)
    3. Insert `SavedSearchMatchHistory` row
    4. Emit `SavedSearchMatched` event for `notifications/` to handle
  - `SavedSearchMatched` event emission.
  - Per-search rate limit: max 1 push/hour, bundled-digest format ("3 new BMW X5s near you")
  - Per-user soft cap: 10 pushes/day across all saved searches (admin-tunable)
  - Ports consumed: `ListingsReadPort` (hydrate match notification), `NotificationsPort` (fire push)

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Subscriptions is its own context
- [ADR-0009](../../../../../docs/adr/0009-notifications.md) — Match notifications go through `PushPort`
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) — Saved searches are post-MLP
