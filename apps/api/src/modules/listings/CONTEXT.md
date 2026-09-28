# Listings

Listings owns listing lifecycle, drafts, media associations, favorites, discovery reads, and listing-contact verification. Its source and tests define allowed state transitions and edit restrictions. Product scope comes from the owning Listings and Search specifications.

A Verified Contact Phone is independent of a User's Sign-in Methods. Preserve verification and publish gates instead of inferring contact eligibility from the identity phone. Owner mutations and public reads have different visibility and suspension rules. Banned listings cannot be restored through ordinary owner transitions.

Media upload staging and server attachment are distinct steps. Preserve ownership checks, image limits, ordering, and variant behavior. Database columns alone do not guarantee consistency among every optional catalog ID; inspect the actual validators before claiming a relationship is enforced.

Ranking/filtering belongs to the existing read adapters. Other contexts use exported read/admin ports. When changing publication, contact, or deletion, inspect conversation and moderation consumers as well as mobile create/edit flows.

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
