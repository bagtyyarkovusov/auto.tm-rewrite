# reports — CONTEXT

> **Trust-bet context. Stubbed in the MLP beta** per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md): nothing in this file is in code today; everything described is planned work. The "planned" markers below explicitly signal the future state. Real work begins only after a post-MLP trust bet is shaped.

## Purpose

**Phase 2.** AutoTM-staffed vehicle inspection reports with a 3-tier rating system. Reports are PDF-exportable, viewable on the listing, and used as the "Trusted by AutoTM" signal.

## Owns (entities + tables — planned, NOT in schema today)

- `InspectionReport` — id, listingId, inspectorUserId, publishedAt?, tier (1 / 2 / 3), totalScore, scoresByCategory (JSON), notes, deletedAt?
- `RubricTemplate` — id, version, name, sections (JSON), maxScore — admin-edited template; multiple versions over time
- `ReportSection` — id, reportId, name, weight, score, notes?
- `ReportItem` — id, sectionId, name, score, notes?, photoUrls (string[])
- `PdfArtifact` — id, reportId, version, key (MinIO object), generatedAt

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

## Ports consumed (planned)

```ts
ListingsReadPort
IdentityReadPort
MediaStoragePort   // PDFs and inspection photos
```

## Events emitted (planned)

- `InspectionReportPublished` → adds tier badge to listing, fires push to listing owner
- `InspectionReportSuperseded` → on re-inspection

## PDF generation (planned)

- Server-side via Puppeteer (Chromium headless) rendering an HTML template
- Same template renders to admin preview AND PDF artifact
- Stored in MinIO `inspection-reports` bucket with versioned key

## Notable decisions

- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Reports is its own context
- Phase 2 — depends on operational inspection rubric being defined first

## Outstanding questions for Phase 2

- Final rubric: which sections, which items, which weights — needs sign-off from a real mechanic
- Pricing model: free for sellers? paid per inspection? subsidized?
- Inspector hiring / training / SLA
