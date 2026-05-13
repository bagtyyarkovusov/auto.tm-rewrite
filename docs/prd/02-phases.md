# 02 — Phases

We ship in three phases. **Cutting scope between phases is mandatory** — every "let's add this too" question goes through "which phase?" before "how do we build it?"

## Phase 1 — Marketplace MVP (~8-10 weeks)

Goal: a working marketplace with the headline chat + notifications experience.

### In scope

- **Identity** — phone OTP login, user profile, dealerships, garage, blocking
- **Catalog** — brand/model/generation pickers, regions, colors, body types (trilingual seed data)
- **Listings** — create wizard, edit, view, mark sold, photos (≤20), 1 short video (≤60s), favorites, drafts
- **Search + discovery** — feed, filter sheet, free-text search, sort by recency
- **Conversations (chat)** — 1:1 per-listing, text + image + post-card, read receipts, typing, presence, block-user
- **Saved searches** — create, list, edit, delete, push on match (debounced digest)
- **Notifications** — push (FCM+APNS), in-app feed, 6 categories, per-item opt-out
- **Garage** — add owned/dream cars, sell-from-garage shortcut, public profile display
- **Showroom** — dealership public page with their listings
- **Bortzhurnal** — blog post create, view, follow another user
- **Admin dashboard** — moderation, user mgmt, dealer verify, notification broadcast, SMS health, catalog edit
- **Public web** — landing, listing detail (with OG), dealer page, blog read-only, legal pages
- **Deep linking** — Universal Links + App Links + OG meta for share-in-chat
- **i18n** — RU + TK + EN UI; trilingual catalog; auto-detected content language

### Out of scope (deferred to later)

- Inspection reports, tier system, PDF (Phase 2)
- 360° orbit photos (Phase 3)
- AutoTM-staffed pro photos / videos (Phase 2)
- VIN auto-fill via real API (mocked in Phase 1; real integration when TM Proxy PC is stable)
- Comparisons (Phase 3)
- Service history / fuel logs in Garage (deferred)
- Public-web search / chat / sell (mobile only)
- Test drive scheduling, escrow, payments (never planned)

### Critical milestones inside Phase 1

| Sprint | Goal |
|---|---|
| 1 | Scaffold + dev environment running locally; first commit through commit 16 of charter |
| 2 | Identity — OTP login + JWT issuance end-to-end (mock SMS driver) |
| 3 | Catalog — pickers + seed data |
| 4 | Listings CRUD — create, photos upload, anonymous browse |
| 5 | Listings UX — search, filters, favorites, drafts, deep links |
| 6 | Garage + Dealership pages |
| 7 | Conversations — chat 1:1 + post-card refs |
| 8 | Notifications + Subscriptions — FCM + saved-search match |
| 9 | Admin dashboard — moderation, broadcast, SMS health |
| 10 | Public web + Blog + Polish — landing, listing detail, dealer pages, OG, app-store readiness |

## Phase 2 — Trust Layer (~6-8 weeks after Phase 1 ships)

Goal: AutoTM-backed quality signal that differentiates from "anyone-can-list" marketplaces.

### In scope

- **Inspection Reports context** — full data model + admin workflow
- **Rubric configuration** — sections, items, weights; versioned
- **Inspector workflow** — admin-facing UI to record an inspection (sections, items, photos, notes)
- **3-tier rating** — computed from totalScore; displayed on listing as a badge
- **Listing tier filter** — "Show only Trusted by AutoTM cars" (a filter, not the default sort)
- **PDF generation** — Puppeteer + HTML template, downloadable by viewer
- **Pro media attribution** — admin can upload photos/videos on behalf of a seller, marked "Photos by AutoTM"

### Operational prerequisites (must happen BEFORE Phase 2 starts)

- Rubric defined and signed off by a real mechanic
- 1-2 inspectors hired and trained
- Sample inspections done as quality control
- Pricing model decided (free / paid / subsidized)

### Out of scope

- Same anti-goals as Phase 1

## Phase 3 — 360° + Polish (~4-6 weeks after Phase 2)

Goal: differentiate visually + comparison shopping.

### In scope

- **360° orbit photos** — capture flow (walk-around camera UI) + viewer (swipe-rotation)
- **Comparisons** — side-by-side compare 2-3 listings
- **Sort + ranking refinements** — beyond pure recency (e.g., price-quality optimization with full disclosure)
- **Performance polish** — image variant tuning, query optimization passes
- **Onboarding** — first-run tutorial in mobile (Phase 1 ships without; we'll see what users need)

### Phase 3 is more flexible than 1 or 2 — content depends on what we learn after launch

## How to propose a scope change

If you want to move a feature between phases, the change goes through this checklist:

1. Does it block any in-phase feature? If yes, must be in the same or earlier phase.
2. Is the operational dependency ready? (Phase 2 inspection ops are the canonical example.)
3. Is this MVP-critical or "nice to have"? Default to deferring.
4. Updates: this file, the relevant feature PRD page, and the README index.
