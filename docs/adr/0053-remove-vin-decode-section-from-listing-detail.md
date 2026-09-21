# ADR-0053: Remove the VIN decode section from Listing detail

- **Status**: Accepted
- **Date**: 2026-09-21
- **Deciders**: AutoTM founder
- **Amends**: the "VIN history via the existing `VinDecoderPort`" trust signal of [ADR-0037](0037-trust-inspection-competitive-wedge.md). The rest of ADR-0037 remains in force.

## Context

ADR-0037 listed VIN history as one of AutoTM's software trust signals. Sprint 9a added a "VIN history" section to Listing detail. When a Listing has a VIN, `GetListingDetail` calls `VinDecoderPort.decode` at read time and returns `vinHistory`. The mobile app shows the decoded brand, model, year, body type, engine type and a confidence percentage, or "not decoded".

The only adapter behind the port is `NullVinDecoder`, which always returns `{ decoded: false }`. On every environment, the section only ever says the VIN was not decoded. No other use-case calls the port. A real decoder would need an outside data source, which in Turkmenistan means a new egress point, and that needs its own ADR. Nothing of the kind is planned for the reviewer-only Google Play release.

In [Prototype listing card and Listing detail content](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351), the founder approved a detail screen without this section. There were two reasons:

- A permanently empty block adds length and no information.
- A section titled "VIN history" suggests a vehicle-history report. The approved screen map rules out history-report blocks. Auto.ru's VIN history comes from official registers that AutoTM does not have (AR-11-005, AR-11-006).

## Decision

**Listing detail has no VIN decode or VIN history section.** The VIN the seller enters is still stored and shown as a row in Specifications, and it stays locked after publish.

Remove from the code:

- the section and its translations from the mobile Listing detail screen;
- `vinHistory` and `VinHistorySchema` from `@auto-tm/contracts`;
- the read-time decode from `GetListingDetail`;
- `VinDecoderPort` and `NullVinDecoder`, which have no other consumer.

Any future VIN decoding or vehicle history needs a new ADR. It would name the data source and its egress, and say where the result appears.

## Consequences

### Positive

- Listing detail loses a block that was always empty.
- Buyers are no longer led to expect a vehicle-history report AutoTM cannot provide.
- `GetListingDetail` no longer makes a decode call on every read, and one unused port and adapter go away.

### Negative / accepted costs

- One of ADR-0037's listed software trust signals is withdrawn. Until inspection exists, the remaining signals are "Phone verified", the seller-stated condition ([ADR-0052](0052-seller-condition-disclosure-is-damaged-plus-known-issues.md)), and reporting.
- Contract, API, mobile, i18n and CONTEXT.md changes must land together, because the mobile app parses the detail response with the contract schema.

### Neutral

- VIN capture in the Sell wizard and its lock after publish do not change.
- The Trust bet's later `TmProxyVinDecoder` idea, noted in the API listings CONTEXT.md, returns only through a new ADR.

## Alternatives considered

- **Keep the section with its "not decoded" state.** Rejected because it always shows the same empty answer and reads like a history report.
- **Remove the section but keep the port and null adapter for later.** Rejected because a port with no consumer is dead code, and a future decoder needs its own design and ADR anyway.
- **Build a real decoder now.** Rejected because it needs an outside data source, new egress, and work beyond the reviewer-only release.

## References

- [ADR-0037](0037-trust-inspection-competitive-wedge.md)
- [ADR-0052](0052-seller-condition-disclosure-is-damaged-plus-known-issues.md)
- [ADR-0051](0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md)
- [ADR-0020](0020-document-hierarchy-and-mutability.md)
- [Prototype listing card and Listing detail content](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351) and its [resolution](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351#issuecomment-5761811759)
- [API listings current state](../../apps/api/src/modules/listings/CONTEXT.md)
