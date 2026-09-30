# Mobile listings

This area contains create-wizard state, draft persistence, upload staging, edit-save orchestration, discovery state, and listing presentation. The create route and edit route have different orchestration; inspect both before consolidating shared UI. Server lifecycle and contact rules belong to [API Listings](../../../api/src/modules/listings/CONTEXT.md).

## Important constraints

Create flow uses the wizard machine and autosave; edit flow computes and sequences changes against an existing listing. Shared contract schemas own validation. Do not make the UI's visual step number a second validation model. Photo UI receives its actual props from the live component interface; old Step2Photos warnings and historical refactor plans are not current requirements.

Publishing depends on required fields, contact verification, and successful media attachment. A file appearing in a preview does not prove it was uploaded or attached. Preserve retry state and draft reconstruction, and inspect the queue, publish-gate code, and tests when changing navigation or autosave timing.

The condition disclosure is one required Yes/No question, **Damaged / needs repair**, plus optional **Known issues** ([ADR-0052](../../../../docs/adr/0052-seller-condition-disclosure-is-damaged-plus-known-issues.md)). Step 4 leaves it unanswered until the seller picks one, and the shared `StepSpecsSchema` blocks the step (`wizardErrors.damagedRequired`) until then. A legacy Listing without an answer enters edit at the specs question before the seller can save. A submitted disclosure replaces Known issues, so clearing the input removes the saved text. Listing detail shows it under "Condition, as stated by the seller" and renders nothing when a Listing has no answer.

Picker URIs are copied into persistent temporary storage before parallel compression because iOS may reclaim picker cache files under memory pressure. The compressor copies its result into staging, verifies the destination, and cleans temporary files best-effort. Preserve copy rather than cross-directory move; earlier iOS failures motivated that choice. Overlapping compression/upload operations use reference counters, since a boolean can clear while another operation is still active.

The compressor currently uses the contextual ImageManipulator chain. Consult current Expo docs before an SDK change; historical API notes cannot establish present library support. Staging cleanup is local-device cleanup, distinct from the worker's broad orphan-cleanup queue.

Search/filter UI separates editing state from applied query state. Check the stores, serializers, query keys, and API ranking adapter together when changing filters or result counts. Approved discovery requirements are in the Search specification, not old planned-refactor notes.

Home (`app/(tabs)/(search)/index.tsx`) is the root of the Search tab's own stack, anchored at `index` so a deep link still has Home underneath. `AutoTmTabBar` always emits `tabPress` and navigates only to an unfocused tab, so re-tapping Search pops to Home while other tabs keep their history. Home has no filters: a Brand/model card with the live count and a two-column New listings grid of `ListingGridCard`. Results, the Brand picker, and Search under that stack are interim stand-ins until their slices land. A signed-out ♡ on a card stores a pending Favorite; `useFeedFavoriteReplay` finishes it at screen level when Home regains focus, because the tapped card may no longer be mounted. Feed cards and Listing detail share `useListingFavorite`. `setFeedFavorited` writes a ♡ state only into signed-in cached feed pages, because a silent sign-out keeps the query cache and Home would otherwise show the previous User's ♥.

## Start here

- [Parent application](../../CONTEXT.md)
- [Wizard machine and tests](wizard/wizardMachine.ts)
- [Autosave and tests](wizard/useWizardAutosave.ts)
- [Upload queue and tests](uploadStaging/useUploadQueue.ts)
- [Compressor and regression tests](uploadStaging/compressor.ts)
- [Feature implementation and tests](.)
- [Home screen](../../app/(tabs)/(search)/index.tsx)
- [Discovery specification](../../../../docs/prd/features/33-search-discovery.md)
- [Media decision](../../../../docs/adr/0008-media.md)
