# reports — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). This context now contains the minimal S9a fake-door seed (`InspectionInterest`) only; the full Phase-2 reports context remains unbuilt.

## Purpose

**Phase 2 target.** AutoTM-staffed vehicle inspection reports with a 3-tier rating system. Reports are PDF-exportable, viewable on the listing, and used as the "Trusted by AutoTM" signal.

**S9a reality.** Only a flag-gated demand instrument (`InspectionInterest`) is implemented to measure inspection demand before operational spend. No reports, rubrics, PDFs, bookings, payments, inspectors, or tier badges exist.

## Owns (entities + tables)

- `InspectionInterest` — id, listingId, requesterUserId, side (`buyer` | `seller`), willingnessToPayTmt (optional int 0–10000), createdAt, updatedAt. Unique on `(listingId, requesterUserId)`. Relations: `listing` (Cascade), `requester` (Cascade). Table `inspection_interests`. Indexes on `(listingId, createdAt)` and `(requesterUserId, createdAt)`.
- `InspectionReport` — **planned only**, not in schema.
- `RubricTemplate` — **planned only**, not in schema.
- `ReportSection` — **planned only**, not in schema.
- `ReportItem` — **planned only**, not in schema.
- `PdfArtifact` — **planned only**, not in schema.

## Invariants (enforced today)

- `InspectionInterest.side` is inferred server-side: `seller` when `requesterUserId === Listing.sellerId`, otherwise `buyer`.
- `InspectionInterest` is deduped at `(listingId, requesterUserId)`. A repeated request returns the existing row (HTTP 200) and updates `willingnessToPayTmt` when supplied; no duplicate rows are created.
- `InspectionInterest` can only be created for active, non-deleted, non-banned listings. Missing/ineligible listings return `NOT_FOUND` and do not leak state.
- `willingnessToPayTmt`, when present, is an integer between 0 and 10000 inclusive.
- Suspended users are blocked from creating interest (`USER_SUSPENDED`).
- The create route is gated by `INSPECTION_INTEREST_ENABLED=false` → HTTP 403 `FORBIDDEN` with `details.reason = "FEATURE_DISABLED"`. The admin read route remains available when the flag is off.

## Invariants (planned)

- `InspectionReport.tier` is **computed** from `totalScore` against fixed bands — never editable directly
- `InspectionReport.publishedAt` is null until admin reviews and approves
- A `Listing` can have at most one *published* `InspectionReport`. Re-inspection creates a new report; old report archived but kept for history.
- `PdfArtifact` is regenerated on every publish event — old PDFs preserved with version increments

## Tier computation (planned)

```
totalScore  >=  85  →  Tier 1 (Gold, "Trusted by AutoTM")
totalScore  >=  65  →  Tier 2 (Silver, "Inspected")
totalScore  >=  40  →  Tier 3 (Bronze, "Basic check")
totalScore  <   40  →  No tier (not eligible)
```

Bands fixed in code; rubric weights are data (admin-editable).

## Anti-pay-for-placement guarantee

- Default feed sort is recency (chronological) — **not** by tier
- Tier is a **filter** ("Show only Trusted by AutoTM cars") — opt-in
- The UI explicitly shows the sort label so users see "Sort: newest" — full transparency

## Ports exposed (planned)

```ts
interface ReportsReadPort {
  getReportSummary(listingId): Promise<{ tier, publishedAt, pdfUrl? } | null>
}
```

## Ports consumed (today)

- `ListingsReadPort` (`LISTINGS_READ_PORT`) from `listings/` — used by `CreateInspectionInterest` to validate listing eligibility and infer seller ownership.
- `IdentityReadPort` (`IDENTITY_READ_PORT`) from `identity/` — used by `CreateInspectionInterest` to check requester suspension state.

## Ports consumed (planned)

```ts
ListingsReadPort
IdentityReadPort
MediaStoragePort   // PDFs and inspection photos
```

## Events emitted (planned)

- `InspectionReportPublished` → adds tier badge to listing, fires push to listing owner
- `InspectionReportSuperseded` → on re-inspection

## HTTP routes (today)

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/api/v1/listings/:id/inspection-interest` | Required | `CreateInspectionInterest` — records buyer/seller interest; dedupes; gated by `INSPECTION_INTEREST_ENABLED` |
| GET | `/api/v1/admin/inspection-interests` | AdminGuard | `ListInspectionInterestStats` — aggregate counts + willingness-to-pay by listing |

## PDF generation (planned)

- Server-side via Puppeteer (Chromium headless) rendering an HTML template
- Same template renders to admin preview AND PDF artifact
- Stored in MinIO `inspection-reports` bucket with versioned key

## Notable decisions

- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Reports is its own context
- [ADR-0037](../../../../docs/adr/0037-trust-inspection-competitive-wedge.md) — Trust/inspection pulled forward as wedge
- S9a implements only the `InspectionInterest` fake-door; full Phase-2 context remains betting-table-gated on pilot demand

## Outstanding questions for Phase 2

- Final rubric: which sections, which items, which weights — needs sign-off from a real mechanic
- Pricing model: free for sellers? paid per inspection? subsidized?
- Inspector hiring / training / SLA
