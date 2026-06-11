# Sprint 9 — Trust wedge (inspection foundation + concierge pilot)

| | |
|---|---|
| **Status** | ⚪ Pending (starts after S8a closes) |
| **Phase** | Post-MLP — **trust wedge, pulled forward** ([ADR-0037](../../adr/0037-trust-inspection-competitive-wedge.md)) |
| **Milestone** | M8 — Trust wedge / first inspection pilot |
| **Demo audience** | S9a: internal dogfood (local dev stack). S9b: first 5-10 pilot buyers (on-ground TM) |
| **Estimated time** | S9a ~1.5-2 weeks (remote) + S9b on-site (TM) |
| **Issues** | TBD — parent + children created at sprint start |

> **Why this sprint exists.** [ADR-0037](../../adr/0037-trust-inspection-competitive-wedge.md) makes **trust / vehicle inspection AutoTM's competitive wedge** against the real TM incumbents (**TMCARS** ~254K users, already multi-category; **Teklip**) and **pulls it forward** from Phase 2. A generic marketplace cannot pull users off TMCARS's 254K listings; a **verified-trust layer** can — it is the one capability neither incumbent has, and AutoTM's documented moat ([`business/inspection-program.md`](../business/inspection-program.md): *"Trust is the entire product"*). This sprint builds the **remote-doable trust foundation** and runs the **manual concierge pilot** that tests inspection demand **before any inspection ops are built**.
>
> **Split mirrors S8** because the founder is geo-blocked in China (see the S8 reshape): **S9a remote** (verifiable on a local dev stack) + **S9b on-ground** (needs TM presence or one trusted helper). The full Phase-2 inspection program stays **betting-table-gated on this pilot's demand data**.

## Goal

Make AutoTM **read and function like the trustworthy place to buy a car**, and run the first real-world inspection pilot — so the decision to build (or not build) the full Phase-2 inspection program is made from **demonstrated demand**, not a guess.

## User capability (the demo line)

> "A buyer browsing AutoTM can see which sellers are **verified**, read an **honest condition disclosure** and **VIN history**, and tap **'Request an AutoTM inspection'** — and in the pilot cohort, a real mechanic actually inspects the car for free and hands them a report that changes their decision."

## Bounded contexts touched

- **Primary**: `apps/mobile` (trust signals + demand fake-door), `listings/` (condition disclosure, VIN surfacing), a **minimal `reports/` seed** (inspection-interest capture only — **NOT** the full Phase-2 context)
- **Supporting**: `apps/web` (trust info page), `apps/admin` (interest counts), `packages/db` (condition + interest migration), `packages/contracts` (schemas), docs (rubric, pilot runbook)

---

## S9a — remote trust foundation (active first)

Everything verifiable on a local dev stack from anywhere. **Build order**: signals first, demand fake-door alongside, desk artifacts last.

| ID | Slice | Primary areas | Depends on | Verify |
|---|---|---|---|---|
| **0** | **S8a dependency check** — S9 builds on the product-complete, localized, account-complete substrate | — | S8a | trivial |
| **T1** | **Verified-seller signal** — "Verified phone" badge on the seller block + listing card (reuses existing OTP-verified phone; **no new verification flow**) | mobile, api | 0 | 🧑 sim |
| **T2** | **Structured condition disclosure** — honest-condition section in the create wizard + schema (accident y/n, true-mileage attestation, # owners, service-history y/n, known-issues text); render on listing detail | mobile, api, db, contracts | 0 | 🤖 AFK + 🧑 |
| **T3** | **VIN history surfacing** — wire the existing `VinDecoderPort` output onto listing detail (show what the VIN reveals; honest "not decoded" empty state) | mobile, api | 0 | 🧑 sim |
| **T4** | **Inspection demand fake-door** — "Request AutoTM inspection (coming soon)" CTA on detail + publish flow → records `InspectionInterest` (listing, requester, side, optional willingness-to-pay) **behind a flag**; admin reads counts | mobile, api, db, admin | 0 | 🤖 AFK + 🧑 |
| **T5** | **Trust positioning pass** — minimal trust framing on home/detail/onboarding + a "How AutoTM keeps you safe" info page (RU/TK/EN) explaining verification + inspections-coming | mobile, web | T1–T4 | 🧑 sim |
| **T6** | **Inspection rubric v1 + PDF template** *(desk artifact)* — ~45-60 items / 6 categories + a simple report template the concierge pilot fills by hand. Needs a consulting mechanic's signoff. | docs | — | — |
| **T7** | **Concierge pilot runbook** *(desk artifact)* — recruit 1 mechanic + 5-10 buyers, consent script, free-inspection flow, what-to-measure, case-study template | docs | — | — |
| **C** | **Docs + CONTEXT closeout** — `reports/` seed CONTEXT, condition/interest invariants, roadmap M8, deferred-ledger note | docs | T1–T5 | — |

**Verify legend:** 🧑 sim = founder's Expo Go simulator (Sandcastle is blind to UI) · 🤖 AFK = cleanly Sandcastle-able (Testcontainers/static).

---

## S9b — on-ground trust pilot (deferred to TM)

Blocked from China; resume when the founder is on-site **or** has one trusted helper + the pilot mechanic.

- Recruit **1 trusted mechanic** + **5-10 friendly buyers** with real buy-decisions in progress
- Run **5-10 free manual inspections** using rubric v1 + the PDF template (founder/helper coordinates; mechanic inspects)
- Produce **3-5 written case studies** (anonymized): did the report change the decision? what was found?
- **Measure demand**: fake-door taps vs. actual uptake; willingness-to-pay responses; would-recommend
- **Output → betting table**: a recorded **go/no-go** on building the Phase-2 inspection program ([`inspection-program.md`](../business/inspection-program.md)), now justified by data

---

## Locked design decisions (S9a)

- **Do NOT build the full `reports/` context.** Interest-capture is a **minimal seed** — one flag-gated `InspectionInterest` entity whose only job is to **measure demand**. The full Phase-2 `reports/` context (`InspectionRequest`, `InspectionReport`, `RubricTemplate`, PDF pipeline, inspector app) stays **betting-table-gated on the pilot's demand data** (per [ADR-0037](../../adr/0037-trust-inspection-competitive-wedge.md) + [ADR-0001](../../adr/0001-architecture.md)).
- **Trust signals are positioning + funnel, not the moat.** Verified-phone / condition / VIN are copyable — they make AutoTM *feel* trustworthy and feed the funnel. The durable moat is the **physical inspection record**, proven by the pilot.
- **Inspection booking ≠ test-drive scheduling.** The "Request inspection" flow is the inspection program — **not** the [00-vision](../00-vision.md#anti-goals-things-we-explicitly-will-not-build) test-drive anti-goal (buyer↔seller test drives).
- **The fake-door is honest.** The CTA says "coming soon"; tapping registers interest and (in the pilot) leads to a **real** inspection. No dark pattern, no charge.

## Acceptance criteria (DoD)

**S9a (remote):**
- [ ] Verified-phone badge shows on the seller block + listing card and reflects real OTP-verified state
- [ ] Condition disclosure captured in the wizard, stored, and rendered on detail; localized TK/RU/EN
- [ ] VIN history surfaced on detail via `VinDecoderPort` with an honest empty state
- [ ] "Request AutoTM inspection" CTA records `InspectionInterest` (flag-gated; disabled → 403 `FEATURE_DISABLED`); admin reads counts + willingness-to-pay
- [ ] Trust info page renders RU/TK/EN; trust framing present on home/detail/onboarding
- [ ] Inspection rubric v1 + PDF template committed under docs
- [ ] Concierge pilot runbook committed under docs
- [ ] `reports/` seed CONTEXT + listings condition/interest invariants updated in the same PR; **no full reports context built**

**S9b (on-ground — gates the wedge decision):**
- [ ] 5-10 free concierge inspections completed with rubric v1
- [ ] 3-5 case studies written
- [ ] Demand measured (interest taps, uptake, WTP) and summarized for the betting table
- [ ] Go/no-go on the Phase-2 inspection program recorded in the roadmap bet table

## Tests required

- **API e2e**: condition disclosure round-trips; inspection-interest create + admin count; flag-off returns 403 `FEATURE_DISABLED`
- **Unit (domain/application)**: condition VO validation; interest dedupe (one open interest per buyer+listing)
- **Mobile smoke**: verified badge, condition step, VIN display, request-inspection flow, trust info page, locale switch
- **Admin smoke**: inspection-interest counts visible

## Files this sprint creates / touches

```
apps/mobile/                                   # trust signals, condition step, VIN display, request-inspection CTA, trust info
apps/api/src/modules/listings/                 # condition disclosure, VIN surfacing
apps/api/src/modules/reports/                  # MINIMAL InspectionInterest seed only (flag-gated)
apps/admin/                                     # inspection-interest counts
apps/web/src/app/[locale]/                      # trust info page (RU/TK/EN)
packages/db/prisma/schema.prisma                # condition fields + InspectionInterest + migration
packages/contracts/                             # condition + interest schemas
docs/prd/business/inspection-rubric-v1.md       # rubric artifact (T6)
docs/prd/ops/87-concierge-pilot-runbook.md      # pilot runbook (T7)
```

## References

- **ADRs**: [ADR-0037](../../adr/0037-trust-inspection-competitive-wedge.md) (trust wedge — this sprint), [ADR-0027](../../adr/0027-mlp-beta-scope.md) (MLP scope), [ADR-0001](../../adr/0001-architecture.md) (`reports/` as a bounded context), [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md) (doc mutability)
- **Business**: [`inspection-program.md`](../business/inspection-program.md) (the moat; Phase 0 pilot; demand risk), [`business/README.md`](../business/README.md) (competitive landscape)
- **Roadmap**: [`../03-roadmap.md`](../03-roadmap.md) · **Vision**: [`../00-vision.md`](../00-vision.md)

## Previous-sprint dependencies

- **S8a** — S9 builds on the product-complete, localized, account-complete substrate
- The **S9b pilot shares S8b's TM-presence dependency** (founder on-ground or a trusted helper)

## No-gos

- **No full `reports/` context** (InspectionRequest/Report/Rubric/PDF/inspector app) — betting-table-gated on pilot demand
- No payment integration · no inspector hiring/ops beyond the single pilot mechanic · no tier badges on listings yet
- No multi-vertical work · no saved searches · no rich chat · no dealer showroom

## Definition of "trust wedge tested (go/no-go)"

- [ ] S9a shipped: the app reads as the verified/trustworthy option; the demand instrument is live
- [ ] S9b shipped on-ground: real inspections done; case studies + demand data in hand
- [ ] A betting-table decision recorded: **build** the Phase-2 inspection program, or **pivot** the wedge
