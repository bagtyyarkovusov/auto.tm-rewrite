# ADR-0035: Multi-vertical platform direction — cars as the MLP wedge

- **Status**: Accepted
- **Date**: 2026-06-11
- **Deciders**: AutoTM founder + AI architect
- **Relationship**: Extends [ADR-0034](0034-kolesa-ux-findability-reference.md) (Kolesa as UX/IA reference — its `hub → category → dedicated-filter` IA is now the **target**, not just inspiration). Expands the [00-vision](../prd/00-vision.md) "car marketplace" framing to a multi-vertical direction. **Does not change [ADR-0027](0027-mlp-beta-scope.md)** — MLP stays cars-only.

## Context

The vision and charter frame AutoTM as a *car* marketplace. The founder's actual long-term intent is broader: a **multi-vertical platform** — vehicles (incl. **trucks / commercial**), **auto parts** (incl. specialized **compatibility matching**), and **services** — alongside **verified dealers/sellers** and **inspection reports** (the latter two already anticipated in the roadmap and charter Phase 2). This is structurally **Kolesa Group's** shape. Cars is the **MLP wedge** to prove the marketplace loop, not the terminal scope.

The risk is twofold and opposite: (1) building multi-vertical machinery prematurely (violating MLP / [ADR-0027](0027-mlp-beta-scope.md) / YAGNI), or (2) hardcoding single-vertical assumptions that make the future expensive to reach. This ADR records the **direction** and the cheap **leave-the-seam** principles so MLP stays lean *and* additive toward multi-vertical. It surfaced during the 2026-06-10/11 Kolesa-reference grilling when the founder revealed the parts/trucks/services intent.

## Decision

1. **Direction.** AutoTM is a multi-vertical **vehicle + parts + services** platform; **cars is the MLP wedge**, not the terminal scope.

2. **MLP stays cars-only.** [ADR-0027](0027-mlp-beta-scope.md) is unchanged. **No vertical is built until it is shaped at the betting table.** This ADR is a *direction*, not a build mandate.

3. **Anti-lock-in seam principles** for all MLP work (cheap now, costly to retrofit):
   - **General naming** — `Listing`, not `CarListing`; `catalog` is category-aware *in concept*. Don't weld "car" into shared identifiers/contracts.
   - **Vertical-shaped browse** — tab 1's cars browse is a self-contained *category browse surface* (a home-hub can slot in front later with no rebuild), reached through a **dedicated filter page** (the Kolesa funnel) — **not** feed chips. (This resolves the #200 home-model question.)
   - **Filter shape per-category-configurable** at the `@auto-tm/contracts` boundary; only the car field-set is implemented now.
   - **Discriminator at the last responsible moment** — a `Listing.category` enum (default `car`) backfills trivially; add it when the *second* vertical is shaped, not now.

4. **Target IA** = Kolesa's `home-hub → category → dedicated filter` ([ADR-0034](0034-kolesa-ux-findability-reference.md)). In MLP the single (cars) vertical renders as the **default category surface**; the hub appears with the second vertical.

5. **Expansion sequence** (easiest → hardest; each **betting-table-gated**):
   verified sellers / dealers → reports / tier → **trucks / commercial** (~80% car reuse; the **hub** appears here) → **parts** (new taxonomy + browse/filter) → **parts-compatibility matching** (a new bounded context + fitment data: make↔model↔generation↔engine — hardest, and hard under the air-gap).

## Consequences

### Positive
- Future verticals land **additively**; naming / IA / filter avoid costly retrofits.
- Resolves #200 correctly (dedicated filter, vertical-shaped browse — not chips).
- Gives [ADR-0034](0034-kolesa-ux-findability-reference.md) a structural rationale: Kolesa's hub IA is the real target, not borrowed decoration.
- A conscious, written direction stops single-vertical drift (e.g., nobody ships `CarListing`).

### Negative / accepted costs
- A written direction can **tempt premature building** — explicitly guarded: verticals are betting-table-gated, MLP stays cars-only.
- Minor naming-discipline overhead during MLP.

### Neutral
- **Parts-compatibility matching** is flagged as a future **bounded context** + a data-sourcing problem (fitment data), especially hard under the air-gap. Not scoped here.
- "Parts" and "services" are *verticals*; they are **not** the mobile "Services" tab (tab 5 = Cabinet/Profile per [ADR-0034](0034-kolesa-ux-findability-reference.md) §4).

## Alternatives considered

- **Permanent car-only** — rejected: forecloses the founder's intended platform.
- **Build multi-vertical scaffolding now** — rejected: violates MLP / [ADR-0027](0027-mlp-beta-scope.md) and YAGNI; verticals are unshaped.
- **Leave the direction unrecorded** — rejected: invites single-vertical lock-in and drift; future sprints/agents wouldn't know cars is a wedge.

## References

- [ADR-0034](0034-kolesa-ux-findability-reference.md) — Kolesa UX/IA reference (the target IA)
- [ADR-0027](0027-mlp-beta-scope.md) — MLP beta scope (unchanged; MLP stays cars-only)
- [00-vision](../prd/00-vision.md), [03-roadmap](../prd/03-roadmap.md) — direction + post-MLP bet candidates
- [features/38-showroom.md](../prd/features/38-showroom.md) — dealers/showroom (already anticipated)
- [docs/prd/ui/kolesa-findability-reference.md](../prd/ui/kolesa-findability-reference.md) §5 — home/browse model
- Issue #200 — home filter (refocused to the dedicated funnel)
- Detailed seam-design work handed off separately (data model, catalog context, filter contract, routing)
