# AutoTM Inspection Program — Operational Model

> **Status**: Strategy doc, drafted 2026-05-18. Mutable; not an ADR.
> **First matters in**: Trust bet after the MLP beta, per [`02-phases.md`](../02-phases.md)
> **Why it exists**: This is the largest discretionary revenue stream AutoTM has under its direct control, and the single biggest trust-differentiator vs. unfunded competitors. A failed inspection program collapses the moat.

---

## The honest pitch — what we're really building

**A scalable, locally-staffed used-car inspection service** that produces:
1. A standardized PDF report (45-90 items checked)
2. A trust tier badge displayed on the listing (Bronze / Silver / Gold)
3. A photo/video record archived as evidence
4. A buyer-protection promise: "AutoTM inspected; if a checked item was wrong, contact us"

The deliverable buyers actually buy is **risk reduction on a $5,000-$30,000 cash decision in a market with no formal vehicle history database**. Without AutoTM's inspection, buyers in TM:

- Inspect the car themselves (most can't — they're not mechanics)
- Bring a friend who's a mechanic (works for ~30% of buyers; the rest don't have mechanic friends)
- Trust the seller (suboptimal in used-car markets globally; especially against "перекупщики" flippers)
- Accept the risk + maybe overpay because they assume problems exist

We're the third option for the 70% who don't have mechanic friends — but only if buyers learn to trust the AutoTM stamp. **Trust is the entire product.** Everything in this document is in service of that.

---

## Why this exists (vs. just being a marketplace)

Two reasons buyers will pay for inspections that they wouldn't pay for the listing service itself:

1. **The risk-reduction value is concrete.** A $50 inspection that saves you from a $5,000 hidden timing-belt problem has an obvious ROI. The marketplace just helps you find the car; the inspection prevents you buying the wrong one.
2. **It's the moat that scales.** Other TM marketplaces (existing auto.tm legacy, potential future entrants) can copy the listings + chat + filters. They can't copy 8-15 trained inspectors + a year of building trust without ~$200k-$500k in operational investment.

This is why the [`02-phases.md`](../02-phases.md) makes Phase 2 the trust layer. It's not "additional features" — it's the durable competitive advantage that turns AutoTM from "a website" into "a brand people trust with money."

---

## Service design — what does an inspection actually look like

### The session

| Step | Time | What happens |
|---|---|---|
| **Booking** | <2 min | Buyer or seller books in AutoTM app: picks date/time slot, location (seller's location, AutoTM workshop, or buyer's location). |
| **Inspector arrives** | — | Inspector shows up in branded AutoTM polo + with toolkit + tablet running inspector app. ID verifiable. |
| **Visual + interior check** | ~10 min | Body panels, paint, glass, lights, interior wear, dash warning lights, mileage match, VIN verification |
| **Under-hood + underbody** | ~15 min | Engine bay, fluids, belts, exhaust, suspension, brakes (visible), frame, signs of accident repair |
| **OBD-II diagnostic** | ~5 min | Scanner reads fault codes; verifies emissions readiness, checks for "cleared codes" tampering |
| **Test drive** | ~15 min | Inspector drives ~5 km mixed conditions: cold start, idle, acceleration, braking, steering response, transmission behavior, alignment |
| **Photo capture** | ~5 min | Standardized photo set: 8-10 angles + close-ups of any flagged issues |
| **Inspector wraps + report** | ~5 min | Inspector marks rubric items in tablet app; tablet syncs to backend |
| **Report delivered** | <2 hours after session | PDF generated server-side, pushed to app + email |
| **Total session time** | ~50-60 minutes |

### The deliverable (PDF + in-app report)

- **Cover page**: photo of car, basic specs, inspection date, inspector name + photo, AutoTM verification stamp
- **Tier badge**: Bronze / Silver / Gold (scoring model below)
- **Summary**: 3-5 bullet headline ("Good condition for 2018 Camry; minor brake pad wear; no major issues found")
- **Rubric results**: ~60 checked items grouped into 6 categories (Body, Engine, Transmission, Suspension/Brakes, Electrical, Interior). Each item: ✅ Pass / ⚠️ Note / ❌ Fail / N/A (not checked / not applicable). Each ❌ or ⚠️ has a 1-2 sentence inspector note + photo.
- **OBD-II report**: codes found (if any), with plain-language explanation
- **Photo grid**: 8-10 standard angles + flagged-issue close-ups
- **Inspector's recommendation**: "Recommended for purchase" / "Recommended with reservations (see flagged items)" / "Not recommended"
- **AutoTM verification**: QR code linking back to a public report URL anyone can verify (prevents forgery)
- **Limitations disclaimer**: "This inspection is a point-in-time visual + diagnostic check. Does not replace a workshop teardown. Hidden mechanical issues may exist."

### Tier scoring (Bronze / Silver / Gold)

Three tiers, derived from rubric results — NOT inspector subjective judgment (reduces bribery risk):

| Tier | Rule | Public meaning |
|---|---|---|
| **Gold** | 0 ❌ Fail items, ≤3 ⚠️ Note items, OBD-II clean | "Inspected by AutoTM, no significant issues found" |
| **Silver** | 0 ❌ Fail items, 4-8 ⚠️ Note items, OBD-II clean OR minor codes | "Inspected by AutoTM, minor wear/maintenance items flagged" |
| **Bronze** | 1-3 ❌ Fail items OR 9+ ⚠️ Note items OR significant OBD-II codes | "Inspected by AutoTM, notable issues flagged — review report" |
| **Not Tiered** | 4+ ❌ Fail items OR safety-critical fail (brakes, structural, etc.) | Listing can still be published with the inspection report attached, but no badge. Inspector recommends "not recommended for purchase" |

The point of mechanical tiering is **auditability**. If a buyer disputes a tier, we can show the rubric → the count → the assigned tier. Bribery defense: inspector can't just "give a Gold" — the rubric drives it.

---

## Pricing model — who pays, how much, when

Three pricing tracks. We support all three; market will show which dominates.

### Track A — Seller-paid pre-listing inspection

- **Pricing**: $40-60 (350-525 TMT) per inspection
- **Who buys**: sellers who think their car is in good shape and want the trust badge to attract buyers / justify higher asking price
- **Predicted adoption**: 5-15% of listings at maturity
- **Mechanic of payment**: prepaid before inspector dispatched

**Why a seller pays $50**: A Gold-badged listing sells faster and for higher asking price. Empirically in markets that have similar programs, badged listings have 30-50% higher contact rates and ~5-15% price premium. ROI for the seller is clear if they actually have a clean car. (Sellers with bad cars don't book inspections — they fear the Bronze tier exposing problems.)

### Track B — Buyer-paid inspection (booked through AutoTM)

- **Pricing**: $50-80 (440-700 TMT) per inspection — premium over seller-paid because buyer typically requests on-demand at short notice
- **Who buys**: buyers seriously considering a specific listing, want third-party verification before committing
- **Predicted adoption**: 1-5% of active listings get this requested
- **Mechanic of payment**: buyer pays AutoTM; we dispatch inspector to the seller's location; seller cannot refuse (or the request gets cancelled and money refunded)
- **Seller acceptance**: when a listing is created, seller agrees to terms allowing AutoTM-dispatched inspectors. Refusing wastes their listing momentum + flags suspicion.

**Why a buyer pays $60**: They're about to spend $10k-30k. A $60 third-party check is 0.3% of the purchase price. Cheap insurance.

### Track C — Bundled with premium listing (future, not Phase 2)

- **Pricing**: included with a $80/month "Verified Seller" subscription tier
- **Who buys**: high-volume sellers who want every listing pre-inspected as part of their listing posting workflow
- **Predicted adoption**: Year 3-5 product; not Phase 2

### Pricing realism check

TM income context: avg monthly salary $300-700 USD; used car prices $5k-30k. A $50 inspection is 7-15% of monthly salary or 0.2-1% of purchase price.

**Bias check**: Am I anchoring too high? Compared to KZ where similar services run $80-150 USD, TM at $50 USD seems fair. But TM has tighter budgets — we may need to launch lower ($30-40) and raise as trust builds. **Plan to A/B test pricing in pilot phase.**

---

## Inspector operations — hiring, training, managing

This is the hardest part. Most of the program risk lives here.

### Inspector profile

Who we hire:
- **Mechanical experience**: 3+ years working as mechanic or in dealership service department, OR formal training (mechanic vocational school + 1 year experience)
- **Communication**: can write clear notes in Russian + spoken Russian + ideally Turkmen
- **Personal qualities**: detail-oriented, conscientious about completing rubrics
- **Trustworthy**: clean record, can pass reference check (3 prior employers/mechanics vouch)
- **Mobile**: has own transportation (car or motorcycle) or willing to use AutoTM-provided vehicle pool
- **Tech-comfortable**: can use a tablet app fluently (we provide the tablet)

Who we DON'T hire (deal-breakers):
- Active mechanic at a competing service center (conflict of interest)
- Past involvement in selling/buying cars for profit (potential bias toward sellers)
- Anyone whose hire would be in their family member's interest (nepotism kills credibility)

### Compensation model

- **Base salary**: 1500-2500 TMT/month (~$170-285 USD) — local-market competitive for skilled mechanics in TM
- **Per-inspection bonus**: 50-100 TMT (~$5-12) per completed inspection
- **Quality bonus**: monthly 200-500 TMT (~$25-60) if random audits show 95%+ rubric accuracy and zero complaints
- **No bonus tied to tier given** — explicitly prevent "give better tiers to get bigger bonus" bias. The rubric drives tier; inspector compensation is decoupled.

Compensation total expectation: $250-400/month for full-time inspector (good wage in TM). Above-market is intentional — high pay = lower bribery susceptibility + ability to fire underperformers without losing the program.

### Hiring + training pipeline

```
Recruiting → Screening interview → Practical test → 2-week training → Probation (10 inspections shadowed) → Solo work
```

**Recruiting**: Posted via Russian-language job sites used in TM (work.com.tm, possibly Telegram channels). Direct outreach to known good mechanics through ops team's network. Founder + ops manager handle the first 5-10 hires personally (signal quality).

**Practical test**: Candidate inspects a "test car" (we have one with known issues; reveal what they should find). Pass criteria: catch ≥80% of planted issues, complete in ≤90 minutes, write clear notes.

**Training (2 weeks, paid)**: 
- Week 1: rubric mastery — learn every item, learn what to look for, learn how to write notes
- Week 2: shadowing — pair with senior inspector on 10 real jobs; senior approves quality at end

**Probation (1 month)**: Solo inspections with random spot-checks by senior inspector. Every 5th inspection re-checked. Disqualification: 2+ missed items in ≤10 inspections.

### Geographic scaling — realistic timeline

Aşgabat is the launch market (highest density, easier ops).

| Period | Cities covered | # inspectors | Capacity (inspections/month) |
|---|---|---|---|
| **Month 0-3 (pilot)** | Aşgabat only | 1-2 | ~30-50 |
| **Month 4-9 (soft launch)** | Aşgabat | 3-5 | ~80-150 |
| **Year 2** | Aşgabat + Mary | 6-9 | ~180-300 |
| **Year 3** | Aşgabat + Mary + Türkmenabat | 9-12 | ~300-450 |
| **Year 4-5 mature** | All 6 regions covered (mobile inspectors travel) | 12-18 | ~500-700 |

Regional cities (Daşoguz, Balkanabat) initially handled by **traveling inspectors** based in Aşgabat. Inspector spends 2-3 days in a regional city, batches 10-15 inspections, returns. Inefficient but acceptable until volume justifies hiring locally.

### Equipment per inspector

| Item | Cost | Notes |
|---|---|---|
| **Android tablet** | $200 | Branded with AutoTM polo + inspector app preloaded |
| **OBD-II scanner** | $150 | Mid-range scanner, reads most TM-market cars |
| **Basic toolkit** | $100 | Visual inspection tools (flashlight, mirror, basic wrenches for checks) |
| **Branded polo + hat** | $40 | Identity signal — trust factor |
| **Smartphone for photos** | $250 | If tablet camera insufficient; many tablets have weak cameras |
| **Power bank** | $30 | Long days |
| **Total per inspector** | ~$770 | One-time setup cost |

For 10 inspectors at maturity: $7,700 in equipment. Trivial vs revenue potential.

**Inspector vehicle**: Either personal (mileage stipend ~$30/month) or AutoTM-pool (one car for every 3-4 inspectors, $5,000-12,000 used reliable car). For Phase 2 launch: personal vehicles with stipend; switch to pool when fleet management justifies it.

---

## Software integration — what we actually build

### Software systems to create

#### 1. Inspector mobile app (Phase 2 — S11 or earlier sub-sprint)

Native Expo app or React Native (subset of `apps/mobile` with auth gate on inspector role). Built on existing infra; reuses `@auto-tm/contracts`.

**Screens**:
- Inspector home: "Today's jobs" + "Pending" + "Completed" tabs
- Job detail: car info, address, contact, navigation link, "Start inspection" CTA
- Inspection workflow: tab through rubric categories; tap to mark Pass/Note/Fail; voice notes for items requiring text; photo capture with required-angle prompts
- OBD-II integration: app reads from Bluetooth OBD-II adapter; auto-saves codes to report
- Submit: review rubric → calculate tier algorithmically → confirm → submit (offline-tolerant; syncs when reconnected)

**Key technical decisions**:
- Offline-capable: TM mobile data can flake; inspectors work in garages with poor signal
- Photo upload via existing `apps/mobile` upload-staging pattern (S4 infrastructure)
- Server-generated PDF (not client-side) — consistent formatting, anti-tampering
- Inspector app data feeds into `apps/api/src/modules/reports/` (Phase 2 bounded context per [ADR-0001](../../adr/0001-architecture.md))

**Build cost estimate**: 4-6 weeks of focused mobile dev (one good engineer)

#### 2. Booking flow — buyer/seller-facing

Lives in main `apps/mobile` listings detail page + a dedicated "Book inspection" screen.

**Buyer-book flow**:
1. On listing detail, "Request AutoTM inspection" CTA appears prominently (when buyer is logged in)
2. Tap → confirms terms ("seller will be notified; $60 charge")
3. Pick proposed time slots (3 options)
4. Pay (Phase 2 needs payment integration — likely cash-on-completion or bank transfer first; cards later)
5. Backend assigns inspector based on availability + location
6. Seller gets notification + must confirm one of the proposed time slots within 24h
7. If seller confirms → booked; both parties notified
8. If seller doesn't confirm or refuses → buyer refunded; listing flagged for "refused inspection" (subtle penalty)

**Seller-book flow**:
1. From "My Listings" → existing listing → "Request AutoTM inspection" CTA
2. Pre-listing flow available in publish wizard ("Want to get this inspected before going live? Boost your listing's value.")
3. Pick time slot + location (their location or AutoTM workshop)
4. Pay → booking confirmed → inspector dispatched

#### 3. Backend services (Phase 2, in `apps/api/src/modules/reports/`)

Per [ADR-0001](../../adr/0001-architecture.md), `reports/` is its own bounded context. Owns:

- **`InspectionRequest`** entity: who, what listing, when, where, status, price paid
- **`InspectionReport`** entity: the actual report with rubric results, tier, photos, inspector
- **`InspectorAssignment`** logic: which inspector picks up which request (round-robin + location-weighted)
- **`RubricTemplate`** entity: the questions; versioned (so we can iterate without breaking historical reports)
- **PDF generator**: server-side, using a template + the report data

**Cross-context integration**:
- `listings/` → `reports/`: listing's inspection status surfaced via a cross-context port `ReportsReadPort.getInspectionForListing(listingId)`
- `reports/` → `notifications/`: emit `InspectionBooked`, `InspectionCompleted`, `InspectionDisputed` events; notifications context consumes for push notifications
- `reports/` → `identity/`: read inspector profile via `IdentityReadPort.getInspectorProfile(userId)`

### Software cost estimate

| Component | Effort |
|---|---|
| Inspector mobile app | 4-6 weeks |
| Booking flow (buyer + seller sides) | 2-3 weeks |
| Backend reports context (entities, use-cases, controllers, repository) | 3-4 weeks |
| PDF generation pipeline (server-side, template + variant generator) | 1-2 weeks |
| Admin dashboard for ops team (job queue, dispatch overrides, audit access) | 2-3 weeks |
| Tier scoring rubric editor (admin can update rubric without code deploy) | 1-2 weeks |
| **Total** | **~13-20 weeks** of one focused engineer-equivalent |

This roughly maps to **2-3 sprints** of Phase 2 (S11-S13). Aligns with the existing [`02-phases.md`](../02-phases.md) plan.

---

## Building trust — the hardest, longest part

Software gets built in weeks. Trust takes months to years. This is the strategy that matters most.

### Phase 0 — Pilot (Month 0-3, before public launch)

**Goal**: 30-50 inspections completed; rubric proven; first inspector trained; build the case study.

- Pick 5-10 friendly sellers (known to founder or ops team) who have clean cars
- Run free inspections — let inspector + ops team find rubric gaps
- 5-10 friendly buyers run real buy-decisions using the inspection
- Collect their feedback: "Did the report help? Was anything missed? Would you pay $50?"
- Iterate the rubric, photo standards, report format
- Produce 3-5 written case studies (anonymized): "Buyer used inspection report, found brake issue inspector flagged, negotiated $400 off, saved time + money"

**Output**: rubric v1.0 signed off by a known mechanic (per [`02-phases.md`](../02-phases.md) operational prereq).

### Phase 1 — Soft launch (Month 3-9)

**Goal**: 100-300 paid inspections; trust signal building; word-of-mouth spreading.

- Public launch with first 3-5 inspectors hired
- Aggressive pricing: $30-40 per inspection (below cost briefly) to drive volume — yes, we lose money short-term
- Buyer-paid inspections free for first 3 months — pure trust-building tactic
- Every report has buyer call-back ("How was your experience?") — early feedback loop
- Highlight inspection-related case studies on the blog (Bortzhurnal) + social media
- Get one prominent TM influencer (auto blogger if any; or known mechanic personality) to do an inspection on-camera as a credibility play

### Phase 2 — Trust established (Month 9-24)

**Goal**: Inspections become a known, paid product. Tier badges on listings drive value. Buyers ask "is it AutoTM inspected?" unprompted.

- Pricing rises to target ($50-60 seller / $60-80 buyer)
- "Sponsored inspector content" — featured inspector profiles building personal trust
- Trust-tier filter in S5 filter sheet: "Show me only Gold-tier listings"
- Statistical proof: publish anonymized data ("87% of buyers who use AutoTM inspection report find the report's findings accurate when verified by independent mechanic")

### Phase 3 — Network effects (Year 2-3)

**Goal**: Inspections become the default. Buyers in TM expect them on serious listings. Dealers offer "AutoTM inspection on request" as part of their service.

- Partner with banks: "Get an AutoTM inspection report + auto loan pre-qualification"
- Partner with insurance: "AutoTM-inspected cars get 5% off comprehensive insurance"
- Mature reputation: "AutoTM Stamp" becomes the equivalent of CarFax in US

### Trust signals we can actually deploy

| Signal | Build cost | Trust impact |
|---|---|---|
| Inspector identity verifiable in app (photo + name + ID) | Low | High |
| QR code on PDF report links to verification URL (public) | Low | High |
| 6-month / 12-month report history searchable: "show me 100 sample reports" | Medium | High |
| Public stats: "Total inspections: 1,247. Average tier given: Silver. Disputes filed: 3. Resolved in buyer's favor: 1." | Low | Very high |
| Audit framework: independent mechanic re-checks 5% of reports monthly; results published | Medium | Very high |
| Inspector tenure stats: "Our average inspector has been with us X months" | Low | Medium |
| Money-back guarantee: "If we missed a major item, full refund + we pay for proper repair up to $500" | Medium (insurance/budget) | Very high |
| AutoTM branded vehicles for inspectors (Year 3+) | High (fleet cost) | High |

The money-back guarantee is the most powerful signal but also the most operationally risky. **Recommended: introduce in Year 2 once inspector quality is consistent**.

---

## Edge cases + failure modes — what kills this program

### Operational failures

**1. Inspector takes bribes from sellers to inflate tier.**

- **Probability**: High in TM context. Cash payments are easy; oversight is hard.
- **Mitigation**:
  - Tier is rubric-driven, not subjective — inspector physically cannot just "give a Gold"
  - Inspector compensation explicitly decoupled from tier given
  - Random spot-check audits: 5% of reports re-inspected by senior inspector within 30 days
  - Buyer dispute flow (see below) gives third-party validation
  - Cell phone GPS on inspector tablet — verify they actually went to the listing location
  - Above-market pay reduces incentive
  - Termination policy: 1 confirmed instance = fire + reputation loss
- **Detection**: Spot audits + dispute patterns ("inspector X has 3 disputes vs. team avg of 0.5")
- **Acceptance**: We will lose 1-2 inspectors to this in the first 3 years. Plan for it. Don't let it stop the program.

**2. Inspector physically damages car during inspection.**

- **Probability**: Low but inevitable at scale.
- **Mitigation**:
  - Liability insurance: $500-1000/year per inspector (TM insurance market needs research)
  - Test-drive damage cap: inspector drives ≤5 km in calm conditions
  - Pre-inspection photo set captures pre-existing condition (proof)
  - Standard release: seller acknowledges normal inspection wear
- **When it happens**: AutoTM pays out of insurance/reserves immediately. Don't make seller fight; reputation damage is worse than the payout.

**3. Buyer disputes inspection finding ("you said brakes were fine; they failed after 2 weeks").**

- **Probability**: Medium. Maintenance items wear down constantly.
- **Mitigation**:
  - Report explicitly says "point-in-time inspection — does not predict future failure"
  - Rubric items have failure thresholds (e.g., "brake pads <30% remaining = Note item"; "<10% = Fail")
  - Disclaimer prominent in report
  - For disputes: ops team re-reads the report + photos; if inspector clearly missed something, refund + pay for proper repair up to $200; if not, no refund but explain reasoning publicly (on report verification page)
  - Track dispute patterns: if Bronze-tier listings get 30% disputes, our rubric is too generous

**4. Geographic gaps — no inspector available in regional city for 2 weeks.**

- **Probability**: High in Year 1-2.
- **Mitigation**:
  - Traveling inspectors (batched trips)
  - Limited launch geography (Aşgabat first; expand only when capacity exists)
  - Honest UX: "No inspector available within 14 days. Try again later."
  - Lost revenue from this is OK; bad inspection from rushed coverage is worse.

**5. Inspector turnover — senior inspector leaves; team quality drops.**

- **Probability**: Very high. TM labor market is small; good mechanics are headhunted.
- **Mitigation**:
  - Documented training pipeline (anyone can be hired + trained)
  - Senior inspector role = pay premium + senior + training responsibility
  - Knowledge captured in rubric + training materials, not in heads
  - Always 2+ senior inspectors (avoid single-point-of-failure)
  - Quarterly "senior inspector summit" — reduces departures via team cohesion

**6. Demand spike — 100 inspections requested same week, capacity is 50.**

- **Probability**: Medium.
- **Mitigation**:
  - First-come-first-served booking queue surfaced honestly: "Next available: 8 days"
  - Surge pricing for fast-track ($80 for next-day vs $50 for 7-day) — controversial, decide if comfortable
  - Hire ahead of demand — over-staffing is acceptable in growth phase

### Financial failures

**7. Inspection cost > inspection price (unprofitable per-unit).**

- **Risk**: Inspector pay + equipment depreciation + insurance + admin overhead may exceed $50-60 per inspection.
- **Math check**:
  - Inspector pay ($300/month / 100 inspections/month) = $3 per inspection (if utilization is good)
  - Equipment depreciation ($770 / 24 months / 8 inspections/day × 22 days) = ~$0.20 per inspection
  - Insurance + ops admin: ~$5 per inspection
  - Total cost per inspection: $8-15
  - Pricing $50-60 = 60-80% gross margin
- **Risk**: Margin only works if utilization is high. If inspector does 30 inspections/month instead of 100, per-inspection cost shoots up.
- **Mitigation**: Don't hire inspectors faster than demand can fill 60+ jobs/inspector/month. Better to have wait-times than idle inspectors.

**8. Demand never materializes — inspections stay <5% of listings.**

- **Risk**: If TM buyers don't internalize inspection value, the entire program is uneconomic.
- **Detection**: Watch adoption rate by month. If Month 6 of soft launch shows <2% of active listings inspected → red flag.
- **Mitigation**:
  - Heavier free-inspection pilot (subsidize buyer trust-building)
  - Bundle into listing fees: "free inspection with PRO seller subscription" (loss-leader)
  - Re-evaluate at month 9 — willingness to kill program if data says so

**9. Government / regulatory restrictions on "vehicle inspection services."**

- **Risk**: TM government may regulate this differently than expected. Inspection services in some jurisdictions require licenses.
- **Action**: Pre-launch legal review with TM lawyer. Position as "advisory pre-purchase check" not "certified inspection" if needed.

### Trust / reputation failures

**10. A major scandal early — bad inspector + viral negative review.**

- **Probability**: Medium. Social media moves fast in TM.
- **Mitigation**:
  - Aggressive response to first complaints (over-correct early)
  - Visible CEO/founder involvement in dispute resolution (humanizes brand)
  - Public response template ready
  - One major mishandled complaint can set program back 6-12 months. Treat first 100 complaints like crises.

**11. Tier inflation — "everyone gets Gold."**

- **Risk**: Inspectors over time become lenient (less effort, more friendship with sellers, etc.). Tier becomes meaningless.
- **Detection**: Track tier distribution monthly. Should be roughly 30% Gold / 50% Silver / 20% Bronze. Deviation = audit.
- **Mitigation**: Quarterly rubric calibration — senior inspector + ops manager re-inspect a sample of completed cars to test consistency

**12. Tier deflation — "no one gets Gold; rubric too strict; sellers stop using."**

- **Risk**: Opposite of #11. Over-strict rubric kills seller demand.
- **Detection**: Same monthly tier distribution check.
- **Mitigation**: Quarterly rubric tuning — slightly relax thresholds if distribution skews Bronze-heavy

---

## Biases I'm working against — explicit self-check

**Bias 1**: I'm pattern-matching from CarMax / Carfax (US) and assuming similar buyer behavior. **Counter**: TM buyers may not have the same trust-in-services mental model. They may default to "my brother-in-law is a mechanic; I'll bring him." Mitigation: in pilot phase, A/B test "use AutoTM inspection vs bring own mechanic" with friendly users; measure willingness-to-pay.

**Bias 2**: I'm assuming inspectors are findable + trainable. **Counter**: TM mechanic talent pool may be smaller than I think. 100 viable candidates may not exist. If the program scales 30+ inspectors, supply may strain. Mitigation: build relationships with mechanic vocational schools; offer apprenticeships; train your own pipeline if recruiting dries up.

**Bias 3**: I'm assuming $50 is "cheap insurance" for buyers. **Counter**: For someone making $400/month, $50 is 12% of monthly salary. That's not trivial. They may rationalize "I'll just ask my friend who's a mechanic; he'll do it for free." Mitigation: clearly communicate WHY paid > free in marketing. Bias the value prop toward "your friend isn't a certified mechanic with OBD-II + standard checklist; AutoTM is."

**Bias 4**: I'm assuming buyers will read the report. **Counter**: Many buyers may skim the badge and skip the details. If they're going to ignore the rubric, why are we building it? Mitigation: front-page the tier + 3-bullet summary; rubric details are for the buyer's mechanic-friend to review. Two audiences: scanners + readers.

**Bias 5**: I'm assuming inspectors will follow the rubric. **Counter**: After 6 months, experienced inspectors will start "knowing the answer" before they get to the rubric. They'll mark Pass without actually checking, especially under time pressure. Mitigation: app forces rubric completion with required photos; can't submit without each section having ≥1 photo attached.

**Bias 6**: I'm assuming buyer-paid inspections will happen at significant scale. **Counter**: Buyers may not want to commit $60 before they've even talked to the seller. Maybe seller-paid (which incents the seller to seek the badge) dominates and buyer-requested stays <2% forever. Mitigation: track ratio; if buyer-paid is below 1% by Month 12, pivot to seller-paid-only model.

**Bias 7**: I'm assuming this is the moat. **Counter**: A motivated competitor with capital could replicate this in 12-18 months. The actual durable moat is the **trust accumulated through 18+ months of clean operations + dispute history**, not the program itself. Mitigation: invest heavily in trust + audit transparency early. Make trust visible and verifiable.

---

## Questions to revisit (open / TBD)

These I genuinely don't have answers to and will need real data or expert consultation:

1. **Legal**: What's the regulatory status of "vehicle inspection services" in TM? Do we need a license? Are reports legally defensible?
2. **Insurance**: What does liability insurance for mobile mechanics cost in TM? Available at all?
3. **Tax treatment**: How do per-inspection fees + inspector salaries get treated for tax? Hiring as employees or contractors?
4. **Banking**: Inspection payments — how does buyer pay? Cash on completion is operationally simple but creates collection risk; bank transfer requires bank infrastructure; cards may not be widely usable.
5. **Mechanic market signals**: How many qualified inspectors realistically available in Aşgabat? Anyone surveyed the local mechanic ecosystem?
6. **Buyer willingness to pay**: Is $50 actually right? Or is the right number $30? $80? Pilot phase A/B test.
7. **Seller willingness to display Bronze tier**: If they paid $50 and got Bronze, do they keep the badge visible or hide it? If they hide, our incentive structure for sellers breaks.
8. **Dispute volume**: How many of 100 inspections will generate disputes? 1? 5? 20? Affects ops staffing.

---

## Success metrics

| Metric | Phase 0 (pilot) target | Phase 1 (soft launch) target | Phase 3 (mature) target |
|---|---|---|---|
| **Inspections completed** | 50 | 300 | 5,000/year |
| **% of active listings inspected** | N/A | 3-5% | 8-12% |
| **Avg tier given** | — | 30% Gold / 50% Silver / 20% Bronze | Same |
| **Inspector retention (12-month)** | 100% | 80% | 70% |
| **Dispute rate** | <5% | <3% | <2% |
| **Buyer NPS post-inspection** | >50 | >40 | >35 |
| **Time from booking to completion** | <72h | <48h | <24h (for non-rural) |
| **Per-inspection contribution margin** | breakeven | 30-50% | 60-70% |
| **% of listings using "filter by tier"** | N/A | N/A | 30-50% in S5+ |

If we miss these by Month 6, run a serious "what's broken" review.

---

## Rollout sequence — concrete what-happens-when

Timeline assumes Phase 2 starts ~12 months after AutoTM public launch (per [`02-phases.md`](../02-phases.md)).

### Month -3 to Month 0 (pre-Phase 2)
- Hire ops manager for inspection program
- Recruit first 2 inspectors (Aşgabat)
- Build rubric v1.0 with consulting mechanic
- Train first inspectors (4 weeks)
- Run 20-30 friendly inspections, iterate rubric

### Month 0-3 (Phase 2 Sprint S11-S13)
- Software ships: inspector app + booking flow + reports backend
- Pricing: $30-40 (subsidized)
- Volume target: 50-100 inspections
- Public launch announcement

### Month 4-9 (Phase 2 Sprint S14-S16)
- Hire 2-3 more inspectors
- Pricing rises to $50-60
- Volume target: 200-500 inspections
- Tier filter ships in S5+
- First case studies published

### Month 10-18 (Phase 3)
- Aşgabat fully staffed (5-8 inspectors)
- Expand to Mary
- Volume target: 800-1500 inspections
- Buyer-paid track gaining traction

### Year 2+
- All major TM cities covered
- 10-15 inspectors total
- Volume: 2000-4000/year
- Bank/insurance partnerships explored
- Premium tier added (24-hour fast-track $80)

---

## Cross-references

- [`../02-phases.md`](../02-phases.md) — Phase 2 sprint plan + operational prereqs (rubric signoff, inspector hiring, sample inspections)
- [`../03-roadmap.md`](../03-roadmap.md) — trust work is a post-MLP bet, not a fixed S11-S16 roster
- [`../features/`](../features/) — future feature PRD for `33-inspection-reports.md` (TBD; written when Phase 2 sprint files crystallize)
- [`dealer-subscriptions.md`](dealer-subscriptions.md) — dealer PRO subs may bundle inspections for high-volume dealers
- [`ad-sales-strategy.md`](ad-sales-strategy.md) — inspection report viewer pages are prime ad inventory (mechanics, parts, service)
