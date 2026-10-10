# ADR-0095: Listing detail drops the SMS verification caption

- **Status**: Accepted
- **Date**: 2026-10-11
- **Deciders**: AutoTM founder, who asked for the removal after a simulator test on 2026-10-11 (batch [PR #810](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/810))
- **Supersedes**: one line of [ADR-0056](0056-listing-contact-phones-are-verified.md), "Listing detail shows one caption by the Call button saying that AutoTM verifies sellers' numbers by SMS". The rest of ADR-0056 stays in force, including the trust page.

## Context

ADR-0056 put a caption under Call and Message on Listing detail ("Carberk verifies sellers' numbers by SMS") so buyers would know contact phones are verified. In the founder's simulator test it read as filler under the contact buttons, and with the buttons becoming floating glass capsules (#808) a line of text under them sits over scrolling content.

## Decision

**Listing detail shows no caption under its contact buttons.** Contact phones are still verified by SMS exactly as ADR-0056 decides, and the public trust page still explains it. The caption and its three translations are removed.

## Consequences

- The contact bar is two buttons and nothing else, on detail and in the photo viewer.
- Buyers learn about phone verification from the trust page only, not from each Listing.
- A later trust signal on detail needs its own decision.

## References

- [ADR-0056](0056-listing-contact-phones-are-verified.md), [PRD 32 Listings](../prd/features/32-listings.md), [issue #808](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/808)
