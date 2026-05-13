# 35 — Saved searches (subscriptions)

## Summary

Users save filter criteria; when a matching listing is created, they get a push notification (debounced, bundled). Auto.ru calls this "Поиски" (in Favorites tab).

## Why it exists

Maral (first-time buyer) is browsing for the right car, but the right one isn't listed yet. Without saved searches, she'd check the app every day or give up. With saved searches, she stays in the app's mindshare without effort — the app pings her.

For Ata (the power buyer), saved searches are how he tracks his dream car ("Notify me when a Mercedes E-Class W213 in Aşgabat appears for under 800k TMT").

## What it does (user-visible behavior)

### Creating a saved search

Three entry points (all create the same `SavedSearch` record):

1. **From filter results** — after applying filters, "Save this search" button at top of results
2. **From a Garage Dream entry** — "Notify me when one is listed" (filters auto-derived from the dream's brand/model/generation/year range)
3. **From a brand or model page** — "Follow Toyota Camry"

Form fields:
- Optional name ("My dream Toyota")
- Notify toggle (default ON)
- Review the filters (read-only — user goes back to filter results to edit)

### Viewing saved searches

- Favorites tab → "Saved Searches" sub-tab
- List of saved searches with: name, filter summary ("Toyota Camry, 2018+, Aşgabat, ≤200k TMT"), match count for current state, notify toggle, last-notified time
- Tap → apply filters to feed (shows current matches)

### Editing / deleting

- Swipe → delete
- Tap → edit (re-apply filters, toggle notify, rename)

### Match notification

- When a `ListingCreated` event fires, the system queries saved searches whose filters match
- For each matching search, queue a push notification — debounced: max 1 push per saved-search per hour
- Notification text: "1 new BMW X5 in Aşgabat matches your saved search" OR "3 new matches for 'My dream Toyota'"
- Tap → open listing OR the saved-search detail (if multiple matches)

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Saved searches list | Empty | "Save searches to get notified when matching cars appear" + How-to |
| Saved searches list | Has searches | Card layout, match count badge, notify toggle inline |
| Saved search detail | Default | Match results list (same as filter results) |
| Save dialog | Default | Optional name field + notify toggle + summary of filters |
| Save dialog | Limit reached | "You have 50 saved searches. Delete some first." |
| Notification | New match | Push body: "1 new <brand model> matches '<search name>'" |
| Notification | Multiple matches | Push body: "<count> new matches for '<search name>'" |

## Data references

- `apps/api/src/modules/subscriptions/CONTEXT.md`
- `apps/api/src/modules/listings/CONTEXT.md` (ListingCreated event trigger)
- `apps/api/src/modules/notifications/CONTEXT.md` (push delivery)

## Decisions

- [ADR-0001](../../adr/0001-architecture.md) — Subscriptions as its own context
- [ADR-0009](../../adr/0009-notifications.md) — Debounced delivery, per-search opt-out

## Phase

**Phase 1.**

## Out of scope

- Saved searches with complex boolean logic (NOT, OR chains) — keep filter shape flat
- Email digest of saved-search matches (no email in MVP)
- Sharing a saved search to a friend
- Public saved-search trends ("most popular saved searches this month")

## Open questions

- Soft limit at 50 searches per user — what happens at the hard limit? Reject create with helpful message
- "Notify me when this car (specific VIN) appears" — not in MVP scope; could be Phase 2
- Should we also notify on **price drops** to existing matching listings? (Useful but adds state tracking complexity — defer to Phase 2)
