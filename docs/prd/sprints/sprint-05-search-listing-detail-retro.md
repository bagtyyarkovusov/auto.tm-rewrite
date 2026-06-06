# Sprint 5 — Search + listing detail — Retro

> Append-only per [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md). Closure-time changes to a sprint plan that already shipped (🟡 → 🟢) land here, not in `sprint-05-search-listing-detail.md`.

## Sprint close — 2026-06-06 (`/close-sprint 5`)

> Final closure pass run by issue #165 on 2026-06-06 (UTC). S5 shipped 2026-06-06 (roadmap). Parent PRD #152 and sprint-final #165 are CLOSED; closing PR squash-merges to `main`. Per [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md) this file **appends to** (does not edit) the entries above.

### Shipped vs planned

S5 ran as 12 child issues (#153–#164) under #152. **All 12 shipped.** Evidence verified against `packages/db/prisma/schema.prisma`, both context `CONTEXT.md` files, the `apps/api/src/modules/listings` tree, and the `apps/mobile/src/listings` tree.

| Area (issues) | Planned (DoD) | Evidence in code | Status |
|---|---|---|---|
| Contracts (#153) | `ListingFilterSchema` + filter params on `FeedQuerySchema` | `packages/contracts/src/schemas/listings.ts` | ✅ |
| Domain (#154) | `ListingFilter` VO with year-range + price-range validation | `domain/ListingFilter.ts` + 12 spec assertions | ✅ |
| Infra (#155) | `ChronologicalRankingAdapter` applies filters with FX-aware price filtering | adapter `buildWhere` + `buildPriceFilter` + e2e spec | ✅ |
| API (#156) | `ListFeed` forwards filters + controller query-params | `ListingsController.listFeed` parses + validates filters via `ListingFilter.create` | ✅ |
| Mobile filter sheet (#157) | Sheet host on Search tab + Apply/Reset | `FilterSheet.tsx` + `useListingFilters` hook | ✅ |
| Brand→Model filter (#158) | Two-level picker with cascade | `BrandModelFilterControl.tsx` + spec | ✅ |
| City filter (#159) | Region→City drilldown | `CityFilterControl.tsx` + spec | ✅ |
| Price-range filter (#160) | `priceMin`/`priceMax` digit inputs with min>max validation | `PriceRangeFilterControl.tsx` + spec | ✅ |
| Year-range filter (#161) | `yearMin`/`yearMax` 4-digit clamped inputs | `YearRangeFilterControl.tsx` + spec | ✅ |
| Condition filter (#162) | Any/New/Used segmented toggle | `ConditionFilterControl.tsx` + spec | ✅ |
| Filtered query hook (#163) | `useListings` builds `URLSearchParams` from active filters + distinct query keys | `useListings.ts` + spec | ✅ |
| Zero-result + reset (#164) | `FilteredEmpty` with Reset action branches from `FeedEmpty` | `FilteredEmpty.tsx` + spec | ✅ |
| Mobile detail surface | Photo gallery, specs, price, seller block, Call, Message, Share | `PhotoGallery`, `PriceDisplay`, `SellerBlock`, `ContactCtaBar`, `ListingDetail` — all S4 (#145) | ✅ verified |
| Cursor stability | Stable across same-second creates on `(publishedAt DESC, id DESC)` | `ChronologicalRankingAdapter` orderBy + cursor OR | ✅ |
| Deferred items | Free-text search, favorites, saved searches, price sort, body/color filters, install deep-linking, public web SSR | explicit no-gos in sprint plan | ⛔ deferred |

**Planned file divergences (functionally equivalent):**

1. **`SearchListings.ts` / `PrismaListingSearchRepository.ts` — not created.** The sprint plan listed these as new files, but the filter logic was folded into the existing `ListFeed` use-case and `ChronologicalRankingAdapter` instead. `ListFeed` already owned feed query orchestration (FX rate mapping, cursor decoding, `coverMediaKey` resolution); adding filter forwarding to it and filter SQL generation to the adapter was less code than splitting a separate search repository. No behavior lost.
2. **`app/(tabs)/search.tsx` — not created.** The sprint plan listed a dedicated Search tab route, but the filter sheet shipped on the existing `app/(tabs)/index.tsx` (Home/Feed tab) with a "Search" header title and Filters trigger. This matches the actual tab layout: the first tab is the feed + search surface.
3. **`app/listings/[id].tsx` — route is `app/(public)/listings/[id].tsx`.** The buyer detail route was stubbed in S4 (#140) and fully implemented in S4 (#145). The path diverges from the sprint plan's `app/listings/[id].tsx` by the `(public)` segment group, which has been the canonical route since S4.

**Gaps:** none. All 12 children shipped, 0 deferrals, 0 misses.

### Drift findings

- **CONTEXT.md — CLEAN after sweep.** API CONTEXT confirms `ListingFilter` VO, `ChronologicalRankingAdapter` FX-aware filtering, and `GET /api/v1/listings` filter params. Mobile CONTEXT confirms the `search/` subsystem (filter sheet, 5 controls, `useListingFilters`, filtered query wiring, `FilteredEmpty`). Both files updated in this closure PR.
- **ADR — none missing.** S5 did not introduce new architectural patterns; it extended existing ones (feed ranking port, contract schema, mobile data-fetching pattern from ADR-0015). No new ADR required.
- **Sprint-file accuracy.** *Planned-not-done:* none. *Done-beyond-plan (healthy):* the filter control specs are more granular than the original DoD anticipated (one spec per control vs a single monolithic filter-sheet spec).
- **Roadmap — updated in this PR.** S5 🟢 2026-06-06; shipped-log entry added; Current → S6 ⚪.
- **Dependency/version — none material.** No framework bumps in-window. Expo SDK 55 verified via `expo install --check` and `expo export -p ios --clear` during closure.
- **Test coverage — strong.**
  - API: 325 unit tests pass (54 files), including `ListingFilter.spec.ts` (12), `ListFeed.spec.ts` (9), and domain/application layer coverage for filter forwarding.
  - Mobile: 363 unit tests pass (36 files), including all 5 filter-control specs, `useListingFilters.spec.ts` (10), `useListings.spec.tsx` (8), and `FilteredEmpty.spec.tsx` (9).
  - e2e: `ChronologicalRankingAdapter.e2e.spec.ts` covers Testcontainers-level filter integration (excluded from sandbox gate, runs on CI).
- **Architecture / complexity.**
  - Domain layer **CLEAN** — `ListingFilter` is pure TS, no framework imports.
  - Cross-context imports **CLEAN** — filters stay inside `listings/`; catalog data is read through public catalog endpoints, not cross-context imports.
  - Application-layer coupling unchanged from S4 — `ChronologicalRankingAdapter` injects `PrismaService` and `ExchangeRatePort`, consistent with the existing pattern.

### Prerequisites for Sprint 6 (Contact seller)

- **Hard blockers: NONE.** S6 deps all shipped — S2 auth ✅, S3 catalog ✅, S4 listing model/feed/detail ✅, S5 search/filter ✅.
- **Soft prereq — Message backend.** S6's core capability is making the Message CTA functional. The mobile `ContactCtaBar` already has a disabled Message button with "Chat coming soon" copy. S6 needs: (a) a conversation/message domain model, (b) send/receive use-cases, and (c) mobile inbox UI. No S5 gap blocks this.
- **Charter §19:** none block S6.

### Proposed doc updates

- [x] **Append this closure section** — done (this commit).
- [x] **Update `docs/prd/03-roadmap.md`** — S5 🟢 + shipped date; Current → S6 ⚪; shipped-log line added.
- [x] **Update `apps/api/src/modules/listings/CONTEXT.md`** — mark S5 as shipped in Planned additions; confirm filter-capable feed state.
- [x] **Update `apps/mobile/src/listings/CONTEXT.md`** — confirm `search/` subsystem + `FilteredEmpty.spec.tsx`.
- [ ] **(optional, low urgency) ADR — application-layer transactional-write boundary.** Pre-existing since S3, not S5-specific. Same note as S4 retro.

### Lessons for Sprint 6

1. **Verify, don't rebuild.** The S5 close-out had almost no code to write because each child issue already updated its own CONTEXT.md and tests. The sprint-final issue was pure verification + docs + roadmap mechanics. This is the healthy pattern.
2. **Filter UX granularity pays off.** Splitting each filter control into its own issue (#158–#162) let them merge independently and kept PRs small. The resulting per-control specs are maintainable and regression-resistant.
3. **Keep the mobile tab structure honest.** The sprint plan guessed `app/(tabs)/search.tsx`, but the product reality was `index.tsx` with a Search header. When the wireframe and implementation diverge from the plan, update the plan (or the retro) rather than forcing a route rename for plan fidelity.

### Sign-off

Sprint 5 closed honestly: 12/12 children shipped, 0 deferrals, CONTEXT.md / roadmap consistent, domain + cross-context architecture clean. S6 can begin.
