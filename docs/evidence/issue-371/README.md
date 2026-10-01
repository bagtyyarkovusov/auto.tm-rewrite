# Issue #371 native evidence: Search parameters form

Simulator screenshots of the full-screen **Search parameters** form that replaces `FilterSheet`, for the Spec review.
The governing design is [33 — Search & discovery, Search parameters](../../prd/features/33-search-discovery.md#search-parameters).
It lists five states: default, filled, count loading, count error and invalid range.

## Environment

| Item | Value |
|---|---|
| App commit | `42445a2e9c78f532a629b81fcf1fa7739c150d34` (PR #483 head; red `0c58c0a`, green `b7f0b53`) |
| Backend | Railway PR environment `auto.tm-rewrite-pr-483`, id `ef137dc6-dedf-4e38-95c6-4e7e5da94f49` (project `auto-tm`) |
| Deployed backend SHA | `42445a2e9c78f532a629b81fcf1fa7739c150d34`: `/readyz` reports `status: ready`, `commitSha` equal to the app commit, `environment: auto.tm-rewrite-pr-483` |
| Deployments (all at that SHA) | api `0d8e1e7e-2884-4c88-8c51-85dce6aad299` SUCCESS; web `d5ee7f6b-caed-42de-a61e-72bcaa091439`; admin `1f38fa47-89f4-4e41-b6fa-2a0a646c654f`. Worker was not redeployed; its watch-path deployment `888300ad-9625-4273-acba-63837d6cd86c` is SKIPPED and the native flow does not use it |
| MinIO | digest-pinned `cgr.dev/chainguard/minio` (ADR-0074), deployment `22883da9-3b70-445f-aa8a-074d9f287388` SUCCESS |
| Data | `native-pr-seed.mjs --remote` run in the PR483 API container: 12 active fixture listings (1 with no photo), 130 brands |
| Device | iPhone 17, iOS 26.2 simulator `38747B85-BB39-48A2-BF0D-4DD6A5ED1D13`, `tm.auto.app` development client, Metro port 8471 |
| Driving | Claude computer use on the Simulator app for taps, key presses and drags; `xcrun simctl io … screenshot --type=jpeg` for every capture |
| Docker | Absent: no Docker Desktop, backend or VM process ran during the session |

Captures 01–20 ran with `EXPO_PUBLIC_API_URL` pointed straight at the PR483 API.
Captures 21–23 (count loading, count error, recovery) ran in a second Metro session whose API URL pointed at a throwaway loopback pass-through proxy (`/tmp` only, not committed).
The proxy forwards everything to PR483 and only holds (loading) or fails with HTTP 500 (error) `GET /listings/count`, so those two states can be produced on demand. The recovery capture reached PR483 through the same proxy.
The bundle is the unmodified app at the commit above in both sessions.

Dev-client notes:

- The dev client shows red LogBox toasts for `console.error` (an `[apiClient] request failed` line). They are dev-only; capture 11 still has one at the bottom. Where it hid the state it was dismissed before the capture.
- The simulator needed one cold relaunch before the app's offline gate (NetInfo) reported online. The first Results attempt showed the app's existing offline screen. That is the existing gate, not this change.

## States, with the governing spec line

| # | File | State | Spec / criterion |
|---|---|---|---|
| 01 | `01-results-unfiltered.jpg` | Results with no filters, 12 listings, ⚙ Filters entry | Results: "Filters row"; start point for AC 1 |
| 02 | `02-form-empty.jpg` | **Default (empty form)**: Any, no region, brand or model, empty years, sticky **Show 12 listings**, Reset | Search parameters: full-screen form with condition, city, brand, model, year, price and a sticky Show N; AC 6 empty form |
| 03 | `03-form-condition-used-count.jpg` | Condition Used, count 12 | AC 2: Show N follows the field |
| 04 | `04-form-condition-new-count-0.jpg` | Condition New, count **0** (all fixtures are used) | AC 2: the count changes with a field |
| 05 | `05-brand-picker-done-mode.jpg` | Brand row opened the picker as a sheet over the form: A–Z list, no Recent, close ✕ | Model picker "Opened from inside Search parameters"; AC 3 |
| 06 | `06-model-picker-done-mode.jpg` | Toyota models in Done mode: ends with **Done · N listings**, no More filters, Change brand | Model picker: ends with "Done"; AC 3 |
| 07 | `07-form-after-done-toyota-camry.jpg` | Back on the form with **Toyota** and **Camry** filled in after Done | AC 3: comes back to the form with the choice |
| 08 | `08-form-filled-count-1.jpg` | Used, Toyota Camry, years 2015 to 2020: **Show 1 listings** | AC 2 and AC 6 filled form |
| 09 | `09-form-filled-all-fields.jpg` | **Filled form**, scrolled to show year and price (50000 to 500000 TMT) | AC 6 filled form |
| 10 | `10-form-invalid-year-range.jpg` | **Invalid range**: year From 2025 above To 2020, inline error, "Check filter values", Show results disabled | Spec state "invalid range" |
| 11 | `11-results-after-show-n.jpg` | Show N applied: Results updated in place, 1 listing, Used, Toyota Camry card, price and year chips, Filters badge 2 | AC 2: Show N returns to Results with the filters applied |
| 12 | `12-form-reopened-prefilled-from-results.jpg` | ⚙ Filters from that Results reopens the form **pre-filled** (Used, Toyota, Camry, 2015, 2020) | AC 1 |
| 13 | `13-form-after-reset.jpg` | After **Reset**: Any, brand, model and years empty, count back to 12 | AC 4 |
| 14 | `14-form-after-reset-scrolled-price.jpg` | Same, scrolled: year and price fields empty too | AC 4: every field |
| 15 | `15-results-after-reset-show-12.jpg` | Show 12 applies the cleared form: unfiltered Results, no chips | AC 2 |
| 16 | `16-back-from-results-lands-on-home.jpg` | Back from that Results goes to Home, so Results was not stacked twice | AC 2: "doesn't stack a second copy" |
| 17 | `17-model-picker-with-more-filters.jpg` | Model picker opened from Home: Show N listings and **More filters** | AC 1 entry point |
| 18 | `18-form-opened-from-more-filters.jpg` | **More filters** opens the form pre-filled with Toyota / Camry, Show 2 listings | AC 1 |
| 19 | `19-results-from-more-filters-show-2.jpg` | Show N from that form opens Results (2 listings, Toyota Camry card) | AC 2 |
| 20 | `20-back-from-more-filters-results-lands-on-home.jpg` | Back goes to Home: pickers and form are off the stack, one Results | AC 2 |
| 21 | `21-form-count-loading.jpg` | **Count loading**: button reads "Loading…" and stays enabled | Spec state "count loading" |
| 22 | `22-form-count-error-retry.jpg` | **Count error**: "Could not load listing count", Retry, button reads "Show results" | Spec state "count error" |
| 23 | `23-form-count-recovered-after-retry.jpg` | Retry after the proxy recovered: count back to "Show 12 listings" | Count-error recovery |

`red-checkpoint.txt` and `green-checkpoint.txt` hold the test-first output.

## Observations for review

- **Tab bar stays visible under the form.** The spec calls the form "full-screen". Results and the pickers in this app also keep the tab bar, so this follows the existing Search stack. It is not a Spec reviewer's call from these captures alone.
- **"Show 1 listings".** The copy has no singular form. This came from the earlier sheet's `showResultsCount` key and was not changed here.
- **Existing `useListingCount` behavior.** While the draft is invalid the hook copies it into its debounced filters immediately. When the range turns valid again, the first request goes out with the stale invalid filters (observed: `yearMin=2025&yearMax=2020`, HTTP 400, a dev-only LogBox toast) until the 300 ms debounce catches up. The form never showed an error state for it. The hook is not part of this diff.
- **Popular brands in Done mode.** The Done-mode brand sheet in capture 05 shows only "All brands A to Z", while the normal picker opened from Home showed Recent and Popular (seen live on the way to capture 17, not captured). Condition New (0 matches) was active in 05, which probably explains the missing Popular block, but that was not isolated.

## Not shown

- The city Region → City picker was not opened. It is the existing control reused unchanged.
- No physical-device or Android capture; this is iOS simulator evidence only (#345 owns the Android matrix).
