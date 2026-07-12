# reports — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). This context now contains the minimal S9a fake-door seed (`InspectionInterest`) only; the full Phase-2 reports context remains unbuilt.

## Purpose

Measure inspection demand before operational spend. Today this context contains only the S9a flag-gated fake-door seed (`InspectionInterest`).

No inspection reports, rubrics, PDFs, bookings, payments, inspectors, tier badges, or listing-tier filters exist in code today.

## Owns (entities + tables)

- `InspectionInterest` — id, listingId, requesterUserId, side (`buyer` | `seller`), willingnessToPayTmt (optional int 0–10000), createdAt, updatedAt. Unique on `(listingId, requesterUserId)`. Relations: `listing` (Cascade), `requester` (Cascade). Table `inspection_interests`. Indexes on `(listingId, createdAt)` and `(requesterUserId, createdAt)`.

## Invariants (enforced today)

- `InspectionInterest.side` is inferred server-side: `seller` when `requesterUserId === Listing.sellerId`, otherwise `buyer`.
- `InspectionInterest` is deduped at `(listingId, requesterUserId)`. A repeated request returns the existing row (HTTP 200) and updates `willingnessToPayTmt` when supplied; no duplicate rows are created.
- `InspectionInterest` can only be created for active, non-deleted, non-banned listings. Missing/ineligible listings return `NOT_FOUND` and do not leak state.
- `willingnessToPayTmt`, when present, is an integer between 0 and 10000 inclusive.
- Suspended users are blocked from creating interest (`USER_SUSPENDED`).
- The create route is gated by `INSPECTION_INTEREST_ENABLED=false` → HTTP 403 `FORBIDDEN` with `details.reason = "FEATURE_DISABLED"`. The admin read route remains available when the flag is off.

## Module shape (today)

- `domain/InspectionInterest.ts` — demand-interest entity and willingness-to-pay bounds.
- `domain/types.ts` — reports-domain error codes.
- `domain/ports/InspectionInterestRepository.ts` — repository port for save, update, lookup, and aggregate stats.
- `application/CreateInspectionInterest.ts` — authenticated interest creation; validates requester, listing eligibility, side inference, dedupe, and willingness-to-pay.
- `application/ListInspectionInterestStats.ts` — admin aggregate read model with offset pagination.
- `infrastructure/PrismaInspectionInterestRepository.ts` — Prisma persistence adapter.
- `presentation/reports.controller.ts` — public create route plus admin aggregate route.
- `reports.module.ts` — imports `ListingsModule` and `IdentityModule`, registers the repository and two use-cases.

## Ports exposed (today)

- (none)

## Ports consumed (today)

- `ListingsReadPort` (`LISTINGS_READ_PORT`) from `listings/` — used by `CreateInspectionInterest` to validate listing eligibility and infer seller ownership.
- `IdentityReadPort` (`IDENTITY_READ_PORT`) from `identity/` — used by `CreateInspectionInterest` to check requester suspension state.

## Events emitted (today)

- (none)

## HTTP routes (today)

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/api/v1/listings/:id/inspection-interest` | Required | `CreateInspectionInterest` — records buyer/seller interest; dedupes; gated by `INSPECTION_INTEREST_ENABLED` |
| GET | `/api/v1/admin/inspection-interests` | AdminGuard | `ListInspectionInterestStats` — aggregate counts + willingness-to-pay by listing |

## Notable decisions

- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Reports is its own context
- [ADR-0037](../../../../../docs/adr/0037-trust-inspection-competitive-wedge.md) — Trust/inspection pulled forward as wedge
- S9a implements only the `InspectionInterest` fake-door; full Phase-2 context remains betting-table-gated on pilot demand

## Planned additions (not implemented)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), these items are not current state. Their target shape belongs in the future inspection/report PRD, [ADR-0037](../../../../../docs/adr/0037-trust-inspection-competitive-wedge.md), and [`docs/prd/business/inspection-program.md`](../../../../../docs/prd/business/inspection-program.md).

- Full inspection-report context (`InspectionReport`, `RubricTemplate`, `ReportSection`, `ReportItem`, `PdfArtifact`) remains betting-table-gated on pilot demand.
- Report tier computation, PDF generation, report-published events, listing trust-tier filters, and anti-pay-for-placement UI rules are future work.
- Pricing model, inspector hiring/training/SLA, and final rubric weights require a later product/ops decision.

## Outstanding questions for S9b / Phase 2

- Final rubric: which sections, which items, which weights — needs sign-off from a real mechanic
- Pricing model: free for sellers? paid per inspection? subsidized?
- Inspector hiring / training / SLA
