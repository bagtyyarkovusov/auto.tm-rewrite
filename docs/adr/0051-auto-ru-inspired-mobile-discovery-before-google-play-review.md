# ADR-0051: Auto.ru-inspired mobile discovery before Google Play review

- **Status**: Accepted
- **Date**: 2026-09-21
- **Deciders**: AutoTM founder
- **Supersedes**: [ADR-0034](0034-kolesa-ux-findability-reference.md) for mobile home, search, filters, and results; the conflicting browse-route clauses of [ADR-0035](0035-multi-vertical-platform-direction.md)

## Context

ADR-0034 chose Kolesa as AutoTM's UX and findability reference. AutoTM subsequently built a chronological Search feed with a filter sheet, brand/model pickers, and a live result count. The founder's review of saved Auto.ru and Kolesa screens raised a different preference for the release: a home feed with an immediate brand/model search entry, followed by a clearly separate filtered-results screen.

This changes a locked product decision. It must be recorded before revising the search specification or mobile navigation. The Google Play release is reviewer-only, so the changed journey also needs device testing before it becomes a release requirement.

## Decision

**Auto.ru becomes the structural reference for AutoTM's mobile discovery journey before Google Play release.** Home presents recent listings and a prominent brand/model search entry. Buyers can search or select a brand and model, refine other filters, and apply them to a distinct results screen. That screen shows the result count, active filters, a way to edit them, and listing cards. Returning from a listing preserves the results and scroll position.

This supersedes ADR-0034's Kolesa-based home and browse guidance, and ADR-0035's conflicting prescription for the browse route. ADR-0035's cars-first, future multi-vertical direction remains in force. The five-tab navigation, anonymous browsing, AutoTM design tokens, and ban on paid placement remain unchanged. Auto.ru is a reference for the journey, not a visual template or a feature list.

The release home uses **new listings**, which the existing chronological feed supports. A personalized "Recommended for you" ranking is **not authorized by this ADR**; it requires its own capability decision, specification, and evidence that it improves discovery.

## Consequences

### Positive

- Brand/model search becomes obvious on first open.
- Filtered results have a clear destination and can retain their state when a buyer views a listing.
- The release can test one coherent buyer journey instead of treating screenshots as proof of usability.

### Negative / accepted costs

- Search navigation and its UI tests must change before the release build.
- The added work may move the release date; it must be planned explicitly rather than silently added to the locked Sprint 11 plan.
- Existing Kolesa-oriented guidance in mutable docs and agent instructions needs reconciliation. The accepted ADR-0034 itself remains unchanged.

### Neutral

- Favorites, chat, and Profile still need their own device QA. This decision does not claim those screens are ready.
- No other vehicle categories, saved searches, or recommendation algorithm are added.

## Alternatives considered

- **Keep the current Kolesa-based browse journey.** Rejected because the founder wants brand/model search and a distinct results destination to lead discovery.
- **Copy Auto.ru's full appearance and feature set.** Rejected because AutoTM retains its own identity and cars-only release scope.
- **Build personalization in the same release change.** Rejected because it adds ranking, data, and evaluation work beyond the navigation decision.

## References

- [ADR-0034](0034-kolesa-ux-findability-reference.md)
- [ADR-0035](0035-multi-vertical-platform-direction.md)
- [ADR-0020](0020-document-hierarchy-and-mutability.md)
- [Search and discovery PRD](../prd/features/33-search-discovery.md)
- [Mobile current state](../../apps/mobile/src/listings/CONTEXT.md)
