# 62 — Buy flow (browse → contact → meet)

## Summary

Maral wants to buy her first car. In the MLP beta, the journey is deliberately small: browse, filter, inspect a listing, contact the seller, and meet offline.

Favorites, saved-search notifications, rich chat, dealer showrooms, public Garage trust signals, and post-purchase surveys are post-MLP bets.

## Goal

- Prove buyers can find real listings
- Prove sellers respond to buyer contact
- Keep the first loop simple enough to observe and fix quickly

## Step-by-step

### Step 1 — Discover

- Maral opens the feed (anonymous OK)
- Browses latest listings
- Uses explicit Region / City, Brand / Model, Price, Year, and Condition filters
- No first-open GPS prompt
- No saved-search carousel

### Step 2 — Inspect

- She opens a listing detail page
- Checks photos, price, mileage, city, seller block, and description
- She can share the listing URL externally
- She cannot compare side-by-side in the MLP beta

### Step 3 — Contact the seller

- She taps **Message**
- If anonymous, OTP auth opens and then resumes the same action
- A simple per-listing text thread opens
- She sends: "Is it still available?"

### Step 4 — Seller replies

- Aman opens his conversation list
- He sees the listing-scoped thread
- He replies in text
- No typing indicator, read receipt, image message, post-card, or push delivery is required for the MLP beta

### Step 5 — Negotiate

- Back-and-forth text conversation
- If they need extra photos or voice calls, they can exchange that manually for beta learning
- The goal is to learn whether AutoTM creates enough buyer-seller contact, not to solve every negotiation workflow immediately

### Step 6 — Meet

- Off-platform — they meet at a public location
- Maral inspects the car, decides whether to buy
- Transaction stays off-platform; no in-app payment, escrow, or scheduling
- Aman marks the listing as sold if the deal completes

## Trust building moments

| Moment | MLP trust signal |
|---|---|
| Browsing | Clear photos, price, city, mileage, and description |
| Listing detail | Seller tenure and visible contact path |
| Contact | Conversation is scoped to the listing |
| Safety | Report listing/user is visible once minimal admin ships |

Post-MLP trust candidates: PRO dealer badge, public Garage, response-time stats, inspection tier, richer moderation, seller history.

## Failure modes (and mitigations)

- **Maral can't find the right car** → Capture the repeated-search pain; shape saved searches only if this repeats.
- **Seller doesn't reply** → Capture response-delay data; shape direct-message push only if this blocks conversion.
- **Seller is rude / scammer** → Report → admin moderation.
- **Listing was misrepresented** → Report → admin review; inspection tier is a later trust bet.

## References

- [Feature 32 — Listings](../features/32-listings.md)
- [Feature 33 — Search](../features/33-search-discovery.md)
- [Feature 34 — Conversations](../features/34-conversations.md)
- [ADR-0027 — MLP beta scope](../../adr/0027-mlp-beta-scope.md)
- [ADR-0022 — City-first listing location](../../adr/0022-city-first-listing-location.md)

## Open questions

- Should the seller be able to hide their phone number until the buyer messages? (Post-MLP trust/UX decision)
- Which beta metric is the strongest contact-quality signal: message sent, seller reply, or meeting confirmed?
