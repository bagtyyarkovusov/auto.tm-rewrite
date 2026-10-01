# Issue 374 red run, before production code

Command, from `apps/mobile`, inside one `guarded-run` session on a base of `origin/main` at c4bc044:

```sh
pnpm exec vitest run \
  src/listings/components/zoomMath.spec.ts \
  src/api/listings/useListingPreview.spec.tsx \
  src/listings/components/PhotoViewer.spec.tsx \
  src/listings/components/PhotoViewer.zoom.spec.tsx \
  src/listings/components/PhotoGallery.spec.tsx \
  src/listings/detail/ListingPreview.spec.tsx \
  src/listings/detail/AskSellerChips.spec.tsx \
  src/listings/detail/listingDetail374.spec.tsx \
  src/conversations/components/MessageComposer.draft.spec.tsx \
  test/routes/conversations-draft.spec.tsx \
  src/auth/useReplayAuthAction.spec.tsx
```

Result: 11 files failed, 54 tests failed, 18 passed (72 tests).

The modules the specs import exist as placeholders that do nothing: `PhotoViewer`, `ZoomableImage`, `zoomMath`
(identity functions), `findCachedListingSummary` and `useListingPreview` (always `undefined`), `ListingPreview`
(enabled Call and Message, nothing else) and `AskSellerChips` (four unlabelled buttons, no hiding rules). So every
failure below is an unmet criterion, not an import or setup error.

An earlier run had two files fail to load (`SyntaxError: Unexpected token 'typeof'` from the real
`@react-navigation/native`-based `lib/theme`, a missing `KeyboardAvoidingView` host and `peerPresence` fixture).
Those were test-setup errors; they were fixed with spec-local mocks and the host adapter before this run, which is
the one recorded here.

## Failures by criterion

| Criterion | Failing assertion |
|---|---|
| Viewer opens at the tapped photo; counter; thumbnails; swipe; close returns the index | `Unable to find an element with testID: photo-viewer-pager`; `... text: 3 / 5`; `... role: button, name: Photo 5 of 5`; gallery `... name: Photo 2 of 3`; `No instances found with node type: "Modal"` after close |
| Pinch zoom support (rules and paging lock) | `expected 450 to be 300` (`clampTranslation`), `expected 80 to be +0`, `expected 1 to be greater than 1` (`MAX_ZOOM`, `doubleTapScale`); `Unable to find ... Zoom in active photo` |
| Instant loading from a card's cache | `expected undefined to match object` for the feed, Results, Favorites and My listings caches; `Unable to find an element with text: Toyota Camry, 2020`; `... testID: detail-skeleton-body`; `... role: button, name: Call, disabled state: true` |
| Contact bar disabled until the detail loads | `Unable to find an element with role: button, name: Call, disabled state: true` |
| Deep link shows a plain skeleton | `Unable to find an element with testID: detail-skeleton` |
| Ask the seller opens the Conversation with the question pre-filled and unsent | `Unable to find an element with role: button, name: Can I see the car?`; `... displayValue: Can I see the car?` (composer and Conversation route); `expected "spy" to be called with arguments: [ { kind: 'ask', ... } ]` |
| Ask hidden for the owner and for sold or archived Listings | `expected ReactTestInstance{ ... } to be null` (placeholder renders chips unconditionally) |
