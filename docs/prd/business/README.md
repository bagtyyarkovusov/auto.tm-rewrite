# Business / GTM strategy

This directory holds **revenue-model + go-to-market strategy documents** — distinct from product PRDs (which describe target capability), user flows (which describe journeys), or operational runbooks (which describe production operations).

## What lives here

| Document | Revenue stream | Phase first matters | TL;DR |
|---|---|---|---|
| [`inspection-program.md`](inspection-program.md) | AutoTM-staffed inspection fees | **Phase 2** (S11-S16) | Largest discretionary revenue stream; unique trust-layer moat; 8-15 inspectors at maturity |
| [`ad-sales-strategy.md`](ad-sales-strategy.md) | Third-party display + native advertising | **Phase 1 late / Phase 2** | Banks, insurance, parts, service centers; direct-sales motion; modest but compounding |
| [`dealer-subscriptions.md`](dealer-subscriptions.md) | Recurring SaaS-style dealer PRO accounts | **Phase 1 (S6+)** | 200-500 dealers at maturity; tiered pricing; major recurring revenue |

## How these documents relate to the rest of the repo

- **Not ADRs** — these aren't architectural decisions. They're business plans subject to revision as the market teaches us. Per [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md), strategy docs are mutable; significant pivots may generate ADRs when they have architectural implications.
- **Inform PRD features** — when these strategies translate to user-visible capabilities (e.g., "PRO badge on dealer listings"), a feature PRD captures the spec.
- **Inform sprint planning** — the timing claims here ("first paid dealer by Month 12") feed into roadmap milestones, not the other way around.

## Honest framing

These documents are **forward-looking strategy**, not commitments. They reflect best understanding as of 2026-05-18. Three things worth knowing:

1. **TM-specific data is limited.** Some numbers are extrapolated from comparable markets (KZ, UA, RU) adjusted downward for TM specifics. Where I'm guessing, I say so.
2. **Bias checks are explicit.** Each document has a "Biases to question" section. I'm pattern-matching against Western marketplaces; TM may behave differently.
3. **Failure modes are first-class.** Each document includes "what kills this" sections. The goal is to be honestly prepared, not to manifest success.

## Source material referenced across docs

- [`../00-vision.md`](../00-vision.md) — anti-goals, especially "no paid placement"
- [`../02-phases.md`](../02-phases.md) — Phase 2 trust layer (Sprint S11-S16)
- [`../03-roadmap.md`](../03-roadmap.md) — sprint sequence + milestones
- [`../features/32-listings.md`](../features/32-listings.md) — listing capability (Open Questions section)
- [`../features/`](../features/) — other feature PRDs as they're written
- Comparable marketplaces: Auto.ru (RU), Auto.ria (UA), Kolesa.kz (KZ), Drom.ru (RU), CarGurus (US/UK), Carvana (US)

## Review cadence

These docs should be revisited:
- **Every 6 months** for sanity-check + numbers refresh
- **Before each Phase boundary** (Phase 1 → 2 → 3)
- **After any major market signal** (competitor launch, partnership formed, dealer feedback at scale)
