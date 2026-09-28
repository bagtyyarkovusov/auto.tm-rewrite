# ADR-0061: Stored TMT listing price for feed sort and range filtering

- **Status**: Accepted
- **Date**: 2026-09-28
- **Deciders**: AutoTM founder
- **Amends**: the "Score column on `Listing` only" rejection in [ADR-0021](0021-feed-ranking-port.md)'s Alternatives considered. The rest of ADR-0021 remains in force.

## Context

The feed ([issue #360](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/360)) adds price sort orders and a price-range filter. Listings carry prices in mixed currencies (TMT, USD, AED), so every comparison must happen in one currency. Sorting raw `priceAmount` mixes units and orders Listings wrongly. Converting at query time cannot use an index — the feed is the hottest query in the product — and keyset cursors become unstable, because a rate change between two pages shifts every row's computed price and moves the page boundary. ADR-0021 rejected a stored sort column for Phase 1 because it needed batch infrastructure that did not exist yet.

Exchange rates are read-only in the API today (`GetExchangeRates`); they change only through operator database access.

## Decision

**`Listing` carries a stored, derived `priceTmt` used only for feed sort ordering and price-range counts. Display price and the `priceMin`/`priceMax` filter still convert at request time. Rates will be managed in admin.**

- **Three write points.** `PublishListing`, `EditListing` (every saved edit), and `RepublishListing` compute `priceTmt` via the domain `toPriceTmt` with the current `<currency> -> TMT` rate in the same statement as the Listing write. A foreign currency without a positive rate is rejected with `EXCHANGE_RATE_MISSING`.
- **One rule, three copies.** The conversion expression exists in `toPriceTmt` (TypeScript), `recomputeListingPricesTmt` (SQL, `packages/db`), and the backfill in migration `20260928000000_add_listing_price_tmt` (SQL). They must stay identical; the cross-referencing comments are load-bearing.
- **Recompute obligation.** After any `exchange_rates` change, an operator runs `pnpm --filter @auto-tm/db listing-prices:recompute`. Rates have no API or admin write path today, so this is a manual step. The recompute is idempotent, rewrites only changed rows, leaves `updatedAt` alone, and sets `priceTmt` to NULL for a currency without a positive rate; NULL rows sort last in both price directions and fall out of ranges.
- **Rates will be managed in admin, and the admin flow owns the recompute.** The admin rate-management flow is the intended write path for `exchange_rates`. When it ships, applying a rate change must execute `recomputeListingPricesTmt` as part of the same flow, retiring the manual step. This is an acceptance requirement on that future work, not an optional nicety.
- **`priceTmt` is sort/filter truth, never display truth.** `displayPriceTmt` on feed items and the `priceMin`/`priceMax` bounds convert from live rates at read time. A stale `priceTmt` therefore mis-orders and mis-counts but never shows a wrong price.
- **ADR-0021's Phase 1 rejection is superseded.** The batch infrastructure it waited for is a single shared recompute query; the operator-run manual step is accepted at the current table size until the admin rate flow ships.

## Consequences

### Positive

- Price sort and range counts run on one indexed column (`status, priceTmt, id`) with stable keyset cursors.
- Ordering and counts use one currency; displayed prices stay live-converted and unaffected by staleness.
- The future admin rates screen has its core consistency requirement already decided: it cannot ship a rate write without the recompute.

### Negative / accepted costs

- `priceTmt` can go stale between a rate change and the recompute; ordering and counts are wrong in that window.
- The conversion rule is hand-synced across three copies.
- Known gaps recorded in the #360 pull-request review: `pnpm db:seed` changes rates without recomputing, and `PrismaListingRepository.save()` does not write `priceTmt` (no production caller today).

### Neutral

- No worker scheduling is added; the recompute is a manually invoked script.

## Alternatives considered

- **Convert at query time.** Rejected: no index over a cross-table expression, and cursors destabilize when rates change mid-pagination.
- **Defer until the S8 worker exists** (ADR-0021's stance). Superseded: the manual recompute is acceptable at reviewer-phase scale, and the admin-owns-recompute rule governs the write path's arrival.
- **Build admin rate management before shipping the feed sort.** Rejected: the manual recompute is acceptable at current scale, and blocking the feed on an admin surface delays it for no user-visible gain.
- **Single-currency marketplace.** Rejected by product reality: sellers price in USD.

## References

- [ADR-0021](0021-feed-ranking-port.md) — feed ranking port; original stored-column rejection (amended here)
- [ADR-0004](0004-migrations.md) — migration discipline
- [ADR-0020](0020-document-hierarchy-and-mutability.md) — document hierarchy
- [Issue #360](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/360) — feed sort orders, price range, brand counts
- Migration `20260928000000_add_listing_price_tmt`; `packages/db/src/listing-prices.ts`
