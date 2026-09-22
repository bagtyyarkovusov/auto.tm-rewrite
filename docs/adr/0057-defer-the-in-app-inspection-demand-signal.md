# ADR-0057: Defer the in-app inspection demand signal

- **Status**: Proposed
- **Date**: 2026-09-22
- **Deciders**: AutoTM founder
- **Amends**: the "instrument demand before building ops" decision (decision 4, and its mention in decision 5) of [ADR-0037](0037-trust-inspection-competitive-wedge.md). The rest of ADR-0037 remains in force.

## Context

ADR-0037 decision 4 required a "Request AutoTM inspection (coming soon)" interest signal on the listing surface. Its job was to measure inspection demand before any operational spend. Sprint 9a shipped it as task T4:

- **Listing detail:** `InspectionInterestCta` shows the call-to-action on active Listings. It opens a sheet with "coming soon" copy and an optional willingness-to-pay amount. Signed-out visitors must sign in first.
- **After publishing:** the Sell wizard opens the new Listing with `?inspectionInterest=1`, which opens the same sheet automatically for the seller.
- **API:** each submission is saved as an `InspectionInterest` record, but only when `INSPECTION_INTEREST_ENABLED` is on. The flag defaults to `false`, and `GET /api/v1/config` reports it to the app. When it is off, the app still shows the button, disabled, with "inspection temporarily unavailable".
- **Admin:** a page shows the counts.

In [Prototype listing card and Listing detail content](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351), the founder approved a Listing detail screen without this call-to-action. [Reconcile the discovery PRD and Kolesa guidance with ADR-0051](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/358) made that removal an acceptance criterion. The same review amended ADR-0037's other signals in [ADR-0052](0052-seller-condition-disclosure-is-damaged-plus-known-issues.md) and [ADR-0053](0053-defer-vin-decoding-until-a-real-decoder-exists.md). Decision 4 still stands, so the approved design contradicts an accepted ADR.

Measuring demand in the app is not possible for now:

- The Google Play build is for reviewers only. No real buyers or sellers use it, so taps would measure nothing.
- The concierge pilot (S9b) is deferred until someone is on the ground in Turkmenistan. When it runs, it measures demand directly from real buyers, sellers and inspections.

## Decision

**The mobile app shows no inspection demand signal for the release. The pilot measures demand directly.**

- **No inspection call-to-action anywhere in the app.** Listing detail does not render it, and publishing no longer opens the inspection-interest sheet. No other screen gets one, including Cabinet and the trust page.
- **The code stays, unused.** The mobile component and hook stay in the codebase with their tests but are not rendered. The API route, the `InspectionInterest` model and the admin page also stay. `INSPECTION_INTEREST_ENABLED` stays `false` in every environment.
- **The concierge pilot measures demand** through buyer offers made, seller acceptances and inspections completed ([concierge pilot runbook](../prd/ops/87-concierge-pilot-runbook.md)). The runbook no longer counts fake-door taps.
- **Adding back any in-app demand signal needs a new ADR.** It must name the placement, the copy, and what the signal measures, and there must be real Users for it to measure.

## Consequences

### Positive

- Listing detail matches the approved design, and ADR-0037 no longer contradicts it.
- Reviewers no longer see a button, live or disabled, for a service that does not exist yet.
- Returning the signal later means rendering existing, tested code, once its ADR is accepted.

### Negative / accepted costs

- The pilot has no in-app baseline to compare against. Demand evidence comes only from the pilot's 5-10 inspections, which is qualitative and small.
- Unused mobile code and its tests must be kept compiling.
- This is the third ADR-0037 software trust signal narrowed for the release, after ADR-0052 and ADR-0053. Inspection stays AutoTM's intended edge, but the release build does not advertise it.

### Neutral

- The `InspectionInterest` table and its admin page stay readable. Any existing rows are left alone.
- Removing the call-to-action and the post-publish prompt from mobile belongs to the Listing detail implementation slice, not to this ADR.

## Alternatives considered

- **Keep the call-to-action on Listing detail.** Rejected. The approved design removed it, and with no real Users it measures nothing.
- **Move it to Cabinet or the trust page.** Rejected for the release for the same reason: reviewers are not buyers. Reconsider once real Users exist.
- **Keep only the seller prompt after publishing.** Rejected. It measures seller-side interest from the same reviewer-only audience and leaves an inspection pitch in the Sell flow.
- **Delete the code, table and admin page.** Rejected. They are small and tested, and deleting them means rebuilding the same seam when the signal returns.

## References

- [ADR-0037](0037-trust-inspection-competitive-wedge.md)
- [ADR-0051](0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md), [ADR-0052](0052-seller-condition-disclosure-is-damaged-plus-known-issues.md), [ADR-0053](0053-defer-vin-decoding-until-a-real-decoder-exists.md)
- [ADR-0020](0020-document-hierarchy-and-mutability.md)
- [Prototype listing card and Listing detail content](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351) and its [resolution](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351#issuecomment-5761811759)
- [Sprint 9 — Trust wedge](../prd/sprints/sprint-09-trust-wedge.md) (task T4)
- [Concierge pilot runbook](../prd/ops/87-concierge-pilot-runbook.md)
- [Listings PRD](../prd/features/32-listings.md)
