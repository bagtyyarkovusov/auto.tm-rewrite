# Issue 370 evidence

Native simulator evidence for Results, Sort and the large card (PR 468, branch `agent/issue-370`). Captured on head `2bcf43f` plus the Retry fix described below, on the iPhone 17 simulator (iOS 26.2, `tm.auto.app` development build, JS served by a fresh Metro from this worktree). Screenshots are JPEGs at 600 px width, light appearance unless the name ends in `-dark`.

Runtime: isolated Compose project `autotm-370-20260930` (Postgres 35470, Redis 36470, MinIO 39470/39471), API on 3470 (`SMS_DRIVER=mock`), the `ui:fixture` seed (12 Listings with real photos; fixture sign-in phone +99361000001 and the mock code from the API log). Metro on 8470 with `--max-workers 2`. Metro was restarted (with `--clear`) after the Retry fix before the last captures, so those show the fixed bundle. Everything below `04` was captured after the Sort sheet height fix (`6462167`).

Spec states come from the approved release screen map (issue 344 resolution, "Results", "Sort", "Release-critical states") and the Results issue acceptance criteria.

## State map

| File | State | Spec state it matches |
|---|---|---|
| `01-results-light-newest-first.jpg` | Results, light, newest first (earlier session) | All listings, default order |
| `02-sort-sheet-collapsed-before-fix.jpg` | Sort sheet collapsed to its handle (bug, before `6462167`) | Evidence of the defect only |
| `03-results-all-light-newest-first.jpg` | Results with no brand and no model: "12 listings", "62,000 – 1,150,000 TMT", "Newest first", All/New/Used, "Brand, model / All brands and models", Filters | Header with count, TMT range, order and Sort; condition switch; brand/model card; full feed |
| `04-sort-sheet-after-fix-light-newest-first.jpg` | Sort sheet after the height fix: handle, title, close, all six orders visible, Newest first checked | Sort sheet, six orders, default Newest first |
| `05` / `06` | Cheapest first: Results header and first card, then the sheet with the marker on Cheapest first | Sort order 2 |
| `07` / `08` | Most expensive first (top card 1,150,000 TMT) and its marker | Sort order 3 |
| `09` / `10` | Newest year first (2021 first) and its marker | Sort order 4 |
| `11` / `12` | Oldest year first (2014 first) and its marker | Sort order 5 |
| `13` / `14` | Lowest mileage first (39,000 km first) and its marker | Sort order 6 |
| `15-condition-used-light.jpg` | Condition set to Used, in place (all 12 fixture Listings are Used) | All / New / Used updates in place |
| `16-condition-new-no-match-light.jpg` | Condition set to New: "0 listings", "No listings match", Reset filters | No match state |
| `17` / `18` | Used selected, Listing opened, Back: Used is still selected, same 12 results | Navigation round trip keeps route state |
| `19-brand-picker-counts-with-retained-used-light.jpg` | Brand picker opened from Results with Used retained; counts Toyota 5, Lexus 2 and so on | Filtered picker counts |
| `20-model-picker-brand-only-all-models-counts-light.jpg` | Toyota models, "All models" ticked, "Show 5 listings" | Brand only |
| `21-results-brand-only-toyota-light.jpg` | Results after brand only: "5 listings", card "Toyota / All models · choose models" with clear ✕ | Brand only |
| `22-model-picker-multiple-models-counts-light.jpg` | Camry and Hilux ticked, "Show 3 listings" | Several models, picker count |
| `23-results-multiple-models-camry-plus-1-light.jpg` | Results: "3 listings", card "Toyota Camry, +1 / Change models" | Several models |
| `24-model-picker-reopened-with-cheapest-sort-no-400-light.jpg` | Model picker reopened from that card while Sort was Cheapest first: current models ticked, "Show 3 listings" | Card opens the Model picker with current models ticked; no 400 after the `sort` fix |
| `25-no-match-chips-still-shown-light.jpg` | "0 listings" with the brand/model card, Filters badge 2 and the price and year chips still shown | No match, chips still shown |
| `26-results-filter-chips-price-year-badge-light.jpg` | Chips "up to 7,000,000 TMT" and "from 2019", Filters badge 2 | City, price and year chips with count badge |
| `27-floating-filter-row-scrolled-light.jpg` | Scrolled past 180 pt: Filters (2) and chips float above the tab bar | Filters row floats at the bottom while scrolling |
| `28-end-of-list-no-more-footer-floating-row-light.jpg` | End of the list: "No more" footer and the floating row | End of list |
| `29` / `30` | Listing opened from the scrolled list, then Back: the list returns at the same offset (`30` is pixel for pixel the same scroll position as `28`) | Listing Back restores the scroll position |
| `31-floating-filter-row-end-of-list-dark.jpg` | End of list with floating row, dark | Dark theme |
| `32-results-top-filters-row-chips-dark.jpg` | Results top, dark: switch, card, Filters and chips | Dark theme |
| `33-sort-sheet-cheapest-marker-dark.jpg` | Sort sheet, dark, marker on Cheapest first | Dark theme |
| `34-floating-filter-row-mid-scroll-dark.jpg` | Floating row mid-scroll, dark | Dark theme |
| `35-loading-skeleton-light.jpg` | Results while the API process is stopped: header "Cars", chips kept, three large-card skeletons | Loading (card skeletons) |
| `36-error-api-unreachable-not-true-offline-light.jpg` | API process killed: "Something went wrong / Retry", chips and switch kept | Offline or failure (see the mismatch below) |
| `37-defect-header-count-missing-after-retry-before-fix-light.jpg` | Defect: after Retry with the API back, the list loads but the header still says "Cars" with no count | Defect evidence, before the fix |
| `38-large-card-two-photos-count-2-light.jpg` | Large card: two photos, photo count 2, TMT price, km · gearbox · fuel, "Toyota Hilux, 2019", "Turkmenbashi · Yesterday", ♡ | Large card |
| `39-favorite-signed-out-opens-sign-in-light.jpg` | Signed-out ♡ on a Results card opens Sign in | Sign-in on action |
| `40-sign-in-cancelled-returns-to-results-no-favorite-light.jpg` | Closing Sign in returns to the same Results (chips, sort, scroll) with the heart still empty | Cancelling sign-in drops the waiting action |
| `41` / `42` | Phone entered, then the six-digit code step | Sign-in flow |
| `43-sign-in-completed-returns-favorite-filled-light.jpg` | After the code: back on the same Results with the same filters, the heart filled | Completion returns to the same screen and finishes the Favorite once (one `POST /favorite` in the API log) |
| `44-results-first-load-error-api-down-light.jpg` | Results first load with the API down | Failure state on first load |
| `45-retry-recovers-count-and-names-after-fix-light.jpg` | After the API is back and Retry is pressed: "12 listings", price range, "Nissan Almera, 2014", "Tejen · Today" all return | The fix below |

## Mismatches and defects, stated plainly

1. **True offline state was not captured.** The approved offline state is the paused query shown when the device reports no connection (`fetchStatus === "paused"` with `items.length === 0`, rendered by the rendered test "shows an offline recovery ..."). The simulator has no way to drop connectivity without changing the host network, which was out of bounds. `36` and `44` show the generic failure view (`feed.isError`, "Something went wrong / Retry") produced by killing the API process. The offline copy ("No internet connection. Try again when you are online.") has rendered-test proof only, no simulator screenshot.
2. **Defect found and fixed: Retry left the header count and names missing.** After an outage Results reloaded only the feed. The count query, and the brand and city name queries behind `useFeedCatalogMaps`, stayed failed, so the header read "Cars" with no count or range (`37`) and a card read "Almera, 2014" with no brand or city until the screen remounted. Fix: `retry` in `apps/mobile/app/(tabs)/(search)/results.tsx` refetches every errored or paused query. Test first: "Retry reloads every failed query behind the screen (count, catalog names), not only the feed" in `apps/mobile/test/screens/results.spec.tsx` failed against the unfixed file (1 failed, 25 passed) and passes with the fix; the three Results specs pass (31 tests); mobile lint and typecheck pass. Native re-check after restarting Metro: `45`.
3. **Fixture Listings have one photo each.** `ui:fixture` seeds one image per Listing, so the large card's second photo slot showed "No photo" (`03`, `09`, and others). For `38` and the captures after it a second media row pointing at the same image file was inserted into the throw-away runtime database, so the card shows two photos with a count of 2. The two photos are therefore identical in `38`, `40`, `43`, `45` and the later Listing cards. This is fixture data, not product behaviour.
4. **Fixture Listings are all Used and published Today or recent days.** Sort order `05` (Cheapest first) and `03` (Newest first) start with the same Listing (62,000 TMT); the second card differs. The Used switch therefore keeps all 12, and New shows the no-match view (`16`).
5. **Price chip value.** In `25` and `26` the chip reads "up to 7,000,000 TMT" (first attempt: "up to 70 TMT"). The Filters sheet field is the old sheet that is out of scope; its numeric field dropped digits when a simulator typed several characters in one burst, and entering digits one at a time worked. Not treated as a product defect.
6. **Sort affects the picker count requests correctly.** API log during the picker captures: `filter-options/models` and `count` requests from the pickers carry no `sort` parameter, while the Results feed and count requests carry `sort=newest` or `sort=price_asc`. No 400 was returned.

## Not captured

- True offline (paused query) on the simulator, as above.
- Favorites, Search parameters and other screens outside the issue.
- Android or a physical device (belongs to the physical Android proof issue).
