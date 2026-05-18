# ADR-0022: City-first listing location

- **Status**: Accepted
- **Date**: 2026-05-18
- **Deciders**: AutoTM founder + AI architect

## Context

AutoTM listings need location data for browsing, filtering, saved searches, admin statistics, and later "near me" discovery. The current Phase 1 data model already has a city-first shape:

- `Listing.cityId` is required.
- `Listing.regionId` is optional.
- `Listing.locationText` is optional free text.
- There are no listing-level latitude/longitude fields.
- `Region` and `City` are catalog entities.

The product discussion considered exact listing GPS, seller/user GPS, first-open geolocation prompts, radius search, a persistent home-city profile field, and nearest catalog-city matching.

The main risks are:

- Private sellers may accidentally expose a home address.
- The user creating a listing may not be physically near the car, especially when posting for a dealer, family member, or remote showroom.
- GPS permission on first open adds friction to anonymous browsing and can reduce trust.
- Exact GPS and radius search are more precision than the current MVP needs.
- The current schema and PRD already support region/city filtering without coordinates.

## Decision

AutoTM uses a city-first listing location model.

`Listing location` and `car location` mean the physical city/area where the car can be inspected, not the seller's current device location and not the user's home city.

Phase 1 stores:

- Required catalog `cityId`.
- Optional catalog `regionId`.
- Optional `locationText` for an approximate area, district, market, showroom name, or landmark.

Phase 1 does not store exact listing coordinates, does not ask for GPS on first app open, and does not expose radius search.

Listing creation must ask for the car's location, not the seller's location. Copy should discourage exact private home addresses. Dealer/showroom listings may later expose more precise business address data, but private listings stay city/area-level by default.

Browsing works without location permission. The MVP feed and filters use explicit region/city controls. A future filter action may offer `Use my location`; that action requests foreground GPS only after the user taps it, maps the result to the nearest catalog `City`, and applies that city as a temporary browse filter.

The GPS result is not persisted as a user profile or home-city field in MVP. The app may remember the last selected browse city locally for convenience. Saved searches store `regionId` and `cityId`, never raw GPS coordinates.

When nearest-city matching is implemented, `City` may gain approximate centroid coordinates (`latitude`, `longitude`) as catalog metadata. These centroids support lookup only; they are not listing coordinates.

Inspection or meeting coordinates, if added later, are private appointment data between buyer and seller and are not part of public listing discovery.

## Consequences

### Positive

- Protects private sellers from publishing precise home locations.
- Fits the current database and contracts without pretending Phase 1 has GPS support.
- Handles remote posting and dealer delegation because the listing stores where the car is, not where the poster is.
- Preserves anonymous browsing and avoids an intrusive first-open permission prompt.
- Keeps search semantics visible: users can see and change the active city filter.
- Leaves a clean path to nearest catalog-city lookup, dealer showroom locations, and private appointment coordinates later.

### Negative / accepted costs

- No true distance or radius search in MVP.
- Users near city borders may need to manually switch city filters.
- Nearest-city lookup requires catalog centroid data before it can ship.
- Some buyers may expect "cars near me" behavior; that is deliberately deferred until the city-first filter experience is stable.

### Neutral

- Future feed ranking may use region/city proximity as an explicit signal via the feed-ranking port, but Phase 1 remains chronological and filter-driven.
- Exact coordinates can still be added later for business showroom data or private appointment flows without changing the public listing-location meaning.

## Alternatives considered

- **Exact GPS coordinates on every listing.** Rejected for Phase 1 because it creates privacy and safety risk for private sellers and adds precision the MVP does not need.
- **Seller or user GPS as the listing location.** Rejected because the person posting may not be at the car's location.
- **GPS permission on first open.** Rejected because anonymous browsing should work immediately and permission prompts should be tied to an explicit user action.
- **Radius search in MVP.** Rejected because it requires coordinates, distance UX, and more ranking semantics before the core catalog-city filters have been proven.
- **Persistent home-city profile in MVP.** Rejected because it adds profile/privacy surface area before there is a strong product need.
- **Dealer/showroom precise coordinates now.** Deferred. Business locations can support exact addresses later, but they should not force private listings into the same precision model.

## References

- [ADR-0019](0019-context-md-describes-current-state.md) - CONTEXT.md describes current implemented state, not aspirational spec
- [ADR-0020](0020-document-hierarchy-and-mutability.md) - Document hierarchy and mutability rules
- [ADR-0021](0021-feed-ranking-port.md) - Feed ranking via port abstraction
- `packages/db/prisma/schema.prisma` - current `Listing` location fields
- `packages/contracts/src/schemas/listings.ts` - listing create/edit/detail location contracts
- `docs/prd/features/32-listings.md` - listing creation target capability
- `docs/prd/features/33-search-discovery.md` - search and discovery target capability
- `docs/prd/features/35-subscriptions.md` - saved search location persistence
- `docs/prd/features/40-admin.md` - admin city supply/demand metrics
- `docs/prd/flows/61-create-listing.md` - seller listing flow
- `docs/prd/flows/62-buy-flow.md` - buyer discovery flow
- `docs/prd/ops/83-legal.md` - privacy policy data collection boundary
- `docs/prd/ops/84-launch-plan.md` - post-launch city planning metrics
