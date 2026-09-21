# ADR-0053: Defer VIN decoding until a real decoder exists

- **Status**: Accepted
- **Date**: 2026-09-22
- **Deciders**: AutoTM founder
- **Amends**: the "VIN history via the existing `VinDecoderPort`" trust signal of [ADR-0037](0037-trust-inspection-competitive-wedge.md). The rest of ADR-0037 remains in force.

## Context

ADR-0037 listed VIN history as one of AutoTM's software trust signals. Sprint 9a added a "VIN history" section to Listing detail. When a Listing has a VIN, `GetListingDetail` calls `VinDecoderPort.decode` at read time and returns `vinHistory`. The mobile app shows the decoded brand, model, year, body type, engine type and a confidence percentage. Otherwise it shows "not decoded".

The only adapter behind the port is `NullVinDecoder`, which always returns `{ decoded: false }`. So on every environment, the section only ever says the VIN was not decoded. A real decoder would need an outside data source. In Turkmenistan that means a new egress point, which needs its own ADR. No source is chosen for the reviewer-only Google Play release.

In [Prototype listing card and Listing detail content](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351), the founder approved a detail screen without this section, for two reasons:

- A permanently empty block adds length and no information.
- A block titled "VIN history" suggests a vehicle-history report. The approved screen map rules out history-report blocks. Auto.ru's VIN history comes from official registers that AutoTM does not have (AR-11-005, AR-11-006).

The founder chose to defer VIN decoding rather than delete it. The existing port is the seam a real decoder will plug into.

## Decision

**VIN decoding is deferred for the release. Its code stays, and buyers do not see an empty section.**

- **The backend stays as it is:** `VinDecoderPort`, `NullVinDecoder` as the bound adapter, the read-time decode in `GetListingDetail`, and `vinHistory` / `VinHistorySchema` in `@auto-tm/contracts`.
- **Mobile Listing detail renders the section only when `vinHistory.decoded` is `true`.** The "VIN not provided" and "VIN not decoded" empty states are no longer shown. With `NullVinDecoder`, the section never appears.
- **The VIN itself is still shown as a Specifications row** when the seller entered one, and it stays locked after publish.
- **A real decoder needs a new ADR** before any adapter replaces `NullVinDecoder`. That ADR names the data source and its egress (air-gap rules, ADR-0005 and ADR-0039), sets the section's title and wording so it does not read as a history report, and says whether decoding happens at read time or when the Listing is published.

## Consequences

### Positive

- Listing detail loses a block that was always empty, and buyers are not led to expect a history report.
- Adding a real decoder later means a new adapter plus the ADR. The contract, use-case and mobile section already exist.

### Negative / accepted costs

- One of ADR-0037's software trust signals is inactive for the release. Until inspection or a decoder exists, the active signals are "Phone verified", the seller-stated condition ([ADR-0052](0052-seller-condition-disclosure-is-damaged-plus-known-issues.md)), and reporting.
- `GetListingDetail` still calls the null decoder on each read. The cost is negligible, and it keeps the seam exercised by tests.
- The mobile section and its translations are kept but hidden. Tests must still cover the decoded case, so the code doesn't rot.

### Neutral

- VIN capture in the Sell wizard does not change.
- The later `TmProxyVinDecoder` idea in the API listings CONTEXT.md is the kind of adapter the new ADR would authorize.

## Alternatives considered

- **Keep showing the section with its "not decoded" state.** Rejected. It always shows the same empty answer and reads like a history report.
- **Delete the port, adapter, contract field and section.** Rejected by the founder. The code is small, tested and works, and deleting it means rebuilding the same seam when a decoder arrives.
- **Build a real decoder now.** Rejected. It needs an outside data source and new egress, which is work beyond the reviewer-only release.

## References

- [ADR-0037](0037-trust-inspection-competitive-wedge.md)
- [ADR-0052](0052-seller-condition-disclosure-is-damaged-plus-known-issues.md)
- [ADR-0051](0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md)
- [ADR-0005](0005-hosting.md) and [ADR-0039](0039-phased-cloud-first-hosting.md)
- [ADR-0020](0020-document-hierarchy-and-mutability.md)
- [Prototype listing card and Listing detail content](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351) and its [resolution](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351#issuecomment-5761811759)
- [API listings current state](../../apps/api/src/modules/listings/CONTEXT.md)
