# Sprint 4 — Pre-Sprint Retro: Scope Refinement + Gap Filling

> Written 2026-05-18 via `/grill-with-docs`. This is **not** a normal end-of-sprint retro — it captures the outcome of a pre-implementation grilling session that closed 17 unresolved gaps in the sprint plan before any S4 issue was created.

## Why this doc exists (procedural)

Per [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md), sprint files lock the moment their roadmap row transitions ⚪ → 🟡. S4's row was set to 🟡 by PR #82 on 2026-05-17 (S3 sprint-final wiring) — but no S4 issues were created at that moment, so the sprint was in a planning-but-not-started state.

This grill session (2026-05-18) closed 17 design + scope gaps before issues are created. Rather than reverting the roadmap to ⚪ purely for editing purposes, this retro doc records:

- **What gaps were closed** and the design decisions taken
- **What future additions** were identified for Phase 2+ (the foundations the user wants strong)
- **Which doc files were updated** as a result

The principle: the grilling itself was the spirit of the ADR-0020 lock (deliberate scope refinement before issues are created). Locking the sprint file before that grilling happened would have shipped the gaps. The retro records both the refinements AND the procedural exception.

## The 17 gaps + 21 decisions

| # | Gap | Decision |
|---|---|---|
| 1 | Wizard step count (PRD says 7, sprint plan says 6) | 7 steps per PRD/flow order: VIN → Photos → Brand/Model/Gen/Year → Specs → Price → Location → Desc/Contact |
| 2 | VIN decoder in MVP (mock or defer) | `VinDecoderPort` interface + `NullVinDecoder` adapter in S4; real adapter in Phase 2 |
| 3 | Catalog extension placement (where do EngineType/Transmission/DriveType land?) | First S4 issue, read-only API, no slug, no admin write (defer to S9) |
| 4 | Draft model (Listing.status=draft vs separate ListingDraft entity) | Separate `ListingDraft` table with JSON payload; deleted on publish; legacy enum values retained |
| 5 | State machine + use-case set | Phase 1 uses only `active`/`sold`/`archived`; 8 use-cases (add `UpdateDraft`, `ArchiveListing`, `RepublishListing`); enum adds `reported`+`banned` for S9 |
| 6 | 14-day Sold→archived auto-fade implementation | Hybrid: query-time filter in S4 public feed, S8 cron tidy-up for My Listings |
| 7 | Dealership posting (schema + UX) | Fully deferred to S6 — no `dealershipId?`, no `publishedAsDealership` column in S4 |
| 8 | Media model (schema, variants, presign) | Rename `url`→`key`; defer `uploadedByUserId`+`uploadedByStaff`; sync Sharp via `ImageVariantGenerator` port (S8 swaps async); 1 row + deterministic variant key naming; single `POST /uploads/presign` endpoint |
| 9 | Contact preferences (calls/chat/phone/hours) | `contactPhone?` + `allowCalls` + `allowChat` ship in S4 (at-least-one validation); availability hours defer to S5; phone-on-first-message punted |
| 10 | Price-change history (table vs AuditLog vs defer) | AuditLog rider in `EditListing` (`action: 'listing.price_changed'`); analytics consumer later |
| 11 | Multi-currency seller input + TMT display | Multi-currency input (TMT/USD/AED); asymmetric display (owner V1: TMT + ≈ original; public V2: TMT only); `ExchangeRate` table + port + endpoint in S4; admin FX UI defers to S9; missing rate blocks publish; currency editable; amount clears on currency change |
| 12 | Endpoint inventory + cursor format + filter scope | 18 endpoints; opaque base64 cursor `{timestamp, id}`; default limit 20, max 50; zero user-supplied filters in S4 (forward-defined in `ListFeed` signature for S5) |
| 13 | Feed ranking architecture | `FeedRankingPort` + `ChronologicalRankingAdapter` in S4; `viewCount`+`favoriteCount` columns added (not incremented); ADR-0021 written |
| 14 | `ListingsReadPort` interface shape | 4 methods (`getListingSummary`, `getListingSummaries`, `getListingsForOwner`, `matchesFilters`); `ListingSummary` DTO with 12 fields; events emitted in S4 with no in-process consumers (S5/S7/S9 subscribe later) |
| 15 | Sell-from-Garage entry point | Fully deferred to S6 (OwnedVehicle schema redesign + entry tile + pre-fill); no `Listing.ownedVehicleId?` in S4 |
| 16 | Audit log scope beyond price changes | Option A: 6 actions logged — `listing.published`, `listing.marked_sold`, `listing.archived`, `listing.republished`, `listing.deleted`, `listing.price_changed`. Routine edits + media operations skipped. |
| 17 | Edit invariants (locked fields post-publish) | 5 fields locked: `brandId`, `modelId`, `generationId`, `year`, `vin`. Application-level enforcement; admin override is S9. |
| 18 | Content moderation (inappropriate / non-car photos) | Auto-publish in S4 + reactive moderation in S9. `MediaContentClassifierPort` + `NullContentClassifier` ship in S4 (Phase 2 swaps in real ML — NudeNet for NSFW, YOLO for car-detection, pHash for stolen-photo dedup) |
| 19 | Soft-delete cascade for ListingMedia | Keep `ListingMedia` rows + MinIO objects on `Listing.deletedAt`; public reads filter `deletedAt IS NULL`; Phase 2 purge job hard-deletes old soft-deleted listings |
| 20 | Web parity scope | Web ships feed + detail SSR pages only — fully anonymous, no filters, no wizard, no auth. OG metadata + Schema.org JSON-LD on detail. Direct Caddy variant URLs (no Next.js Image wrapper). |
| 21 | Mobile upload staging persistence | Files at `${FileSystem.documentDirectory}listing-staging/<draftId>/<photoId>.jpg`. No MMKV/AsyncStorage — state reconstructed on launch from filesystem + server's `draft.payload.attachedMediaIds`. Orphan cleanup on app launch. Resume on `AppState 'active'` + `NetInfo isConnected`. |

## Future additions captured (Phase 2+)

The grill surfaced multiple worthwhile Phase 2+ features that **agents should NOT implement in S4** but **future agents reading this retro should know are coming**:

### Future trust + moderation signals (PRD feature 32 Open Questions)

- **Flipper / re-seller detection** — "this seller posted 30 cars in 6 months" surfaced via seller profile page (Auto.ru pattern). Phase 2 trust-layer candidate.
- **"First owner" claim** — Seller-declared, admin-verifiable. Buyer-side filter in S5+. Auto.ru's «первый хозяин» badge equivalent.
- **Phone-number-reuse detection** — "5 other listings from this phone" as a flipper signal. Phase 2 candidate.
- **Edit-triggered re-review** — Photo replacement >50%, price drop >30% in 24h, or description rewrite >50% triggers admin queue entry. Phase 2 (extends current AuditLog scope).
- **Inspected-listing edit policy** — When trust tier exists (Phase 2), structural edits invalidate the tier until re-inspection.
- **Inappropriate / non-car photo screening** — Self-hosted ML in Phase 2 (NudeNet + YOLO + pHash, all air-gap-compatible). Failed classifications transition listing to `pending_review` status.
- **Stolen photo detection** — pHash fingerprinting across listings. Phase 2 candidate.
- **Reporting flow** — "Report this listing" button + admin queue. Ships in S9 alongside `reported`/`banned` status activation.

### Future ranking signals (ADR-0021)

- Recency decay, listing completeness scoring, seller quality, trending (`viewCount`), personalization (saved searches + view history), geographic proximity, trust tier, photo quality. All consumed by S19's `PersonalizedRankingAdapter`.

### Future port realizations

- `VinDecoderPort` → `TmProxyVinDecoder` (Phase 2)
- `MediaContentClassifierPort` → `MlContentClassifier` (Phase 2)
- `ImageVariantGenerator` → `QueuedImageVariantGenerator` (S8 — moves Sharp to worker)
- `FeedRankingPort` → `PersonalizedRankingAdapter` (S19)

All four ports ship as no-op or sync adapters in S4 so the swap in later sprints is pure DI.

### Future sprints absorbing deferred S4 scope

- **S5 (Listings UX)**: filters, favorites, saved searches, availability hours for contact prefs, drafts UX polish
- **S6 (Garage + Dealership)**: dealership posting (schema + port + UX), Sell-from-Garage entry, OwnedVehicle redesign with FK columns + status enum, dealership-name PRO badge on listing detail
- **S7 (Conversations)**: chat (replaces greyed-out Message button stub), `ListingSold` event consumer to close conversations
- **S8 (Notifications + Subscriptions)**: `ListingCreated` event consumer for saved-search match, sold-listing auto-archive cron, async variant generation via worker, video HLS pipeline, MinIO orphan cleanup cron
- **S9 (Admin dashboard)**: reactive moderation (reported/banned status activation), admin UI for catalog + FX rates + listing moderation, `AdminEditListing` for locked-field override, audit log viewer
- **S11-S16 (Phase 2 trust layer)**: ML content moderation, flipper detection, inspected-listing tier system, edit-triggered re-review
- **S19 (Phase 3 ranking)**: smart `PersonalizedRankingAdapter`, sort tabs ("Newest / Cheapest / Closest"), view-history table

## Doc files updated as a result of this retro

| File | Change |
|---|---|
| [`docs/adr/0021-feed-ranking-port.md`](../../adr/0021-feed-ranking-port.md) | **NEW** — captures the ranking port abstraction decision |
| [`docs/prd/sprints/sprint-04-listings-crud.md`](sprint-04-listings-crud.md) | **Heavy rewrite** — schema, use-cases, endpoints, ports, scope all reflect the 21 decisions |
| [`apps/api/src/modules/listings/CONTEXT.md`](../../../apps/api/src/modules/listings/CONTEXT.md) | **Planned additions sync** — reflects current S4 scope (drops deferred items, clarifies what's actually shipping) |
| [`docs/prd/features/32-listings.md`](../features/32-listings.md) | **Open Questions appended** — 7 new entries for Phase 2+ trust + moderation signals |
| `docs/prd/sprints/sprint-04-listings-crud-pre-retro.md` (this file) | **NEW** — captures the procedural exception + decision audit trail |

The roadmap row for S4 is intentionally NOT reverted to ⚪. The 🟡 status is correct (we're actively planning S4), and this retro doc serves as the audit trail that ADR-0020 wants when a 🟡 sprint file is edited.

## Foundation strength check

The user's goal was: **fill in gaps + clarify future additions so foundations are strong and ready for agent execution**. Quick foundation audit:

| Foundation | State after retro |
|---|---|
| Wizard structure | ✅ 7 steps, fields known per step, validation rules clear |
| Domain model | ✅ Listing + ListingDraft + ListingMedia + ExchangeRate; 8 use-cases; state machine |
| Ports | ✅ 5 ports defined (VinDecoder, MediaContentClassifier, ImageVariantGenerator, FeedRanking, ExchangeRate, ListingsRead) + ListingEventPublisher; null/sync adapters in S4; future swaps clearly mapped |
| API surface | ✅ 18 endpoints inventoried; cursor format spec'd; filter scope drawn |
| Schema migration | ✅ Drop list known (3 cols), add list known (8 cols + ExchangeRate table); destructive rename `url→key` justified |
| Tests required | ✅ Each use-case has a spec target; e2e endpoints listed |
| Cross-context contracts | ✅ ListingsReadPort 4 methods + ListingSummary DTO + 4 emitted events |
| Mobile staging spec | ✅ Storage location, lifecycle, recovery, orphan cleanup all spec'd |
| Web parity scope | ✅ SSR feed + detail only; anonymous; no Next.js Image wrapper |
| Deferred features | ✅ Each deferral mapped to a specific future sprint with rationale |
| Future-additions visibility | ✅ Captured in PRD 32 Open Questions + this retro |

Status: **foundations are strong**. Ready for `/create-sprint-issues 4` to produce vertical-slice issues from the refined sprint file.

## Wireframe grill addendum — 2026-05-19

During the #93 mobile wizard wireframe grill, Year and Mileage were compared against major marketplace behavior (Auto.ru / AutoTrader-style listing flows). Decision: **Year is required to publish a new AutoTM listing. Mileage is required when `condition='used'`.** `generationId` remains optional because Generation seed data may be empty in S4, and `vin` remains optional because VIN decoding/OCR is Phase 2. The database columns can remain nullable, but `PublishListing`, mobile `canPublish`, tests, and the #93 wireframe must treat `year` as required and used-car `mileageKm` as required.

Additional #93 wireframe locks: Step 0 starts from Sell tab only, with latest draft + New listing when drafts exist and no Sell-from-Garage shortcut in #93; Step 1 is optional manual VIN only with no OCR/decode/checking/autofill UI; Step 2 is photos-only and freeform (1-20 photos, no required angle checklist, helper chips only), first photo is cover with a Cover badge, and drag-reorder changes cover with no separate Set cover action; Publish is blocked until at least one photo is attached and pending/failed required uploads are resolved; Step 3 uses searchable picker sheets, with Model disabled until Brand and Generation optional/empty-state aware; Step 4 defaults Condition to Used, requires Mileage only for used cars, and treats Color/Body type/Transmission/Drive type/Engine type/Engine power as optional completeness fields; navigation is linear Next/Back with Review links back only to completed steps; drafts are server-autosaved only with no offline-save promise; Sell shows only the latest draft plus New listing when drafts exist; Discard draft lives in the wizard header overflow and opens a destructive confirmation AlertDialog; Step 5 defaults to TMT, clears amount on currency change, shows approximate TMT for USD/AED, blocks Publish if a non-TMT FX rate is unavailable, keeps price as the full asking price, adds optional seller-term switches for Exchange possible and Installment possible, shows those badges on cards/detail when true, and has no separate negotiable toggle or buyer application/matching flow; Step 6 is city-first car location only, with no GPS/current-location/map/exact-address UI; Step 7 requires non-empty Description (max 2000 chars), stores seller text exactly as written with no auto-translation or language selector, pre-fills the profile phone as an editable per-listing override, validates at least one contact method, shows a compact Review summary above Publish instead of a separate Preview route, and keeps `allowChat` visible with honest coming-later helper text; Edit mode is the same wizard state with post-publish identity fields disabled, not a separate wireframe; there is no manual listing title field, because display title is derived from Year + Brand + Model + Generation/trim when available.

## Next step

After this retro + the sprint file rewrite + CONTEXT.md sync + PRD 32 open questions land:

1. Review the doc batch (this commit + the next 2-3)
2. Run `/create-sprint-issues 4` to produce parent PRD issue + N vertical-slice child issues from the refined sprint-04 file
3. AFK agents pick up child issues via `/run-issue` and execute against the now-tight spec
