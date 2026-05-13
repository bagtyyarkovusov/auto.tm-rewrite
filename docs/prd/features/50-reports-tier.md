# 50 — Inspection reports + 3-tier system (Phase 2)

## Summary

**Phase 2.** AutoTM-staffed inspectors visit cars, fill in a rubric, and the system computes a 3-tier rating (Gold / Silver / Bronze). The tier appears as a badge on the listing. Reports are downloadable as PDF.

## Why it exists

The single biggest differentiator vs. "anyone-can-list" marketplaces. Maral (first-time buyer) is afraid of getting scammed — a "Trusted by AutoTM" badge is what makes her commit to a contact. Without the trust layer, AutoTM is a slightly nicer auto.ru clone.

## Critical preconditions (must be true BEFORE building this)

This feature cannot ship without operational work that takes weeks:

1. **Rubric defined and signed off by a real mechanic** — what categories, what items, what weights
2. **1-2 inspectors hired** — physical humans who drive to cars
3. **Sample inspections done** as quality control
4. **Pricing model decided** — free for sellers (AutoTM eats cost) / paid by seller / subsidized?
5. **Inspector workflow** — assignment, scheduling, dispatch, completion

If those aren't ready, **don't build the software yet** — you'll have an empty admin panel and a meaningless badge.

## What it does (user-visible behavior — proposed)

### Inspector workflow (admin web)

1. Admin assigns a listing to an inspector (queue: `apps/admin/reports`)
2. Inspector visits car (off-platform — this is real-world ops)
3. Inspector returns to office (or uses tablet on-site), opens the report draft
4. Fills in rubric: per section, per item — score (0-N) + notes + photos
5. Saves draft; can resume later
6. Submits for admin review
7. Admin reviews; publishes or asks for revision
8. On publish: PDF generated, badge appears on listing, owner notified

### Tier computation

Fixed bands, **never editable directly**:

```
totalScore ≥ 85  →  Tier 1 (Gold, "Trusted by AutoTM")
totalScore ≥ 65  →  Tier 2 (Silver, "Inspected")
totalScore ≥ 40  →  Tier 3 (Bronze, "Basic check")
totalScore < 40  →  No tier (not eligible for badge)
```

The rubric items contribute scaled scores; weights configured per rubric version. Admin can update the rubric template; tier formula stays the same.

### Buyer-facing display

- Listing detail page: tier badge near price + "View report" link
- Tap report → opens PDF preview in app (or downloads on web)
- Report includes: tier, inspector name, inspection date, per-section scores, item details with photos, notes
- Filter in feed: "Show only Trusted by AutoTM cars" — opt-in filter
- **Default sort is NEVER by tier** — recency only, with sort label visible

### Anti-pay-for-placement guarantee

- Tier is **computed from inspection score**, not editable by admins or sellers
- Tier is a **filter**, not a default sort — sellers can't pay to be first
- The UI explicitly shows "Sort: newest" so users see what's ranking
- Sellers cannot decline a report after it's published — full transparency

### Re-inspection

- A seller can request re-inspection (e.g., after fixing something flagged)
- New report supersedes old; old is archived but kept for history
- New PDF generated

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Listing | Has Gold tier | Gold badge + "Trusted by AutoTM" label + report link |
| Listing | Has Silver tier | Silver badge |
| Listing | Has Bronze tier | Bronze badge |
| Listing | No tier (uninspected) | No badge (NOT "untrusted" label — that would be misleading) |
| Listing detail (with report) | "View inspection report" button | Tap → PDF preview |
| PDF preview | Default | Native PDF viewer or in-app rendered |
| Inspector view (admin) | Assignment queue | List of cars to inspect, scheduled date |
| Inspector view (admin) | Filling report | Section-by-section walkthrough; auto-save |
| Inspector view (admin) | Submitting for review | Confirmation: "Submit for admin review?" |

## Data references

- `apps/api/src/modules/reports/CONTEXT.md`
- Entities (Phase 2): `InspectionReport`, `RubricTemplate`, `ReportSection`, `ReportItem`, `PdfArtifact`

## Decisions

- [ADR-0001](../../adr/0001-architecture.md) — Reports as bounded context
- Tier is computed, not editable — central trust guarantee

## Phase

**Phase 2.**

## Out of scope (Phase 2)

- User-paid premium inspections (Phase 3+)
- Third-party inspectors (only AutoTM-employed for MVP)
- Automated photo analysis (defect detection via ML) — interesting but defer
- Pre-purchase advice tool ("ask an inspector for advice") — separate product

## Open questions (resolve before Phase 2 build)

- Exact rubric structure (categories, items, weights) — needs mechanic sign-off
- Inspection price (free? subsidized? per-tier different pricing?)
- Inspector compensation structure
- SLA for inspection turnaround (24h? 72h?)
- Re-inspection charge (free or paid?)
- Inspection scheduling — calendar integration or simple list?
