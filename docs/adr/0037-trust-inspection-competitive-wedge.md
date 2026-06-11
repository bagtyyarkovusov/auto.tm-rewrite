# ADR-0037: Trust / inspection as the competitive wedge — pulled forward against TM incumbents

- **Status**: Accepted
- **Date**: 2026-06-11
- **Deciders**: AutoTM founder + AI architect
- **Relationship**: **Amends the *sequencing* of [ADR-0027](0027-mlp-beta-scope.md)** — trust/inspection was deferred to Phase 2 *after* a generic MLP beta; it is now the **wedge**, pulled forward as positioning and as the first real-world test. **Clarifies the competitive framing of [ADR-0035](0035-multi-vertical-platform-direction.md)** — multi-vertical *breadth* is table stakes the incumbent already holds, so the expansion sequence's **reports/tier (trust)** bet is elevated to the lead differentiator. **Does not change** ADR-0027's cars-only MLP scope, ADR-0035's long-arc direction, or the air-gap/charter decisions.

## Context

The question *"what's next after Sprint 8 — the app feels too simple for public"* surfaced the real problem: the MLP is an **undifferentiated marketplace loop**, and AutoTM faces **real, entrenched Turkmen incumbents that were absent from every strategy doc** (`business/README.md` benchmarked only foreign apps — auto.ru, Kolesa, Drom, Carvana — and named no TM competitor).

The actual TM competition:

- **TMCARS** (`com.tm.tmcar`) — self-described *"#1 Car Marketplace in Turkmenistan,"* **~254K+ users**, largest listing database + model catalogs, search/filter, on App Store **and** Google Play. Critically, it is **already multi-category** — cars *plus* real estate, electronics, household goods, and a news section. It already occupies the multi-vertical breadth that [ADR-0035](0035-multi-vertical-platform-direction.md) framed as AutoTM's *long arc*.
- **Teklip Cars** — cars marketplace with photo listings, advanced filters, buyer↔seller chat, AI / price-average, and imported-car (China / Korea / Dubai) listings; but **no dealers, no garage, no inspection** (founder's firsthand read).
- (Also **Tmstore / Bildirishler**.)

Two implications fall out:

1. **Demand is validated, not hypothetical.** 254K users prove Turkmen buyers already use a phone app to buy/sell cars. AutoTM has a **share / wedge** problem, not an **existence** problem — the far more solvable kind for a solo founder.
2. **Breadth and "newer / cleaner" cannot win.** A solo founder cannot out-supply a 254K-user incumbent, and TMCARS already holds the multi-vertical breadth. A new entrant needs a wedge incumbents do not hold and cannot cheaply copy.

The open whitespace neither incumbent occupies is **trust / vehicle inspection** — and it is already AutoTM's documented moat. `business/inspection-program.md`: *"Trust is the entire product,"* and competitors *"can copy the listings + chat + filters. They can't copy 8-15 trained inspectors + a year of building trust without ~\$200k-\$500k."* The founder independently named trust/inspection as the wedge before the docs were re-read.

The tension this ADR resolves: the **uncopyable** trust moat (physical inspections) is operationally heavy and needs **on-ground presence** (the founder is currently geo-blocked in China), while the generic software MLP is remotely buildable but **does not differentiate**. The prior sequencing ([ADR-0027](0027-mlp-beta-scope.md)) ships the undifferentiated part first and defers the differentiator — backwards against entrenched incumbents.

## Decision

1. **Trust is AutoTM's competitive wedge.** Position AutoTM as *"the safe, verified place to buy a car in Turkmenistan"* — not *"a cleaner marketplace."* The differentiator is verification / inspection, which the incumbents lack and cannot cheaply replicate.

2. **Pull trust-positioning forward** from Phase 2 into the wedge. This amends [ADR-0027](0027-mlp-beta-scope.md)'s *sequencing only* (its cars-only MLP scope is unchanged): the first real-world test becomes a **trust pilot**, replacing the generic 10-50 beta.

3. **Start manual / concierge.** The first inspection test is the `inspection-program.md` **"Phase 0 pilot"**: 5-10 free manual inspections (founder + 1 trusted mechanic + a checklist + a PDF), producing 3-5 written case studies. **No inspector app, no payments, no 8-15-inspector operation.** "Do things that don't scale."

4. **Instrument demand before building ops.** Ship a remotely-buildable *"Request AutoTM inspection (coming soon)"* interest signal + willingness-to-pay prompt on the listing surface, to **measure inspection demand** — the inspection program's single biggest risk (its failure mode #8 / bias #6) — before any operational spend.

5. **Remote-now vs on-ground-later split.**
   - **From China now (no ground presence needed):** finish **S8a** (the product-complete app is the *substrate*); add **software trust-signals** — verified-seller badge (reusing existing phone OTP), structured honest **condition disclosure** on listings, **VIN history** via the existing `VinDecoderPort`, prominent moderation/report; add the **demand instrumentation** (4); and **desk-prep the pilot** (rubric v1, PDF template, recruiting shortlist).
   - **On the ground in TM (or via one trusted helper):** run the **concierge pilot** (3).

6. **Multi-vertical breadth demoted as a *differentiator*.** [ADR-0035](0035-multi-vertical-platform-direction.md)'s direction stands as the long arc, but breadth is **already held by TMCARS** — it is table stakes, not AutoTM's edge. Within ADR-0035's expansion sequence, **reports/tier (trust)** is elevated to the lead wedge ahead of additional verticals.

*Note:* booking an **inspection** is part of this program and is **not** the *"test drive scheduling"* anti-goal in [00-vision.md](../prd/00-vision.md#anti-goals-things-we-explicitly-will-not-build) (that anti-goal is buyer↔seller test drives — a different thing).

## Consequences

### Positive

- AutoTM competes on the **one axis incumbents cannot cheaply match** (verification / trust), in a market with *no formal vehicle-history database*.
- The wedge **doubles as the cold-start solution**: *"free professional inspection of the car you're about to buy"* is a far stronger recruitment hook than *"try my new app,"* and the pilot needs only ~5-10 people, not 50.
- **Demand is de-risked** with a cheap fake-door before any operational spend.
- Gives a solo, geo-blocked founder a **remote-doable near-term track** (S8a + trust-signals + demand test + prep) and a clear **on-ground trigger** (the pilot).

### Negative / accepted costs

- **Reverses prior sequencing.** "What's next" is no longer a generic beta; the roadmap and `ops/84-launch-plan.md` private-beta framing must update to the trust pilot.
- The **full** inspection program is operationally brutal (bribery risk, regulatory / insurance unknowns, capital) — but only the **pilot** is committed here; the operation stays **betting-table-gated** on demonstrated demand.
- The **physical pilot still depends on on-ground presence**; remote work alone cannot validate the wedge.
- **Software trust-signals are copyable** — they are positioning + funnel, not the moat. The durable moat remains the physical inspection record + accumulated trust.

### Neutral

- [ADR-0027](0027-mlp-beta-scope.md) cars-only MLP scope unchanged; [ADR-0035](0035-multi-vertical-platform-direction.md) multi-vertical direction unchanged (only its competitive framing is clarified).
- No implemented domain invariants change yet; the `reports/` bounded context stays unbuilt until the pilot + demand justify it.
- `business/` competitive analysis is corrected to include tmcars / teklip (previously absent).

## Alternatives considered

- **Generic MLP beta first (status-quo [ADR-0027](0027-mlp-beta-scope.md) sequencing).** Rejected: nothing pulls testers off TMCARS's 254K listings; the beta would mostly confirm indifference.
- **Trust positioning via software signals only (no physical inspections).** Rejected as the *whole* bet: software trust is copyable and not the moat. Kept as the remote-now layer beneath the physical pilot.
- **Compete on multi-vertical breadth / a "cleaner TMCARS."** Rejected: breadth is already the incumbent's; a solo founder cannot out-supply 254K users.
- **A narrower segment wedge** (imported cars, dealers-only, pricing-AI). Noted as secondary; trust is the broader, more defensible, founder-validated whitespace, and the others can layer on later.
- **Leave it unrecorded.** Rejected: this reverses a locked ADR's sequencing and corrects a competitive-analysis gap — it must be captured.

## References

- [ADR-0027](0027-mlp-beta-scope.md) — MLP beta scope (sequencing amended here; cars-only scope unchanged)
- [ADR-0035](0035-multi-vertical-platform-direction.md) — multi-vertical direction (competitive framing clarified; reports/tier elevated)
- [ADR-0034](0034-kolesa-ux-findability-reference.md) — Kolesa UX/IA findability reference
- [business/inspection-program.md](../prd/business/inspection-program.md) — the moat; the Phase 0 concierge pilot; the demand risk
- [business/README.md](../prd/business/README.md) — competitive analysis (tmcars / teklip added)
- [00-vision.md](../prd/00-vision.md) — why-it-exists; anti-goals (inspection booking ≠ test-drive-scheduling)
- [03-roadmap.md](../prd/03-roadmap.md) — post-MLP bet table; "what's next" reframed to the trust wedge
- [ops/84-launch-plan.md](../prd/ops/84-launch-plan.md) — private-beta phase (reframed to the trust pilot)
- Competitor apps: **TMCARS** `com.tm.tmcar` (Play + App Store); **Teklip Cars**; Tmstore / Bildirishler
