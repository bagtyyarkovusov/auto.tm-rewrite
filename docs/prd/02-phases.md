# 02 — Phases

We ship the smallest complete marketplace loop first, then bet on the next layer from real usage.

The original Phase 1 was a broad marketplace MVP. [ADR-0027](../adr/0027-mlp-beta-scope.md) narrows the first release to an **MLP beta**: enough for real buyers and sellers to use AutoTM, not enough to run every future product surface.

## Phase 1 — MLP beta

Goal: prove the core loop with real users.

> A seller posts a real car. A buyer finds it. The buyer contacts the seller. AutoTM can moderate obvious abuse.

### In scope

- **Identity** — phone OTP login, basic user profile, anonymous browsing, auth only on action
- **Catalog** — brand/model/generation pickers, regions, cities, colors, body types, engine/transmission/drive lookups needed by listings
- **Listings** — create, edit, view, mark sold/archive, photos, drafts, public feed, owner listing management
- **Basic search + discovery** — feed, listing detail, brand/model/city/price/year filters, recency sort
- **Contact seller** — simple per-listing buyer-to-seller contact; text-first, no rich chat requirements
- **Minimal admin** — listing/user moderation, report queue, basic audit log, catalog data access where needed
- **Public web essentials** — landing page, public listing detail with OG metadata, legal pages
- **Private beta software readiness** — localized, account-complete, moderated app loop; distribution, real OTP, prod-like deploy, monitoring drills, and first-user invites are deferred to a later deployment/on-site cutover sprint
- **i18n essentials** — RU + TK + EN UI shell and trilingual catalog where already required

### Deferred out of MLP beta

- Garage, dream-car flows, sell-from-Garage
- Dealership showroom, PRO badge, dealer-member management
- Saved searches and match notifications
- Full notification platform: 6 categories, in-app feed, digests, broadcast, marketing
- Rich chat: image messages, post-card messages, read receipts, typing, presence, quick replies, durable outbox
- Blog / Bortzhurnal
- Video upload, ffmpeg/HLS transcoding, and async media processing beyond photo variants needed by listings
- Full admin dashboard beyond moderation essentials
- Full app-store polish and public launch marketing
- Inspection reports, tier badges, PDF reports
- 360 orbit photos, comparisons, advanced ranking, onboarding polish

### MLP beta sprint path

| Sprint | Goal |
|---|---|
| S1 | Scaffold + dev environment running locally |
| S2 | Identity — OTP login + JWT issuance end-to-end |
| S3 | Catalog — pickers + seed data |
| S4 | Listings CRUD — create, photos, anonymous browse |
| S5 | Search + listing detail — buyers can find relevant cars |
| S6 | Contact seller — buyer and seller can communicate simply |
| S7 | Minimal admin + moderation — bad content can be controlled |
| S8 | Private beta polish — product-complete beta substrate; first-user invites require the deferred deployment/on-site cutover sprint |

## Phase 2 — Post-MLP marketplace bets

Goal: deepen the product only where beta behavior proves a missing capability.

Phase 2 is not a fixed sprint roster. The betting table chooses from these shaped candidates after Phase 1 learning:

- **Better discovery beyond shipped Favorites** — if buyers cannot narrow or search listings well enough with the S8a Favorites list + MLP filters
- **Saved searches** — if buyers repeat the same searches manually
- **Direct-message push** — if contact usage proves notifications would materially improve response time
- **Richer chat** — if users need image attachments, post-card messages, read receipts, or quick replies
- **Dealership showroom** — if dealers actively post enough inventory to deserve a dedicated public surface
- **Garage** — if sellers need a faster repeat-listing path or profile trust signal
- **Public web expansion** — if listing share traffic or search traffic is meaningful
- **Full app-store/public launch polish** — when the beta loop is stable enough for a wider audience

## Phase 3 — Trust and premium bets

Goal: add differentiated trust and visual inspection features after the basic marketplace has activity.

Candidates:

- Inspection reports and rubric workflow
- 3-tier trusted badge on listings
- PDF inspection report export
- AutoTM-staffed pro media attribution
- Blog / Bortzhurnal, if community/content pull is visible
- Video uploads and async media pipeline
- 360 orbit photos
- Side-by-side comparisons
- Sort/ranking refinements beyond recency
- Onboarding and performance polish based on observed friction

## How to propose a scope change

If you want to move a feature between phases, use this checklist:

1. Does it block the core marketplace loop? If yes, it belongs in or before the MLP beta.
2. Is there real beta evidence that users are working around the missing feature? If no, defer.
3. Can a 2-3 person team ship the shaped version inside one cycle? If no, cut scope or split it.
4. What gets pushed out to make room? No feature moves into Phase 1 for free.
5. Update this file, the relevant feature PRD, `03-roadmap.md`, and add an ADR for any material capability change per [ADR-0020](../adr/0020-document-hierarchy-and-mutability.md).
