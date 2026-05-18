# ADR-0021: Feed ranking via port abstraction

- **Status**: Accepted
- **Date**: 2026-05-18
- **Deciders**: AutoTM founder + AI architect

## Context

The listings feed in Sprint 4 is a chronological list (newest first), but the roadmap already names **Sprint 19 — "Sort + ranking refinements — Beyond pure recency"** as the future home for a smart algorithm that surfaces relevant or trending listings instead of pure recency.

Auto.ru's default sort is a hybrid ranking combining recency decay, listing completeness (photos, video, description, VIN), seller quality (account age, sales history, dealership PRO badge), trending signals (view velocity over 24-48h), geographic proximity, and per-viewer personalization (search history, saved searches). The result: a 3-day-old listing from a verified dealer with 12 photos can rank above a 5-minute-old listing with one photo from a new account. **AutoTM has explicitly banned paid placement** (per `docs/prd/00-vision.md` anti-goals), but the other signals are on the table for S19.

The question for S4: how do we structure the listings feed today so a smart algorithm in S19 slots in without rewriting the use-case, controllers, repository, or tests?

Two shapes were considered:

- **Shape A — Port + adapter.** `ListFeed` use-case depends on a `FeedRankingPort` interface. S4 ships `ChronologicalRankingAdapter` (sorts by `publishedAt DESC, id DESC`, includes the 14-day-fade filter for sold listings). S19 ships `PersonalizedRankingAdapter` reading viewer signals. The use-case + controllers + tests don't change — just DI binding.
- **Shape B — Inline in repository.** `ListFeed` use-case calls `PrismaListingRepository.listFeed()` which inlines the SQL. S19 refactors when needed: peel the SQL out, introduce the port, swap to a new adapter.

## Decision

**Adopt Shape A: feed ranking is a domain port (`FeedRankingPort`) with a default `ChronologicalRankingAdapter` infrastructure implementation.**

### Port shape

```typescript
// apps/api/src/modules/listings/domain/ports/FeedRankingPort.ts
export interface FeedRankingPort {
  rank(query: {
    viewerId?: string;                  // undefined for anonymous
    filters?: ListingFilterCriteria;    // S5 wires up; S4 always undefined
    cursor?: FeedCursor;
    limit: number;
  }): Promise<{
    items: Listing[];
    nextCursor?: FeedCursor;
  }>;
}
```

The port returns full `Listing` domain entities (resolved by the adapter via the listings repository), not just IDs — keeps the use-case free of a second round-trip.

### S4 adapter — `ChronologicalRankingAdapter`

Lives at `apps/api/src/modules/listings/infrastructure/ChronologicalRankingAdapter.ts`. Translates the query into:

```sql
SELECT * FROM listings
WHERE deleted_at IS NULL
  AND (
    status = 'active'
    OR (status = 'sold' AND sold_at > NOW() - INTERVAL '14 days')
  )
  AND (-- cursor predicate when cursor present)
ORDER BY published_at DESC, id DESC
LIMIT N+1;
```

This adapter owns the 14-day-fade clause (per ADR-0019, an invariant of *this specific ranking strategy* — not all ranking strategies must include it).

### Forward-looking signal capture in S4 schema

Two columns added to `Listing` in S4 even though no S4 code increments them:

- `viewCount Int @default(0)`
- `favoriteCount Int @default(0)`

These are denormalized counters that future ranking signals will consume. Cheap to add now (one migration, no data loss), expensive to retrofit later (every read path that wants to use them would need a JOIN otherwise).

### Future signals (NOT in scope for S4)

Captured here so S19 (or whichever sprint picks up ranking) has the design vocabulary:

| Signal | Source | Sprint that activates it |
|---|---|---|
| Recency decay | `publishedAt` (exists) | S19 |
| Listing completeness | Media count, description length, VIN presence, spec fullness | S19 |
| Seller quality | `User.createdAt`, completed sales count | S19 (sales count needs a counter) |
| Trending | `viewCount` (S4 adds; S8 increments via worker) | S19 |
| Personalization | Saved searches (S5+), view history table (new in S19) | S19 |
| Geographic proximity | `cityId` / `regionId` (exists) | S19 |
| Trust tier | Phase 2 inspection report column | S15 |
| Photo quality auto-score | Phase 2 staffed media pipeline | Phase 2 |

**Paid placement is permanently excluded** per `docs/prd/00-vision.md` anti-goals — no signal here ever reflects payment.

### S19 implementation pattern (forward-looking)

S19 ships `PersonalizedRankingAdapter` reading the signals above. DI binding for `FeedRankingPort` swaps from `ChronologicalRankingAdapter` to `PersonalizedRankingAdapter` (or a composite that branches by viewer state — e.g., anonymous viewers get chronological, authenticated viewers get personalized). The `ListFeed` use-case, HTTP controllers, mobile + web clients all stay unchanged.

Tab-based sorts ("Newest", "Cheapest", "Closest") as Auto.ru offers can be implemented in S19 by accepting a `sort` parameter in the controller that routes to different adapters (or different rank() variants) without changing the use-case shape.

## Consequences

### Positive

- **S19 is a pure DI/adapter swap.** No use-case, controller, contract, or test rewrites required.
- **The 14-day-fade clause is correctly localized** to the chronological strategy, not baked into the repository as a global invariant. Future strategies decide independently whether to include it.
- **Testing is cleaner.** `ListFeed.spec.ts` injects a fake `FeedRankingPort` and verifies orchestration only. `ChronologicalRankingAdapter.spec.ts` covers the SQL specifics (Testcontainers).
- **The denormalized counters (`viewCount`, `favoriteCount`) get added now**, avoiding a costly retrofit migration when S19 needs them.
- **Captures S19's design vocabulary** so the agent (human or AI) running S19 doesn't start from a blank canvas.

### Negative / accepted costs

- **~30 LOC more than inline SQL in the repository.** Genuinely small; the port + adapter pair are simpler than a fat repository method.
- **One extra abstraction layer** to navigate when debugging feed queries. Mitigated by the adapter being short and focused.
- **The `FeedRankingPort` interface might evolve when S19 ships.** Acceptable — adding optional params to the query shape is non-breaking; clients (the use-case) pass what they have. If the return shape changes materially, that's S19's call.

### Neutral

- **Anonymous viewers always get chronological in Phase 1.** S19 decides whether anonymous viewers get a personalization-light variant (e.g., "popular near you" via IP) or stay chronological.

## Alternatives considered

- **Shape B — Inline SQL in `PrismaListingRepository.listFeed()`.** Rejected: when S19 lands, every concern (cursor encoding, 14-day fade, sort order, filter composition) is tangled in one SQL string. The future agent has to peel layers apart. ~Half a day of careful refactor cost vs ~10 minutes of port-pattern cost today.
- **Score column on `Listing` only.** A `feedScore: Float` column the repository sorts by, updated by a batch job. Rejected for Phase 1 because it requires batch infrastructure (S8 worker) to write meaningful scores, and the chronological adapter can sort on `publishedAt` directly. The score-column approach may resurface in S19 as a hybrid: global trending in a column, viewer personalization in a query-time computation.
- **Strategy as a runtime config flag (`FEED_RANKING=chrono|smart`).** Rejected: makes ranking a deployment-time switch rather than an architecture seam. Encourages "smart mode is the same code path with a different branch" — exactly the entanglement Shape B has.
- **Pure ChronologicalRanking with the smart algorithm bolted on as a wrapper later.** Rejected: this is Shape B with a different label; same refactor cost.

## References

- [ADR-0001](0001-architecture.md) — Bounded contexts with ports
- [ADR-0019](0019-context-md-describes-current-state.md) — CONTEXT.md describes shipped state, not aspirational
- [ADR-0020](0020-document-hierarchy-and-mutability.md) — ADR cost (one paragraph) is cheaper than drift cost
- `docs/prd/00-vision.md` — Anti-goals: paid placement explicitly banned
- `docs/prd/03-roadmap.md` line 89 — Sprint 19 placeholder: "Sort + ranking refinements"
- `docs/prd/sprints/sprint-04-listings-crud.md` — S4 ships `ChronologicalRankingAdapter` as the default `FeedRankingPort` implementation
