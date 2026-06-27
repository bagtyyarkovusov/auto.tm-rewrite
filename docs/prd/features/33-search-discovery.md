# 33 — Search & discovery

## Summary

How buyers find listings. The MLP beta ships the feed, listing detail, a small filter set, and S8a Favorites for saved listings. Saved searches, broad filter coverage, and free-text search remain post-MLP bets unless beta usage proves they block the core loop.

## Why it exists

Maral (the first-time buyer persona) needs to slice through thousands of listings to find "Toyota Camry, 2018-2020, under 200k TMT, in Aşgabat." Without good search, she'd give up and go back to Telegram channels.

## What it does (user-visible behavior)

### Default feed

- Anonymous + new users: latest listings, paginated infinite scroll
- No first-open GPS permission prompt. The feed is useful before login and before any location permission.

### Filter sheet

Bottom sheet with the MLP filter set first:

- Brand → Model
- Region / City
- Price range
- Year range
- Condition

Post-MLP filters can be added once beta behavior shows they matter:

- Vehicle category: Cars (Легковые) / Light commercial (Комтранс) / Moto
- Status: All / New / Used
- Region: TM regions (multi-select)
- City: drill-down from region
- Future explicit action: "Use my location" requests foreground GPS permission only after the user taps it, then maps the coordinate to the nearest catalog City and applies that city as the current filter.
- **Brand** → **Model** → **Generation** (using shared catalog picker; multi-select with include/exclude)
- Year range
- Price range + currency
- Mileage max
- Engine type
- Transmission
- Drive type
- Body type
- Condition
- Seller type: All / Private / Dealer
- "Only with photo"
- "Only with video"
- "Posted within: 24h / 7 days / 30 days / any"

Apply button shows match count: "Show 1,243 listings".

### Free-text search (post-MLP unless needed)

- Top-of-feed search bar
- Searches across listing title + description + brand name + model name
- Uses Postgres FTS with `pg_catalog.simple` config (Cyrillic + Latin both)
- No typo tolerance in MVP (Phase 2: Meilisearch if needed)

### Sort

- **Recency (default)** — newest first
- Price ascending / descending — post-MLP unless beta users need it immediately
- Mileage ascending
- (Phase 2) Tier (Trusted first) — only if user opts in via filter

**Sort label is always visible** so users see what they're looking at. No hidden ranking magic.

Location filters are explicit. Phase 1 does not silently rank nearby cars above newer cars. Proximity can become a documented later ranking signal through `FeedRankingPort`, but not hidden MLP behavior.

### Location discovery

Per [ADR-0022](../../adr/0022-city-first-listing-location.md), AutoTM uses a city-first location model:

- Phase 1 search filters by `regionId` and `cityId`.
- Phase 1 does not request GPS on app open.
- A later "Use my location" control maps foreground GPS to the nearest catalog City, then applies that City as a temporary browse filter.
- The app may remember the last selected city locally for convenience, but does not write a permanent "home city" to the user profile in MVP.
- Future catalog `City.latitude` / `City.longitude` centroids can support nearest-city lookup. They are catalog metadata, not user tracking data.
- Saved searches store resolved `regionId` / `cityId` only, never raw GPS coordinates.

### Search and location analytics

Search analytics are allowed for product planning and admin dashboard reporting, but they stay city-level:

- Track selected `regionId` / `cityId`, filter families used, result-count bucket, zero-result searches, saved-search creation, favorite, call/chat start, and listing city for conversion analysis.
- Use these aggregates to decide where to seed catalog data, recruit dealers, moderate suspicious listing clusters, and prioritize future city expansion.
- Do not store raw GPS coordinates, exact device location, exact map pins, or home-city profile fields for analytics in MVP.
- If a future "Use my location" action resolves GPS to a nearest catalog City, analytics stores the resolved City ID and the action source, not the coordinate.

### Favorites (shipped in S8a)

- Tap ♥ on any listing → added to Favorites
- Favorites tab: saved-listing list, tap to view
- Favorites is saved listings only in the MLP beta
- Unfavorite: tap filled ♥ again

Saved searches remain separate post-MLP work, and (Phase 3) comparisons can later reuse the Favorites surface if shaped.

### Saved searches (post-MLP bet)

- From filter results: "Save this search" button → name + notify toggle
- From a Garage Dream entry: "Notify when one is listed"
- From a brand page: "Follow {brand}"

(Full SavedSearch feature: see [Feature 35](35-subscriptions.md))

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Feed | Loading | Shimmer skeleton cards |
| Feed | Empty / no results | "No listings match. Try adjusting filters." + Reset button |
| Feed | Network error | Retry button + cached results if any |
| Filter sheet | Default | All filters collapsed; selected count badges |
| Filter sheet | Many filters set | "Reset all" button visible |
| Filter sheet | Brand/Model multi-select | "Include" / "Exclude" tabs |
| Search | Typing | Inline suggestions: brands, models matching |
| Search | No results | "No matches for '<query>'" |
| Favorites | Empty | "Tap ♥ on listings you like" |
| Favorites | Authenticated with items | Grid of thumbnails |

## Data references

- `apps/api/src/modules/listings/CONTEXT.md` — search and filter live here
- Postgres FTS on `title + description + brand_name + model_name` columns

## Decisions

- [ADR-0007](../../adr/0007-i18n.md) — FTS with `pg_catalog.simple` for mixed scripts
- [ADR-0002](../../adr/0002-stack.md) — Postgres FTS (not Meilisearch in Phase 1)
- [ADR-0022](../../adr/0022-city-first-listing-location.md) — City-first location search; explicit GPS only later
- [ADR-0023](../../adr/0023-first-party-product-analytics.md) — First-party analytics only; search analytics stay in AutoTM-owned storage
- [ADR-0027](../../adr/0027-mlp-beta-scope.md) — MLP beta scope; saved searches deferred
- [Sprint 8](../sprints/sprint-08-private-beta-polish.md) — Favorites pulled into S8a and shipped as saved listings

## Phase

**Phase 1 MLP beta for basic filters, listing detail, and saved-listing Favorites.** Saved searches, broad filters, and full free-text search are post-MLP bets.

## Out of scope

- Map-based search ("show me cars near my location") — Phase 2
- Distance/radius search — not in MVP; revisit only after nearest-city filtering proves insufficient
- First-open GPS prompt — rejected; location permission must be user-initiated
- Comparison (side-by-side) — Phase 3
- Voice search — Phase ∞
- Saved searches with complex boolean operators (AND/OR/NOT chains) — not needed
- ML / personalization beyond "recent brands viewed" — too early

## Open questions

- Auto.ru-style "Сравнение" tab in Favorites — Phase 3
