# 38 — Dealership Showroom

## Summary

The public-facing page for a Dealership — logo, name, city, hours, contact, response-time stat, and all their active listings. Accessible via `auto.tm/dealers/<slug>` (web) and `app://dealers/<slug>` (mobile deep link).

## Why it exists

Dealerships rely on credibility. Ilýa (the dealer rep persona) needs:
- A "card" he can share externally ("here's my showroom")
- A place where buyers can see all his inventory at a glance
- Public trust signals (PRO badge, response time, tenure, verified status)

Without a showroom page, dealerships look identical to private sellers in the feed — a disservice to verified shops.

## What it does (user-visible behavior)

### Showroom page (public, mobile + web)

Header section:
- Logo (square, 80×80 mobile / 120×120 web)
- Name + PRO badge (if `verifiedAt` is set)
- City
- Tenure: "3 года на auto.tm"
- Response time: "Отвечает в течение часа" (computed from past conversations)
- Action buttons: **Call** + **Message a sales rep** + **Get directions** (if map address set)

About section:
- Description (Markdown, optional)
- Hours of operation (Mon-Sun, hours per day)
- Address text (optional map pin in Phase 2)

Listings section:
- All `active` listings of the dealership
- Same card style as feed
- Filter / sort within this dealer (mini-filter)
- Pagination

Stats (visible only to dealer members + admin):
- Active listings count
- Total sold (lifetime)
- Average response time
- New chats this week

### How a user reaches the showroom

- From a listing detail: tap dealer name → showroom
- From the feed: dealer-flagged listings have "From <dealer>" subtitle, tap to open showroom
- From shared link: WhatsApp recipient taps URL → Universal Link / App Link opens showroom in app or browser
- Direct URL: `https://auto.tm/dealers/<slug>` (SEO-friendly, OG-friendly)

### Mobile vs. web

Identical content. Web is server-rendered with OG meta:
- `og:title` = "<Dealer name> — Verified Dealership in <City>"
- `og:image` = dealer logo or hero photo
- `og:description` = "<N active listings> · <response time> · <tenure>"

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Showroom | Default | Full layout |
| Showroom | No active listings | "No listings right now — check back soon" |
| Showroom | Not verified | No PRO badge; "Verification pending" if user is the dealer themselves |
| Showroom | Anonymous viewer | Action buttons visible; tapping triggers login |
| Showroom | Listing-card-from-share-link unfurl | OG card with logo + active listing count |

## Data references

- `apps/api/src/modules/identity/CONTEXT.md` — Dealership entity
- `apps/api/src/modules/listings/CONTEXT.md` — Dealer's listings
- Public web route: `apps/web/CONTEXT.md` → `/[lang]/dealers/[slug]`

## Decisions

- Showroom is a **page**, not a separate bounded context — built on top of existing Dealership entity
- Verification is admin-only in MVP (no self-serve dealership signup to prevent spam)
- Free PRO badge in MVP (no payment integration yet)

## Phase

**Phase 1.**

## Out of scope

- Map embed (Phase 2 — depends on offline map tile licensing or external maps SDK)
- Reviews / ratings for dealerships (Phase ∞)
- Multi-location dealerships (one dealership = one city in MVP)
- Custom URL slug pattern beyond auto-generated (we generate slugs from name)
- Self-serve dealership creation (admin-only for MVP — KYC concern)

## Open questions

- Hours of operation editor UX — admin-edit or dealer-self-edit? (Likely dealer-self-edit, admin verifies)
- Response time calculation — over last 7 days? 30 days? (Likely 30 days, rolling)
- Should we show "X people viewed this dealer today"? (Probably not — feels stalkerish)
