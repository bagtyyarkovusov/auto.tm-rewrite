# ADR-0023: First-party product analytics for MVP

- **Status**: Accepted
- **Date**: 2026-05-18
- **Deciders**: AutoTM founder + AI architect

## Context

AutoTM needs launch analytics to understand whether the marketplace is working: buyers finding listings, sellers publishing successfully, OTP/uploads staying reliable, dealers responding, and city-level supply matching city-level demand.

The team considered using an external product analytics tool such as PostHog, Mixpanel, Google Analytics, or Firebase Analytics. Those tools would be faster to start, but they conflict with the MVP privacy and infrastructure posture:

- AutoTM already favors self-hosted observability for air-gapped / TM-local operations.
- The Privacy Policy plan says there are no analytics cookies and no third-party advertising SDKs in MVP.
- Marketplace analytics need domain events, not generic pageview tracking.
- City-first location policy bans raw GPS storage for MVP analytics.
- Admin dashboard needs operational aggregates, not a marketing dashboard.

## Decision

AutoTM uses first-party product analytics for MVP.

MVP clients and backend services may emit product events to AutoTM's own API. The API validates and stores raw events in AutoTM-owned storage. Worker jobs roll raw events into aggregate metrics for the admin dashboard and launch reviews.

MVP does not include third-party analytics SDKs, third-party analytics cookies, session replay, advertising identifiers, raw GPS analytics, contact-book collection, or keystroke tracking.

The MVP event set is limited to product-health and marketplace-health events:

- auth reliability;
- listing creation and publish funnel;
- listing views;
- search/filter/saved-search behavior;
- favorites;
- call/chat starts;
- notification delivery/open behavior;
- moderation reports and admin actions;
- city-level supply/demand aggregates.

Raw events are retained short term for launch debugging and funnel analysis. Aggregates are retained longer for planning.

## Consequences

### Positive

- Keeps launch analytics aligned with the privacy policy and app-store disclosures.
- Avoids vendor lock-in and external data-sharing risk.
- Fits the TM-local hosting posture.
- Gives the admin dashboard metrics that map directly to AutoTM's marketplace model.
- Preserves city-level analysis without collecting raw GPS.

### Negative / accepted costs

- More engineering work than dropping in an SDK.
- Less out-of-the-box funnel/cohort tooling in MVP.
- The team must define and maintain the event taxonomy.
- Dashboard work is required before launch instead of being outsourced to a SaaS UI.

### Neutral

- Future BI exports remain possible if they use first-party data.
- External tools can be reconsidered later for aggregate-only reporting, but raw MVP product events stay owned by AutoTM unless a future ADR changes this.

## Alternatives considered

- **PostHog self-hosted.** Rejected for MVP because it still adds a large analytics subsystem before product-market signals justify it. Revisit if first-party analytics become too costly.
- **Mixpanel / Amplitude / Google Analytics / Firebase Analytics.** Rejected for MVP due third-party data sharing, app-store disclosure complexity, and mismatch with TM-local privacy posture.
- **Only Prometheus/Grafana operational metrics.** Rejected because infrastructure metrics cannot answer marketplace questions like city demand, listing conversion, or seller response.
- **No analytics until after launch.** Rejected because launch decisions would be anecdotal and slow.

## References

- [ADR-0010](0010-testing-obs.md) - Testing and observability stack
- [ADR-0022](0022-city-first-listing-location.md) - City-first listing location
- `docs/prd/ops/85-launch-analytics-plan.md` - Launch analytics and scaling plan
- `docs/prd/features/40-admin.md` - Admin dashboard target capability
- `docs/prd/ops/83-legal.md` - Privacy Policy data collection boundary
