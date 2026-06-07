# 03 — Roadmap

> **The "where are we?" file.** Open this first in every session. It tells you which sprint is current, what shipped before it, and what comes next.
>
> Sister docs:
> - **`GRILL-OUTCOME.md`** — locked original design charter
> - **`02-phases.md`** — current phase scope
> - **`sprints/sprint-NN-<name>.md`** — per-sprint detail (DoD, files, tests, references)
> - **This file (`03-roadmap.md`)** — the cross-sprint trajectory + current pointer
>
> [ADR-0027](../adr/0027-mlp-beta-scope.md) narrows the first release to an MLP beta. Deferred features are not abandoned; they return as post-MLP bets after real usage.
>
> Historical sprint labels in shipped or locked artifacts are not canonical after ADR-0027. References such as "S9 admin", "S6 Garage + Dealership", or "S8 notifications" in older sprint docs should be read as historical labels unless this roadmap, a current pending sprint file, or a mutable feature PRD explicitly re-scopes the work. Do not rewrite shipped sprint plans just to rename old labels; update the active sprint/context doc when stale placement affects implementation.

---

## Current sprint

| | |
|---|---|
| **Sprint** | S7 — Minimal admin + moderation |
| **Status** | ⚪ Pending |
| **Started** | — |
| **Phase** | 1 (MLP beta) |
| **Plan file** | TBD — created by `/create-sprint-issues 7` |
| **Sprint doc** | [`sprints/sprint-07-minimal-admin.md`](sprints/sprint-07-minimal-admin.md) |
| **Milestone** | M6 — Admins can keep beta safe |

> **Agents:** update this block at the start of every sprint. Sprint N's first PR sets `Status` to 🟡 in progress; the sprint-closing PR sets the previous sprint to 🟢 shipped and bumps Current to N+1.

---

## Release shape

| Phase | Planning mode | Sprints | Headline outcome |
|---|---|---|---|
| **Phase 1 — MLP beta** | Fixed path | S1-S8 | Buyers find real listings, contact sellers, and admins can keep beta safe |
| **Phase 2 — Post-MLP marketplace bets** | Betting table | TBD | Add the missing capabilities beta users demonstrably need |
| **Phase 3 — Trust and premium bets** | Betting table | TBD | Add trust reports, richer media, comparison, and polish when the marketplace loop is active |

Full scope per phase: [`02-phases.md`](02-phases.md). Anti-goals remain in [`00-vision.md`](00-vision.md#anti-goals-things-we-explicitly-will-not-build).

---

## Phase 1 — MLP beta sprint status

| # | Sprint | Status | Started | Shipped | Milestone | Demo audience |
|---|---|---|---|---|---|---|
| S1 | [Scaffold](sprints/sprint-01-scaffold.md) | 🟢 Shipped | 2026-05-14 | 2026-05-14 | M1 | Nobody — confirms rails |
| S2 | [Identity (OTP)](sprints/sprint-02-identity.md) | 🟢 Shipped | 2026-05-14 | 2026-05-16 | M2 | Tiny internal group |
| S3 | [Catalog](sprints/sprint-03-catalog.md) | 🟢 Shipped | 2026-05-17 | 2026-05-17 | — | Internal |
| S4 | [Listings CRUD](sprints/sprint-04-listings-crud.md) | 🟢 Shipped | 2026-05-17 | 2026-06-06 | M3 | Internal group |
| S5 | [Search + listing detail](sprints/sprint-05-search-listing-detail.md) | 🟢 Shipped | 2026-06-06 | 2026-06-06 | M4 | 10-20 beta testers with seeded listings |
| S6 | [Contact seller](sprints/sprint-06-contact-seller.md) | 🟢 Shipped | 2026-06-06 | 2026-06-07 | M5 | Beta testers with real listings |
| S7 | [Minimal admin + moderation](sprints/sprint-07-minimal-admin.md) | ⚪ Pending | — | — | M6 | Internal admins |
| S8 | [Private beta polish](sprints/sprint-08-private-beta-polish.md) | ⚪ Pending | — | — | M7 | First 10-50 real users |

**Legend:** ⚪ Pending · 🟡 In progress · 🟢 Shipped · 🔴 Blocked

---

## Post-MLP bets

These are not a backlog. They are candidates for shaping after beta learning. If an idea still matters, it will come back to the betting table with a problem, appetite, no-gos, and rabbit holes.

| Bet candidate | Trigger to build | Current home |
|---|---|---|
| Favorites + better discovery | Buyers repeatedly revisit the same listings manually | [`features/33-search-discovery.md`](features/33-search-discovery.md) |
| Saved searches | Buyers repeat the same search manually across days | [`features/35-subscriptions.md`](features/35-subscriptions.md) |
| Direct-message push | Contact usage is high enough that response delay hurts conversion | [`features/36-notifications.md`](features/36-notifications.md) |
| Rich chat | Text-only contact cannot support negotiation or trust needs | [`features/34-conversations.md`](features/34-conversations.md) |
| Dealership showroom | Dealers actively post inventory and need a shareable storefront | [`features/38-showroom.md`](features/38-showroom.md) |
| Garage | Repeat sellers or profile trust need a vehicle ownership surface | [`features/37-garage.md`](features/37-garage.md) |
| Blog / Bortzhurnal | Marketplace activity exists and content/community pull is visible | [`features/39-content-blogs.md`](features/39-content-blogs.md) |
| Full admin dashboard | Manual admin work becomes repetitive enough to justify UI breadth | [`features/40-admin.md`](features/40-admin.md) |
| Moderation operations | Report volume makes manual first-in/first-out review too slow | [`features/40-admin.md`](features/40-admin.md), [`flows/65-admin-moderation.md`](flows/65-admin-moderation.md) |
| Trust/support workflows | Users need transparency, appeals, report correction, or dispute handling | [`flows/65-admin-moderation.md`](flows/65-admin-moderation.md) until a dedicated trust/support PRD is shaped |
| Moderation alerts | Reports need paging outside normal admin review cadence | [`features/36-notifications.md`](features/36-notifications.md), [`ops/81-monitoring-alarms.md`](ops/81-monitoring-alarms.md) |
| Inspection reports + tier | Trust, misrepresentation, or inspection demand becomes the bottleneck | [`features/50-reports-tier.md`](features/50-reports-tier.md) |
| PDF reports | Reports exist and users need printable/shareable artifacts | [`features/51-pdf-export.md`](features/51-pdf-export.md) |
| Video / 360 / comparisons | Visual inspection quality or comparison friction blocks purchases | [`features/52-orbit-photos.md`](features/52-orbit-photos.md) |

---

## Milestones

| Milestone | After sprint | Demo-able to |
|---|---|---|
| **M1** Hello stack | S1 | Nobody — confirms the rails |
| **M2** I can log in | S2 | Tiny internal group |
| **M3** I can browse cars | S4 | Internal group |
| **M4** I can find relevant cars | S5 | 10-20 beta testers with seeded listings |
| **M5** I can contact the seller | S6 | Beta testers with real listings |
| **M6** Admins can keep beta safe | S7 | Internal admins |
| **M7** Private beta | S8 | First 10-50 real users |

---

## Sprint dependencies

```
S1 ────► S2 ────► S3 ────► S4 ────► S5 ────► S6 ────► S7 ────► S8
          auth      catalog   listings  discovery contact   safety   beta
```

- **S2 unlocks authenticated actions** — contact seller, create listing, and admin elevation all depend on identity.
- **S3 unlocks listings and filters** — listing creation and discovery need catalog data.
- **S4 unlocks the market object** — search and contact need real listings.
- **S5 unlocks buyer intent** — contact is meaningful only when buyers can find relevant listings.
- **S6 unlocks real marketplace learning** — once buyers contact sellers, we can measure the loop.
- **S7 comes before broader beta** — moderation must exist before 10-50 real users enter.
- **S8 is last** — only polish the loop after the loop exists.

If a sprint slips, slide downstream rows by the same delta. Do not parallelize unless a shaped pitch proves the dependency is false.

---

## How to update this file

Once per sprint:

1. **Start of sprint N**: open `sprints/sprint-NN-<name>.md`; set the Current Sprint block at the top of this file to N + status 🟡; the row for N in the table to 🟡 with `Started` = today's date.

2. **End of sprint N**: set the row for N to 🟢 with `Shipped` = today's date. Bump Current to N+1 with status ⚪ Pending. Add a one-line note under "Shipped log" below describing what landed.

3. **If scope shifts between sprints**: follow the "How to propose a scope change" checklist in [`02-phases.md`](02-phases.md). Update the affected pending sprint file's DoD; do **not** silently move work.

4. **If a material feature capability moves phase**: add an ADR per [ADR-0020](../adr/0020-document-hierarchy-and-mutability.md).

## Shipped log

> One-line entries, newest first.

- 2026-06-07 — S6 Contact seller (M5). Simplest buyer↔seller text-contact loop shipped per [ADR-0027](../adr/0027-mlp-beta-scope.md) — no Socket.IO, no rich-chat fields. Per-listing `Conversation` + `ConversationParticipant` + text `Message` (unique on `(listingId, buyerId)`, self-contact rejected, participant-only access, explicit sold/archived read-only-thread behavior with banned/suspended hooks pre-documented for S7). Four use-cases (`OpenConversation`, `ListMyConversations`, `ListMessages`, `SendTextMessage`) behind `POST/GET /api/v1/conversations` + `GET/POST /api/v1/conversations/:id/messages`, consuming `listings/` only through `ListingsReadPort` (extended with `allowChat`); message insert + conversation-activity bump run in one Prisma transaction so the list sorts by latest message. Mobile: anonymous Message CTA → OTP resume → conversation detail with optimistic send/retry, plus the seller Chat-tab conversation list; TanStack Query refetch-on-focus, no WebSocket. Built AFK via Kimi-Sandcastle as direct branch merges (#168–#174); 52/52 conversations domain+application unit tests green; **zero schema migrations** (conversation models pre-provisioned). Outstanding: human Expo Go simulator smoke of the end-to-end contact flow before the M5 beta demo (sandcastle cannot run the simulator). Retro: [`sprints/sprint-06-contact-seller-retro.md`](sprints/sprint-06-contact-seller-retro.md).
- 2026-06-06 — S5 Search + listing detail (M4). MLP feed filters (brand→model, city, price range, year range, condition) wired end-to-end from mobile filter sheet through contracts, `ListingFilter` VO, and FX-aware `ChronologicalRankingAdapter` to Prisma query. Filtered infinite query with distinct query-key cache per filter set, zero-result + reset state, and stable cursor pagination on `(publishedAt DESC, id DESC)`. Buyer detail surface (photo gallery, specs, price, seller block, Call/Share CTAs) verified from S4; Message remains "coming soon" → S6. Mobile-only; public web SSR stays deferred to S8.
- 2026-06-06 — S4 Listings CRUD (M3). Seller posts listings via an 8-step mobile wizard (seven data steps plus Review) with VIN/photos/specs/price/location/contact; anonymous buyer views the chronological feed + full detail on mobile; public web SSR is deferred to S8 per the 2026-05-29 S4 retro. Drafts auto-save, mobile photo uploads run in parallel with form-filling, and My Listings/Drafts supports owner management. Multi-currency input (TMT/USD/AED) displays public prices in TMT through admin-managed FX rates. State machine shipped for active/sold/archived + soft-delete, 14-day sold fade, locked identity fields, price-change audit, and foundation ports (`VinDecoder`, `MediaContentClassifier`, `FeedRanking`, `ImageVariantGenerator`) with null/sync adapters for later swaps.
- 2026-05-17 — S3 Catalog. Trilingual catalog API (read + admin write for Brand+Model) shipped: 7 entities seeded (Brand/Model/Color/BodyType/Region/City; Generation table-only), Accept-Language middleware live, dev-only `/dev/catalog` mobile route renders the brand list via apiClient. Admin write tested with mintAdminJwt helper; full admin UI ships in S7 under the MLP beta roadmap.
- 2026-05-16 — S2 Identity (M2). Phone OTP login works end-to-end on mobile: request OTP → verify → JWT access + per-session bcrypt-hashed refresh (ADR-0012), 10-session cap with FIFO eviction, rate-limited (5/phone/day + 10/IP/hour), full chaos coverage at domain/application layer, e2e for happy path + rate-limit shape + logout/me/delete-me. Public web stayed anonymous-only (#41 retracted); deferred-action replay tracked at #52; mobile data-fetching architecture locked in ADR-0015 with implementation at #53. _(Carry-over: PRs #60, #61, #63 — mobile data-fetching wrapper, apiClient diagnostic fix, action-gated auth — merged on 2026-05-16 after the sprint-close PR #55 ran. They count as S2-adjacent work; the rest of the line above is in-sprint scope.)_
- 2026-05-14 — S1 Scaffold (M1). Local dev stack runs (`pnpm install && pnpm dev`); CI green; air-gapped bundle path proven via `make -n bundle`.

---

## Cross-references

- **Feature PRDs** — [`features/`](features/) — one per product capability
- **End-to-end flows** — [`flows/`](flows/) — user journeys; some are post-MLP now
- **UI / design system** — [`ui/`](ui/)
- **Ops** — [`ops/`](ops/) — deploy / monitoring / launch
- **Decision log** — [`../adr/`](../adr/)
- **Domain state** — [`../../CONTEXT-MAP.md`](../../CONTEXT-MAP.md) (always-current per-context invariants)
