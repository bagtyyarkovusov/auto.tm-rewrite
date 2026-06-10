# ADR-0034: Kolesa.kz as the UX / information-architecture reference (revises charter §1 auto.ru, findability scope only)

- **Status**: Accepted
- **Date**: 2026-06-10
- **Deciders**: AutoTM founder + AI architect
- **Relationship**: Revises [GRILL-OUTCOME.md](../../GRILL-OUTCOME.md) §1 "Reference design: auto.ru" **for UX / IA / findability only**; leaves §12 (visual design system) unchanged; bounded by [ADR-0027](0027-mlp-beta-scope.md) (MLP scope) and the [00-vision](../prd/00-vision.md) anti-goals.

## Context

Charter §1 named **auto.ru, simplified for TM** as the reference design when the project was scoped on 2026-05-12. The app is now at **S8 (private beta)** with S1–S7 shipped: a locked 5-tab IA, feed + filters, listing detail, an 8-step create-listing wizard, contact-seller chat, and minimal admin.

**Kolesa.kz is the dominant car marketplace in Kazakhstan** — a market structurally close to Turkmenistan (same post-Soviet buyer behavior, same "listings scattered across Telegram" starting point, RU-language overlap). The founder wants Kolesa's *proven findability and information architecture* — its category/taxonomy structure, search→filter funnel, content hierarchy, and "where each thing lives" — as the north-star for the screens still being **built and polished**, **without** importing Kolesa's visual language or its feature breadth.

This needs recording because (a) it changes a *locked charter decision*, and (b) the scope boundary is subtle and easy for a future agent to over-read ("make it look like Kolesa", "build Kolesa's loans/parts/reviews") unless the limits are explicit.

A full grilling session on 2026-06-10 walked the decision tree, using the complete Kolesa flow set captured on Screen Gallery (**59 flows / 248 screens, May 2026**) plus local screen captures.

## Decision

1. **Kolesa.kz replaces auto.ru as the reference design for UX, information architecture, and findability** — category/taxonomy structure, the search→filter funnel, content hierarchy on key screens, and section placement. auto.ru is retired as the reference (it survives only as a historical label in shipped artifacts).

2. **Scope is UX/IA only — NOT visual.** AutoTM's own (Uber-style) visual design system in §12 and `packages/ui/tokens/` is unchanged and is **not** replaced by Kolesa's look. Kolesa is a *structure/findability* reference, not a visual one.

3. **Bounded by the locked IA, the anti-goals, and MLP scope.** The 5-tab IA stays; Kolesa does **not** re-derive navigation. Kolesa's feature breadth is **subtracted** to AutoTM's cars-only, MLP, anti-goal-respecting scope. The explicit keep/defer map lives in `docs/prd/ui/kolesa-findability-reference.md`.

4. **Rollout is forward + opportunistic** — new/upcoming screens are built to the Kolesa-findability bar from day one; already-shipped screens are re-touched only when next edited for another reason. There is **no dedicated re-skin pass** for the beta.

5. **Concrete adoptions locked this session:** home = feed **+ within-cars quick-filter chips** (body-type / brand / price) deep-linking into the existing filter sheet; **minimal first-launch onboarding** (RU/TK/EN language picker + 1–2 skippable value-prop slides → anonymous feed); **owner/model reviews deferred** to a post-MLP content bet.

6. **The agent-facing source of truth** for *what to mirror and what to defer* is **`docs/prd/ui/kolesa-findability-reference.md`** — the scraped 59-flow inventory, the keep/defer map, and per-surface findability patterns. CLAUDE.md points agents to it before any mobile screen/findability work.

## Consequences

### Positive
- A **market-proximate, proven IA** replaces a more distant one (auto.ru) for the screens still being built — Kolesa solves "where do I find X" for exactly AutoTM's buyer.
- The **UX-not-visual boundary** prevents agents from churning the already-shipped visual system.
- The keep/defer map turns "Kolesa is huge" into an **explicit bounded subset**, reinforcing MLP discipline rather than eroding it.

### Negative / accepted costs
- The repo now has **two references in its history** (auto.ru in early artifacts, Kolesa from here). Mitigated by this ADR + the charter revision; older sprint docs keep auto.ru as a historical label and are not rewritten.
- Forward+opportunistic means the beta ships with a **temporary findability split** between older and newer screens.
- One **more agent-facing doc** to keep current.

### Neutral
- Kolesa's visual language is explicitly **out of scope**; design keeps using AutoTM tokens (§12).
- Saved-search, push notifications, and reports/VIN **stay deferred per ADR-0027** even though Kolesa foregrounds them — Kolesa's prominence is not on its own a reason to pull post-MLP bets forward.

## Alternatives considered

- **Keep auto.ru as the reference** — rejected: auto.ru is a larger, RU-market product; Kolesa is closer to TM's market shape and the founder's mental model, and the team already benchmarks against it.
- **Adopt Kolesa as a full IA + feature blueprint** (re-derive navigation from Kolesa, then subtract) — rejected: reopens the locked 5-tab IA and risks reworking shipped screens mid-beta; violates forward+opportunistic.
- **Adopt Kolesa's visual design as well** — rejected: AutoTM's Uber-style system is already built and shipped, and the founder explicitly wants to keep it; only findability is in question.
- **No reference swap — treat Kolesa as a backlog menu only** — rejected: undersells the findability value the founder wants applied to screens being built now.

## References

- [GRILL-OUTCOME.md](../../GRILL-OUTCOME.md) §1 (reference design — revised 2026-06-10) and §12 (design system — unchanged)
- [ADR-0027](0027-mlp-beta-scope.md) — MLP beta scope (bounds what transfers)
- [docs/prd/00-vision.md](../prd/00-vision.md) — anti-goals (bounds what transfers)
- [docs/prd/20-information-architecture.md](../prd/20-information-architecture.md) — the locked 5-tab IA
- [docs/prd/ui/kolesa-findability-reference.md](../prd/ui/kolesa-findability-reference.md) — keep/defer map + per-surface patterns (agent-facing)
- Source: `scrn.gallery/app/kolesa` flows (59 flows / 248 screens, May 2026) + local Kolesa screen captures
