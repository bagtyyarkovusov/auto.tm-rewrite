# 33 — Search & discovery

## Summary

How buyers find listings — feed, filter sheet, free-text search, saved searches (cross-references Feature 35), and favorites. Mobile-only in Phase 1 (public web is OG-landing only).

## Why it exists

Maral (the first-time buyer persona) needs to slice through thousands of listings to find "Toyota Camry, 2018-2020, under 200k TMT, in Aşgabat." Without good search, she'd give up and go back to Telegram channels.

## What it does (user-visible behavior)

### Default feed

- Anonymous + new users: latest 50 listings, paginated infinite scroll
- Authenticated with browsing history: weak personalization (recent brands viewed appear earlier)
- Authenticated with saved searches: a "Matches your saved searches" carousel at top

### Filter sheet

Bottom sheet with collapsible sections. Persistent in URL state.

- Vehicle category: Cars (Легковые) / Light commercial (Комтранс) / Moto
- Status: All / New / Used
- Region: TM regions (multi-select)
- City: drill-down from region
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

### Free-text search

- Top-of-feed search bar
- Searches across listing title + description + brand name + model name
- Uses Postgres FTS with `pg_catalog.simple` config (Cyrillic + Latin both)
- No typo tolerance in MVP (Phase 2: Meilisearch if needed)

### Sort

- **Recency (default)** — newest first
- Price ascending / descending
- Mileage ascending
- (Phase 2) Tier (Trusted first) — only if user opts in via filter

**Sort label is always visible** so users see what they're looking at. No hidden ranking magic.

### Favorites

- Tap ♥ on any listing → added to Favorites
- Favorites tab: thumbnails grid, tap to view
- Favorites tab also surfaces saved searches and (Phase 3) comparisons
- Unfavorite: tap filled ♥ again

### Saved searches (entry points)

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

## Phase

**Phase 1.**

## Out of scope

- Map-based search ("show me cars near my location") — Phase 2
- Comparison (side-by-side) — Phase 3
- Voice search — Phase ∞
- Saved searches with complex boolean operators (AND/OR/NOT chains) — not needed
- ML / personalization beyond "recent brands viewed" — too early

## Open questions

- Distance-based filtering — need device location permission; defer to Phase 2
- Search analytics: tracking what users search for to improve catalog? Probably yes
- Auto.ru-style "Сравнение" tab in Favorites — Phase 3
