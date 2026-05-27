# 64 — Saved search match flow

## Summary

A listing is created that matches one of Maral's saved searches. She receives a push notification, taps, lands on the listing.

**MLP status:** deferred by [ADR-0027](../../adr/0027-mlp-beta-scope.md). This flow returns after beta users repeatedly perform the same searches manually and direct-message/contact usage proves notifications are worth the platform surface.

## Goal

- Latency: ≤ 5 seconds from listing publish to Maral's notification
- Relevance: only matches that are actually her saved criteria
- Rate limiting: she doesn't get spammed when a dealer uploads 20 cars at once

## Step-by-step

### Step 1 — A listing is published

- Aman publishes his Lada Granta listing (`status` changes `draft → active`)
- API emits `ListingCreated` event with the listing payload

### Step 2 — Event handler in `subscriptions/`

- Subscriptions context handles the event:
  1. Query `SavedSearch` table for searches whose filters match this listing
     - Index-supported query (GIN on JSON columns), ~50ms even at scale
  2. For each matching search:
     - Check `lastNotifiedAt`: if < 1 hour ago, defer (accumulate for next batch)
     - Else: record this match in `SavedSearchMatchHistory`
     - Emit `SavedSearchMatched { searchId, userId, listingId, matchedAt }`

### Step 3 — Notifications fan-out

- `notifications/` listens for `SavedSearchMatched`
- For each match:
  - Check user's `NotificationPreference` for `SAVED_SEARCH_MATCH` category
  - If disabled per-category OR disabled per-search: skip
  - Else: enqueue a push job in BullMQ

### Step 4 — Worker dispatches push

- `apps/worker` picks the push job
- Calls `PushPort.send()`:
  - FCM for Android tokens
  - APNS for iOS tokens
- Push payload:
  - Title: search name OR "Saved search match"
  - Body: "1 new Toyota Camry 2019 matches '{search name}'"
  - Deep link: `auto.tm/ru/listings/<id>`
  - Category: `SAVED_SEARCH_MATCH`
- On success: write to `NotificationHistory`

### Step 5 — Maral's phone vibrates

- iOS / Android shows the native notification
- Maral taps it
- OS opens the AutoTM app (or installs it via deferred link if not installed — Phase 2)
- App navigates to `/listings/<id>` (Universal Link / App Link path)

### Step 6 — Maral views the listing

- Listing detail screen
- She can favorite, message, save, share
- Continues with the buy flow (Flow 62)

## Debounce + digest behavior

When a dealer uploads 5 cars in quick succession that all match Maral's saved search:

1. First listing: notification sent ("1 new Toyota Camry 2019 matches '{search name}'")
2. Listings 2-5 within the next hour: accumulate; do NOT send individual pushes
3. After 1 hour OR at digest cron: send ONE digest push: "4 more Toyota Camrys match '{search name}'"

Implementation:
- `SavedSearch.lastNotifiedAt` updated only when a push actually fires
- `SavedSearchMatchHistory` records every match (regardless of whether push fired)
- Hourly cron sweeps for "matches since lastNotifiedAt with count >= 1 and time-since > 1h" → fires digest

## Visual / in-app

When Maral opens the app (regardless of how — push or organically):

- The "Matches your saved searches" carousel at top of feed updates
- The in-app notification feed shows the match
- The matching SavedSearch in her list shows updated "X new matches since last view"

## Edge cases

- Listing matches multiple saved searches of the same user → consolidate into one notification ("Matches 2 of your saved searches")
- Listing is created then immediately deleted/banned → no push fires (event handler checks current status before sending)
- User has no push token registered → in-app feed entry only
- User is currently online (app foreground) → in-app banner only, no native push (handled per ADR-0009)
- Saved search has `notifyEnabled=false` → query still runs (to update "new matches" count) but no push

## References

- [Feature 35 — Subscriptions](../features/35-subscriptions.md)
- [Feature 36 — Notifications](../features/36-notifications.md)
- `apps/api/src/modules/subscriptions/CONTEXT.md`
- `apps/worker/CONTEXT.md`
- [ADR-0009 — Notifications](../../adr/0009-notifications.md)

## Open questions

- Digest format if many matches accumulate — separate notifications per listing OR one bundled? (Likely one bundled with count)
- Should we notify on listing **updates** that newly match a saved search? (Edge case; defer)
- Time-of-day quiet window — defer to Phase 2 (per-user setting)
