# ADR-0024: Owner post-publish photo editing

- **Status**: Accepted
- **Date**: 2026-05-21
- **Deciders**: AutoTM founder + AI architect

## Context

AutoTM's listing API already exposes owner-scoped media operations (`AttachMedia`, `RemoveMedia`, `ReorderMedia`), and the product PRD says owners can update photo order and add/remove photos after publishing. The current mobile edit route is read-only for photos, which created ambiguity about whether photos are locked like VIN, brand, model, generation, and year.

The trade-off is seller correction versus listing identity and trust. Sellers need to fix bad photos, add missing angles, and reorder the cover photo without recreating a listing. In Phase 1, there is no inspection tier or photo trust badge to invalidate, and moderation is reactive.

## Decision

Owners may add, remove, and reorder listing photos after a listing is published in Phase 1.

Post-publish locked identity fields are limited to `vin`, `brandId`, `modelId`, `generationId`, and `year`. Photos are not identity-locked. The first photo remains the cover, so reordering photos changes the cover.

The current mobile read-only photo step is an implementation gap, not the product contract. Mobile edit mode should support the same owner media operations as the API: add photos, remove photos, retry failed uploads, and reorder photos.

Photo edits in edit mode are staged locally and become public only after **Save changes** succeeds. Buyers keep seeing the previous published photo set while the seller is editing. New photos may upload to unreferenced storage during the edit session for responsiveness, but `AttachMedia`, `RemoveMedia`, and `ReorderMedia` are applied to the listing only during the final save operation.

If a seller abandons an edit session after new photo uploads, the client should clean up local staging on explicit cancel/discard and best-effort delete or mark any newly uploaded, unattached media for cleanup when the storage/API surface supports it. Any remaining uploaded object without a `ListingMedia` row is a storage orphan, not public listing media, and must be covered by server-side orphan cleanup.

Phase 1 photo edits do not trigger pre-publication review, listing unpublish, or trust-tier invalidation. Phase 2 trust/inspection work may add re-review rules for large photo changes or inspected listings.

## Consequences

### Positive

- Sellers can correct photo mistakes without deleting and recreating listings.
- The mobile target behavior matches existing API media use-cases.
- Cover-photo changes stay simple: reorder the photo list.

### Negative / accepted costs

- Mobile edit mode needs upload staging for published-listing media, not only create-draft media.
- Final-save media orchestration is more complex than applying each media operation immediately.
- New photos uploaded during an abandoned edit session need client cancel cleanup and server-side orphan cleanup if they were never attached.
- Later trust-tier work must define which photo edits invalidate inspection claims.

### Neutral

- VIN, brand, model, generation, and year remain locked after publish.
- Admin moderation and Phase 2 classifiers can still review or restrict media later without changing the Phase 1 owner-edit contract.

## Alternatives considered

- **Keep photos immutable after publish.** Rejected because it forces sellers to recreate listings for common corrections and contradicts the API media surface already shipped.
- **Allow only reordering, not add/remove.** Rejected because missing or bad photos are as common as bad cover order.
- **Apply each photo edit immediately.** Rejected because buyers could see half-finished photo sets while the seller is still editing the live listing.
- **Upload new edit photos only on Save.** Rejected because it makes final save slower and discards the responsiveness of the existing upload-while-editing media architecture.
- **Send all photo edits to review in Phase 1.** Rejected because Phase 1 has reactive moderation only; pre-review is a Phase 2 trust/moderation concern.

## References

- [ADR-0019](0019-context-md-describes-current-state.md) - CONTEXT.md describes current implemented state, not aspirational spec
- [ADR-0020](0020-document-hierarchy-and-mutability.md) - Document hierarchy and mutability rules
- [ADR-0008](0008-media.md) - Media upload + serving pipeline
- `docs/prd/features/32-listings.md` - listing target capability
- `apps/api/src/modules/listings/CONTEXT.md` - current media use-cases and routes
- `apps/mobile/CONTEXT.md` - current mobile edit gap and follow-up roadmap
