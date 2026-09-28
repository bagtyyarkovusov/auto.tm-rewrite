# Issue 367 — Home simulator evidence

Evidence for GitHub issue
[#367](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/367): Home
with the Brand, model card and the two-column New listings grid, and the Search
tab stack.

| Field | Value |
|---|---|
| Device | iOS Simulator, iPhone 17 Pro (402 × 874 pt), iOS 26.2 |
| Build | Development build `tm.auto.app` on Metro, branch `agent/issue-367` at `f63cf49` |
| Backend | Local API (`apps/api`, port 3006) on an isolated local database seeded with the catalog and 12 test Listings with generated placeholder photos |
| Date | 2026-09-28 |

## Screens

| State | Screenshot | What it shows |
|---|---|---|
| Home, loaded | [home-loaded.jpg](home-loaded.jpg) | 🔍 in the header, the Brand, model card with the live count (12 listings), New listings with See all, and the two-column grid: price in TMT, "Brand Model", "year, km" or "2025, New". The Toyota Camry ♥ is filled after a signed-out ♡ went through sign-in and the Favorite finished. |
| Home, loading | [home-loading.jpg](home-loading.jpg) | The count skeleton and three rows of grid-card skeletons in the card's shape, captured with the API process paused. |
| Home, offline | [home-offline.jpg](home-offline.jpg) | The existing `FeedError` state with Retry, captured with the API stopped. |
| See all | [results-interim.jpg](results-interim.jpg) | The interim Results route pushed inside the Search tab, with the tab bar visible. |
| 🔍 | [search-interim.jpg](search-interim.jpg) | The Search stand-in until #369. |
| Brand, model card | [brand-picker-interim.jpg](brand-picker-interim.jpg) | The Brand picker stand-in until #368. |

## Flows checked on the simulator

- Signed out, ♡ on the Toyota Camry opened phone sign-in. After the code was confirmed, the app returned to Home, fetched the feed with the session, and sent `POST /listings/:id/favorite` (201); the card showed a filled ♥ and the Listing appeared in Favorites.
- Signed in, ♡ on a saved card sent `DELETE /listings/:id/favorite` (200) and the heart returned to an outline.
- See all opened Results inside the Search tab. Switching to Favorites and back kept Results; tapping the already active Search tab returned to Home.

## First-screen fit on 360 × 800 dp

There is no Android emulator on this host, so the 360 × 800 dp fit is derived from the iPhone layout, not measured. On the iPhone 17 Pro, four cards and the photos of two more are on the first screen. On a 360 dp wide screen each card is 156 dp wide with a 104 dp photo, so a grid row is about 171 dp. Above the grid, Home uses about 189 dp plus a 24 dp status bar; the tab bar is 64 dp and the system navigation bar 24–48 dp. That leaves about 465–490 dp for the grid: two full rows and 120–145 dp of the third, which shows the third row's photos and prices. The physical-Android proof in #345 measures this on a device.
