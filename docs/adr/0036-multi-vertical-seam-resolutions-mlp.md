# ADR-0036: Multi-vertical seam resolutions (MLP) — defer all four, record the contracts

- **Status**: Accepted
- **Date**: 2026-06-11
- **Deciders**: AutoTM founder + AI architect
- **Relationship**: Implements [ADR-0035](0035-multi-vertical-platform-direction.md) — resolves its four anti-lock-in seam principles into per-seam `cheap-now vs defer` calls, verified against the real code. Bounded by [ADR-0027](0027-mlp-beta-scope.md) (MLP stays cars-only) and [ADR-0019](0019-context-md-describes-current-state.md) (forward seam contracts live in this ADR, not in `CONTEXT.md`).

## Context

[ADR-0035](0035-multi-vertical-platform-direction.md) set the direction (cars is the MLP wedge of a future vehicle + parts + services platform) and named four seams to keep open, but deferred the detailed `cheap-now vs defer` calls to a separate pass. This ADR is that pass.

Each seam was checked against the **real code today** (not re-derived from the ADR). The two opposite mistakes to thread between are over-building vertical machinery now (violates [ADR-0027](0027-mlp-beta-scope.md) / YAGNI) and welding single-vertical assumptions that make the future expensive. The exploration found the codebase has **essentially no "car" welding today** — `Listing` (not `CarListing`), general enums, no `listings → catalog` cross-context port, a vertical-agnostic tab. So the deliverable is a decision record, not a refactor. The founder signed off on deferring all four on 2026-06-11; for the one seam with a real now-vs-later fork (Seam 3) the founder chose document-only.

## Decision

**Defer all four ADR-0035 seams. Ship no schema, contract, or mobile code now. Record the forward contracts and trigger conditions here so future verticals land additively and no agent re-litigates or welds "car" in.**

### Seam 1 — `Listing.category` discriminator: **defer**

The discriminator is added at the last responsible moment (when the 2nd vertical is shaped at the betting table), **not now**. Verified against the schema: `Listing` has three structured indexes (`(status, publishedAt)`, `(brandId, modelId, status)`, `(cityId, status)`) and there is **no Postgres FTS anywhere** in the migrations — the feed is structured-column-only. The retrofit is therefore cheap and additive: one nullable `category ListingCategory @default(car)` column (auto-backfills every existing row to `car`), one composite index `(category, status, publishedAt)`, and a `WHERE category = 'car'` predicate in ~3 `infrastructure/` query sites (`ChronologicalRankingAdapter`, `PrismaListingsReadRepository`). No data rewrite; no query-path rewrite outside `infrastructure/`. The [ADR-0021](0021-feed-ranking-port.md) precedent (view/favorite counters added early *because they cannot be backfilled*) cuts the **other** way here: a constant-backfillable enum is exactly the kind of thing to defer. **Forward contract:** category-specific attributes (per-category tables vs typed JSON) stay an open design — decided at the 2nd-vertical trigger, not pre-committed. Trucks reuse ~80% of car fields; parts diverge hard.

### Seam 2 — `catalog` category-awareness: **defer / no-op**

Keep `catalog` car-scoped; build nothing. Verified: `listings/` imports **nothing** from `modules/catalog/` — there is no `listings → catalog` cross-context port to weld. The coupling is only (a) Prisma FK relations in the schema (`infrastructure/`) and (b) catalog IDs flowing through `@auto-tm/contracts`; clients call catalog's own public HTTP API directly for pickers. **Forward contract:** `catalog` is the **vehicle taxonomy**; a future parts taxonomy is a **sibling bounded context** with its own tables and HTTP API, which `listings` references by scalar ID exactly as it references car taxonomy today. No port rename is needed because no such port exists.

### Seam 3 — `@auto-tm/contracts` filter shape: **defer (document-only)**

Keep the flat car-only filter schema (`ListingFilterSchema` = `brandId, modelId, cityId, priceMin/Max, yearMin/Max, condition`; `FeedQuerySchema` merges it). Verified non-breaking to defer: the feed controller maps each filter field **individually** into `ListingFilterCriteria`, and query params are additive, so a later `?category=` discriminator plus parts-specific params slot in without touching the existing car fields or cutting `/api/v2`. **Forward contract:** the filter boundary is a **stable vertical-agnostic core** (`cursor, limit, cityId, price, condition`) **plus a per-category extension**; the existing car fields (`brand, model, year`) are the **car extension and the default-category field-set, kept flat**. When a 2nd vertical lands, add an optional `category` discriminator and a sibling extension — **never** restructure or rename the existing car fields breakingly, and **never** build an EAV / fully-generic filter. The founder chose document-only over splitting the Zod schema into `ListingFilterCoreSchema` + `CarListingFilterSchema` now: the split is mechanical and non-breaking whenever done, so the last-responsible-moment is at the 2nd vertical.

### Seam 4 — mobile cars-browse as a self-contained category surface: **defer to #200**

Tab 1's naming is already vertical-agnostic (route id `index`, title "Search" — not "Home"/"Cars"), so nothing is welded today. The browse-body extraction belongs to issue [#200](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/200)'s dedicated-filter-funnel reshape, which reworks the browse anyway and is **blocked pending the S8a merge** — extracting now and reworking at #200 is churn. **Forward contract:** tab 1 is a **category browse surface**, not a hardcoded home; at #200 the browse body (list + pagination + states + filter funnel) extracts into a reusable `CategoryBrowse`-style surface that a home-hub can front when the 2nd vertical lands, with **no rebuild**; discovery is a **dedicated filter funnel, not feed chips** (per [ADR-0035](0035-multi-vertical-platform-direction.md)). The in-flight S8a `src/navigation/` work (`useSafeBack.ts` + `SafeScreen.tsx`) is safe-area / back-button plumbing — **orthogonal** to this seam; no sequencing conflict.

### Cross-cutting naming guard

Shared identifiers, contracts, and routes stay general (`Listing`, not `CarListing`; `catalog`, not `car-catalog`). This already holds today; this ADR makes it a recorded invariant for MLP work.

## Consequences

### Positive
- Future verticals land **additively** — each deferred retrofit is verified small and non-breaking.
- **Zero code now** — honors [ADR-0027](0027-mlp-beta-scope.md) and YAGNI; no machinery for unshaped verticals.
- The verified verdicts, triggers, and forward contracts are recorded once, so agents don't re-derive them or accidentally weld "car" in.
- This ADR doubles as the **2nd-vertical retrofit checklist** (the column, the `WHERE` predicates, the `CategoryBrowse` extraction, the filter extension).

### Negative / accepted costs
- Forward seam contracts live in this ADR, **not** in `CONTEXT.md` (per [ADR-0019](0019-context-md-describes-current-state.md)) — agents must consult ADRs, not just CONTEXT.md, before the 2nd vertical.
- The deferred work is real work later — deferral moves it to the 2nd-vertical sprint, it doesn't delete it.
- A written multi-vertical direction can still tempt premature building; the cars-only fence ([ADR-0027](0027-mlp-beta-scope.md)) remains the guard.

### Neutral
- The Seam 3 structural split (core + car sub-schemas) stays available later at no extra cost.
- Parts-compatibility matching remains a future bounded context + fitment-data-sourcing problem (per [ADR-0035](0035-multi-vertical-platform-direction.md) §5), out of scope here.
- Optional, non-blocking doc touch: name the "category browse surface" concept in [`docs/prd/20-information-architecture.md`](../prd/20-information-architecture.md) so #200 builds it that way.

## Alternatives considered

- **Add `Listing.category` now as insurance.** Rejected (founder declined): a constant-backfillable enum retrofits trivially (verified — no FTS, 3 structured indexes, ~3 additive infra sites), unlike the un-backfillable [ADR-0021](0021-feed-ranking-port.md) counters; adding it now is a dead single-value column that tempts premature category logic before the 2nd vertical is shaped.
- **Split the filter contract into core + car sub-schemas now.** Rejected for now (founder chose document-only): mechanical and non-breaking whenever done, so the last-responsible-moment is the 2nd vertical; doing it now is borderline-speculative.
- **Extract `CategoryBrowse` now.** Rejected: [#200](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/200) reworks the browse and is blocked pending S8a; extracting now is churn.
- **Leave the seams unrecorded (rely on [ADR-0035](0035-multi-vertical-platform-direction.md) alone).** Rejected: ADR-0035 sketches the principles but not the verified verdicts, triggers, or forward contracts; future agents would re-derive or weld.
- **Record the contracts in `CONTEXT.md` instead of an ADR.** Rejected: [ADR-0019](0019-context-md-describes-current-state.md) forbids aspirational/forward content in `CONTEXT.md`; forward seam contracts belong in an ADR.

## References

- [ADR-0035](0035-multi-vertical-platform-direction.md) — Multi-vertical platform direction (the parent this implements)
- [ADR-0034](0034-kolesa-ux-findability-reference.md) — Kolesa UX/IA reference (target IA: hub → category → dedicated filter)
- [ADR-0027](0027-mlp-beta-scope.md) — MLP stays cars-only (the fence)
- [ADR-0021](0021-feed-ranking-port.md) — Feed ranking port; the "add cheap columns early" precedent that argues *for* deferring a backfillable enum
- [ADR-0019](0019-context-md-describes-current-state.md) — CONTEXT.md is current-state-only (why forward contracts live here)
- [`docs/prd/ui/kolesa-findability-reference.md`](../prd/ui/kolesa-findability-reference.md) §5–§6 — cars browse + filter funnel
- Issues [#200](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/200) (filter funnel + vertical-shaped browse — embodies Seams 3+4), #201, #202 — blocked pending S8a
- Evidence files: `packages/db/prisma/schema.prisma` (`Listing` + indexes), `packages/contracts/src/schemas/listings.ts` (`ListingFilterSchema`), `apps/api/src/modules/listings/presentation/listings.controller.ts` (per-field filter mapping), `apps/api/src/modules/listings/` (no catalog import), `apps/mobile/app/(tabs)/index.tsx` (browse surface)

---

*Scaffolded by `/new-adr` on 2026-06-11. Accepted 2026-06-11 — founder sign-off recorded in the seam-resolution session.*
