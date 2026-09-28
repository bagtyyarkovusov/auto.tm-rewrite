# Issue 367 — Home simulator evidence

Evidence for GitHub issue
[#367](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/367): Home
with the Brand, model card and the two-column New listings grid, and the Search
tab stack.

| Field | Value |
|---|---|
| Device | iOS Simulator, iPhone 17 Pro (402 × 874 pt), iOS 26.2 |
| Build | Development build `tm.auto.app` on Metro, branch `agent/issue-367`. The loading, offline, See all, 🔍 and Brand, model screens are from `f63cf49`; Home, loaded and the page-2 ♡ flow were rechecked at `f503fc8`, after the review fixes |
| Backend | Local API (`apps/api`, port 3006, `SMS_DRIVER=mock`) on an isolated local database seeded with the catalog and 12 test Listings with generated placeholder photos. For the `f503fc8` recheck the 12 were copied 30 days older, so the feed has 24 Listings and a second page |
| Date | 2026-09-28 |

## Screens

| State | Screenshot | What it shows |
|---|---|---|
| Home, loaded | [home-loaded.jpg](home-loaded.jpg) | At `f503fc8`: 🔍 in the header (RNR `Button`), the Brand, model card with the live count (24 listings), New listings with See all, and the two-column grid: price in TMT, "Brand Model", "year, km" or "2025, New". The Toyota Camry ♥ is the local seller's saved Favorite. |
| Page-2 ♡ after sign-in | [home-page2-favorite.jpg](home-page2-favorite.jpg) | At `f503fc8`: the Lexus LX, the last Listing on the feed's second page, shows a filled ♥ after a signed-out ♡ on it went through sign-in. |
| Home, loading | [home-loading.jpg](home-loading.jpg) | The count skeleton and three rows of grid-card skeletons in the card's shape, captured with the API process paused. |
| Home, offline | [home-offline.jpg](home-offline.jpg) | The existing `FeedError` state with Retry, captured with the API stopped. |
| See all | [results-interim.jpg](results-interim.jpg) | The interim Results route pushed inside the Search tab, with the tab bar visible. |
| 🔍 | [search-interim.jpg](search-interim.jpg) | The Search stand-in until #369. |
| Brand, model card | [brand-picker-interim.jpg](brand-picker-interim.jpg) | The Brand picker stand-in until #368. |

## Flows checked on the simulator

- At `f503fc8`, signed out, ♡ on the Lexus LX on the feed's second page opened phone sign-in with a new local buyer. After the code was confirmed, the app returned to Home and the API log shows, in order: `GET /listings?limit=20` with the session (first page only), `POST /listings/8ef40c49…/favorite` (201) for the page-2 Listing, then one more `GET /listings?limit=20` from the refetch after the save. Scrolling down loaded page 2 with a filled ♥ on the Lexus LX.
- At `f503fc8`, launching the app with the seller's stored access token past its lifetime sent `POST /auth/refresh` (201) before the first authenticated `GET /listings`, so the feed arrived with the seller's ♥.
- At `f63cf49`, signed out, ♡ on the Toyota Camry opened phone sign-in. After the code was confirmed, the app returned to Home, fetched the feed with the session, and sent `POST /listings/:id/favorite` (201); the card showed a filled ♥ and the Listing appeared in Favorites.
- Signed in, ♡ on a saved card sent `DELETE /listings/:id/favorite` (200) and the heart returned to an outline.
- See all opened Results inside the Search tab. Switching to Favorites and back kept Results; tapping the already active Search tab returned to Home.

## First-screen fit on 360 × 800 dp

There is no Android emulator on this host, so the 360 × 800 dp fit is derived from the iPhone layout, not measured. On the iPhone 17 Pro, four cards and the photos of two more are on the first screen. On a 360 dp wide screen each card is 156 dp wide with a 104 dp photo, so a grid row is about 171 dp. Above the grid, Home uses about 189 dp plus a 24 dp status bar; the tab bar is 64 dp and the system navigation bar 24–48 dp. That leaves about 465–490 dp for the grid: two full rows and 120–145 dp of the third, which shows the third row's photos and prices. The physical-Android proof in #345 measures this on a device.
