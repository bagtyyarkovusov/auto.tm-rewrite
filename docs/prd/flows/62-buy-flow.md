# 62 — Buy flow (browse → contact → meet)

## Summary

Maral wants to buy her first car. From opening the app to meeting the seller IRL, the in-app journey aims to be as smooth and trust-building as possible.

## Goal

- Reduce drop-off at every step
- Build confidence at each touchpoint
- Keep the user in-app (don't lose them to Telegram)

## Step-by-step

### Step 1 — Discover

- Maral opens the feed (anonymous OK)
- Browses latest listings; uses explicit Region / City filters to narrow down
- (Future) She can tap "Use my location" inside the filter sheet; the app maps GPS to the nearest catalog City and applies that City as a temporary filter
- (Phase 2) Filters by "Trusted by AutoTM" for inspected listings

### Step 2 — Compare

- She favorites 5-10 candidates (login triggered on first ♥)
- Returns later to favorites → reviews each
- (Phase 3) Side-by-side comparison of 2-3 candidates

### Step 3 — Save a search

- She didn't find the perfect one yet
- Saves the filter: "Toyota Camry, 2018+, ≤200k TMT, Aşgabat"
- Push notifications enabled
- Now the app pings her when a new match drops

### Step 4 — A match drops

- Push notification: "New Toyota Camry 2019 matches your search"
- She taps → opens listing detail in-app via Universal Link
- Photos, price, mileage check out

### Step 5 — Contact the seller

- She taps "Message" (already logged in from step 2)
- Bottom sheet: pinned listing card at top + quick-reply chips
- She taps "Здравствуйте, ещё продаётся?" → message sent
- Aman sees push notification, opens app, replies in 4 minutes

### Step 6 — Negotiate

- Back-and-forth chat
- Aman sends a post-card referencing another car ("if not this one, I have this similar one")
- Maral asks for more photos → Aman sends an image attachment of the engine bay
- They agree on price + meeting time

### Step 7 — Meet

- Off-platform — they meet at a public location
- Maral inspects the car, decides to buy
- They complete the transaction off-platform (no in-app payment in MVP)
- Maral asks Aman to "mark sold" so the listing closes

### Step 8 — Post-purchase

- Aman marks listing as sold; system message in their conversation
- Maral receives a (Phase 2) "How was your AutoTM experience?" survey
- Maral's profile shows her as a verified buyer (Phase 3 if we go that direction)

## Trust building moments

| Moment | Trust signal |
|---|---|
| Browsing | PRO badge on dealer listings |
| Browsing | (Phase 2) Tier badge on inspected listings |
| Listing detail | Seller tenure ("3 года на auto.tm") |
| Listing detail | Response time ("Отвечает в течение часа") |
| Listing detail | Public Garage shows seller is a real car person |
| Chat | Pinned listing card prevents confusion ("which car are we talking about?") |
| Chat | Block + report visible — Maral knows recourse exists |

## Failure modes (and mitigations)

- **Maral can't find the right car** → Saved search catches her later
- **Seller doesn't reply** → Response time stat on profile warns next time
- **Seller is rude / scammer** → Block + report → admin moderation
- **Listing was misrepresented** → Maral reports → admin reviews → ban + (future) refund tier badge if applicable

## References

- [Feature 32 — Listings](../features/32-listings.md)
- [Feature 33 — Search](../features/33-search-discovery.md)
- [Feature 34 — Conversations](../features/34-conversations.md)
- [Feature 35 — Subscriptions](../features/35-subscriptions.md)
- [Feature 36 — Notifications](../features/36-notifications.md)
- [ADR-0022 — City-first listing location](../../adr/0022-city-first-listing-location.md)

## Open questions

- Should we track "intent to buy" signals (favorited >5, repeated views of same listing) for analytics? (Yes — anonymous, no PII, used to optimize feed)
- Post-purchase NPS / feedback flow — Phase 2 design
- Trust system rollout to convert this into a "AutoTM buyer guarantee" — Phase 3 ambitious goal
