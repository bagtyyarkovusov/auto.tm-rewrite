# Listings

Listings owns listing lifecycle, drafts, media associations, favorites, discovery reads, and listing-contact verification. Its source and tests define allowed state transitions and edit restrictions. Product scope comes from the owning Listings and Search specifications.

A Verified Contact Phone is independent of a User's Sign-in Methods. Preserve verification and publish gates instead of inferring contact eligibility from the identity phone. Owner mutations and public reads have different visibility and suspension rules. Banned listings cannot be restored through ordinary owner transitions.

Media upload staging and server attachment are distinct steps. Preserve ownership checks, image limits, ordering, and variant behavior. Database columns alone do not guarantee consistency among every optional catalog ID; inspect the actual validators before claiming a relationship is enforced.

Ranking/filtering belongs to the existing read adapters. Other contexts use exported read/admin ports. When changing publication, contact, or deletion, inspect conversation and moderation consumers as well as mobile create/edit flows.

Feed price sort and price-range counts read the stored `Listing.priceTmt` ([ADR-0061](../../../../../docs/adr/0061-stored-tmt-listing-price-for-feed-sort-and-range.md)). Publish, edit, and republish write it in the same statement as the Listing; after any `exchange_rates` change an operator must run the recompute (`packages/db` `listing-prices:recompute`). Display prices and the `priceMin`/`priceMax` filter convert at request time, so a stale `priceTmt` mis-orders and mis-counts but never shows a wrong price.

## Start here

- [Module composition](listings.module.ts)
- [Lifecycle and invariants](domain/Listing.ts)
- [Publish gate and tests](application/PublishListing.ts)
- [Read boundary](domain/ports/ListingsReadPort.ts)
- [Persistence and ranking tests](infrastructure)
- [HTTP integration tests](presentation)
- [Mobile flow](../../../../mobile/src/listings/CONTEXT.md)
- [Product requirements](../../../../../docs/prd/features/32-listings.md)
- [Schema](../../../../../packages/db/prisma/schema.prisma)
