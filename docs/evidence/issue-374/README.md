# Issue 374 evidence

Photo viewer, instant loading from cached cards, and Ask the seller on Listing detail. Branch `agent/issue-374`, based on `origin/main` at c4bc044 (after #373 merged as PR 466). Approved specs: issue comments on #344 (release screen map) and #351 (Listing content), prototype branches read only.

## Acceptance evidence

| Criterion | Behaviour test (rendered) | Native evidence (iPhone 17 simulator) |
|---|---|---|
| Tapping a photo opens the viewer at that photo; swipe, pinch zoom and thumbnails work; ✕ returns the gallery to the same photo | `PhotoViewer.spec.tsx` (counter, thumbnails, thumbnail jump, swipe, ✕ and system back return the index), `PhotoViewer.zoom.spec.tsx` (paging locks while zoomed), `PhotoGallery.spec.tsx` (opens at the tapped photo, closing scrolls the gallery to the viewer's photo), `zoomMath.spec.ts` (zoom clamps), `listingDetail374.spec.tsx` (from the detail screen) | [Open at 1 / 6, thumbnails, ♡, Call + Message](viewer-open.png); [swiped to 2 / 6](viewer-swiped-to-2.png); thumbnail jump then [pinch zoom](viewer-zoomed.png) (a one-finger drag while zoomed moved the photo and did not page); [✕ back on 5 / 6](viewer-closed-back-on-same-photo.png) |
| Opening a Listing from any card shows photo, title, price, spec line, city and date at once; the contact bar stays disabled until the detail loads | `useListingPreview.spec.tsx` (feed, Results-filtered, Favorites and My listings caches), `ListingPreview.spec.tsx`, `listingDetail374.spec.tsx` (preview, disabled bar, then loaded and enabled in place; no bar for the owner or a closed Listing) | [Home card tapped with only the API process paused](instant-loading-from-card.png), then [the same Listing after the API resumed](detail-loaded-after-preview.png). The owner's Listing also opened from My listings: [owner view](owner-no-chips-top.png) |
| A deep link shows a plain skeleton | `listingDetail374.spec.tsx` (no card cached: skeleton, no contact bar, no title or price) | [Deep link to a Listing outside the cache, API paused](deep-link-plain-skeleton.png) |
| Ask the seller chips open the Conversation with the question pre-filled and unsent | `AskSellerChips.spec.tsx` (four intents, signed-in open with `draft`, signed-out `requireSignIn` then replay, other-Listing replay ignored, pending and retry), `MessageComposer.draft.spec.tsx`, `conversations-draft.spec.tsx` (the Conversation route shows the draft and sends only on Send), `useReplayAuthAction.spec.tsx` | [Chips](ask-seller-chips.png); [signed out: sign-in](signed-out-ask-goes-to-sign-in.png); after the mock SMS code, [the Conversation opened with "Can I see the car?" in the composer, "No messages yet"](conversation-prefilled.png) |
| Chips hidden for the owner and for sold Listings | `AskSellerChips.spec.tsx`, `listingDetail374.spec.tsx` (owner, sold and archived; also no ♡ and no Call + Message in the viewer) | [Owner, top](owner-no-chips-top.png) and [scrolled](owner-no-chips-scrolled.png); [sold, top](sold-no-chips-top.png) and [scrolled](sold-no-chips-scrolled.png); [viewer opened by the owner: no ♡, no Call + Message](viewer-owner-no-heart-no-contact.png) |
| Mobile gate | See the PR's Execution state for the commands and results | n/a |
| `CONTEXT.md` describes the viewer, cache seeding and Ask the seller | `apps/mobile/src/listings/CONTEXT.md` | n/a (documentation exemption) |

## Red evidence

[red-before-implementation.md](red-before-implementation.md): the specs were run against do-nothing placeholders before any production code: 54 of 72 tests failed on the unmet criteria. The red checkpoint was pushed as 8682a8c. Two later changes to the specs, after production code: `UNSAFE_queryByType(Modal)` checks became `Close`-button checks (the mock Modal element stays in the tree when closed), and non-null assertions became a `first()` helper for lint. Neither weakened an assertion.

The deep-link-skeleton test (a Listing with no cached card) passes against the placeholder `useListingPreview` that always returns `undefined`; it guards the behaviour #373 already shipped and stays green by design.

## Native setup and boundaries

Own services: Compose project `autotm374r-20261001` (Postgres 35474, Redis 36474, MinIO 39474/39475), API 3474 with `SMS_DRIVER=mock`, Metro 8474 started with `--clear`, iPhone 17 `38747B85-BB39-48A2-BF0D-4DD6A5ED1D13`, bundle `tm.auto.app`, all inside one `guarded-run` session. The iPhone 16e was not touched. `ui:fixture` seeded 12 Listings with real photographs. SQL against this runtime database only: five extra `listing_media` rows on one Listing (six photos), one Listing sold, one Listing reassigned to the buyer account to show the owner view. Sign-in used fixture phone +99361000009 and the code the mock SMS driver wrote to the API log. Instant loading and the deep-link skeleton were captured with only this session's API process paused (SIGSTOP) and then resumed.

Not shown: double-tap zoom and pinch-out to fitted (not captured in the session), and swipe-down to close from the prototype hint. The viewer closes with ✕ and the system back gesture. Android was not run: the macOS host has no `adb`.

Compose project note: the first project name `autotm374-20261001` left one exited Redis container record that Docker lists but cannot remove after a Docker Desktop restart, so the session used `autotm374r-20261001`.

Context7: `/software-mansion/react-native-gesture-handler` (`Gesture.Pinch`, `Pan`, `Tap`, `Race`, `Simultaneous`; `GestureHandlerRootView` inside a Modal for Android), `/websites/swmansion_react-native-reanimated` (`useSharedValue`, `useAnimatedStyle`, `withTiming`; Reanimated 4 moves `runOnJS` to `scheduleOnRN` in `react-native-worklets`), `/tanstack/query` (`placeholderData` and `initialData` from another query's cache; a separate typed preview was chosen instead, see `CONTEXT.md`), `/expo/expo` (expo-image source, `cachePolicy`).
