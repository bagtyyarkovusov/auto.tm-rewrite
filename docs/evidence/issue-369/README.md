# Issue #369 native Search evidence

## Review fix captures, 2026-10-01

Frames 14-22 were captured after Railway deployed the matcher fix at `2ac525703300e99e183a108bde566c5ff6186a77`. Mobile source is unchanged from the earlier captures. The final evidence commit adds documentation and images only.

- PR #470; Railway project `176ddec0-dd65-4087-b82c-798599fc2ebe`, environment `auto.tm-rewrite-pr-470`, ID `b801eeac-8dd7-4296-8fda-6739b5678919`.
- API deployment `1f987479-2796-44a8-be5f-1a5841d39b0c` SUCCESS. The direct public API `/readyz` returned the fixed commit and Postgres/Redis/MinIO `ok` immediately before the final session. Its response is preserved in [backend-readyz.json](backend-readyz.json).
- iOS Simulator "AutoTM Queue B iPhone 17", iOS 26.2, UUID `3A8BB230-13C9-4624-8239-395A6E887D4C`, `tm.auto.app` development client, Russian UI, Metro 8469. Maestro drove native taps and Cyrillic typing; `takeScreenshot` PNGs were converted to JPEG without changing their content.
- Metro used `EXPO_PUBLIC_API_URL=http://127.0.0.1:3470/api/v1`. The throwaway loopback proxy passed through to `https://api-autotm-rewrite-pr-470.up.railway.app` and held only `/api/v1/catalog/search` requests. All other traffic stayed live. WebSocket and media origins remained the PR 470 API and MinIO hosts.
- Loading/offline proof held search requests until the unchanged app's 30-second timeout and automatic retry produced its real `NETWORK_ERROR` state. This was controlled search-request unavailability, not a device-wide Wi-Fi disconnect. No mock response bodies, result data, app code, or backend data were introduced. Releasing the hold and tapping Retry fetched the live catalog.
- Old Recent entries were cleared through Search before typing `камри`. The resulting fresh entry proves recording came from the captured Cyrillic choice.
- No login, OTP retrieval, Railway configuration change, or reseed was needed. A process scan found no Docker daemon. Metro and the proxy were stopped, their ports had no listeners, and the assigned simulator was shut down after capture.

The production-seed regression's red/green record is in [matcher-regression.md](matcher-regression.md). The direct live `камри` response is in [live-kamri.json](live-kamri.json); exact Camry ranks first, followed by prefix and one-edit matches.

| State / criterion | Final evidence | Governing reference |
|---|---|---|
| Loading with typed `камри`, no false no-match | [14-search-loading.jpg](14-search-loading.jpg) | PRD 33 Search states; ADR-0070 UI look |
| Offline with query retained and Retry | [15-search-offline.jpg](15-search-offline.jpg) | PRD 33 Search states; ADR-0070 UI look |
| Retry recovers without changing `камри`; Toyota Camry is first | [16-search-recovered-kamri.jpg](16-search-recovered-kamri.jpg) | #369 Cyrillic model criterion |
| Tapping the model opens Results for Toyota Camry | [17-results-cyrillic-camry.jpg](17-results-cyrillic-camry.jpg) | #369 model selection criterion |
| Fresh Toyota Camry in Recent, with Popular | [18-recent-after-cyrillic-choice.jpg](18-recent-after-cyrillic-choice.jpg) | #369 confirmed choice and Recent |
| Empty without Recent, Popular before typing | [19-search-empty-without-recent.jpg](19-search-empty-without-recent.jpg) | PRD 33 Search states; #369 empty Search |
| Unknown `zzzzzz` no match, editable query and keyboard | [20-search-no-match-unknown.jpg](20-search-no-match-unknown.jpg) | PRD 33 Search states; #369 no match |
| Cyrillic Lexus year-range rows | [21-search-lexus-range.jpg](21-search-lexus-range.jpg) | #363 parsed range; Search forwards API years |
| Whole-brand Lexus Results with 2014-2019 chip | [22-results-lexus-range.jpg](22-results-lexus-range.jpg) | #363 parsed range; #369 whole-brand selection |

Maestro assertions passed for loading, absence of false no-match, offline copy, retained query, Retry, recovered Camry, Results navigation, fresh Recent, cleared Recent, unknown-query no-match, and Lexus range navigation. These screenshots were also inspected visually. An initial final-session launch ran before Metro was ready and showed "No script URL provided"; relaunch after Metro readiness resolved it. An initial clear-Recent selector targeted its visible text rather than accessibility label; using `Очистить недавние` cleared it and the replacement flow passed. Neither temporary tooling failure is included as acceptance evidence.

## Earlier captures preserved as history

Frames 01-13 remain byte-for-byte unchanged from the earlier session. They used app/backend commit `b5c95ce712971cef34894d6be899e4fdd44b5502`, API deployment `2c8c2f70-6c58-429e-91a1-1415f2adc9ac`, the same PR environment, device and Metro port, and the seeded demo catalog with mock SMS. `/readyz` then reported Postgres/Redis/MinIO `ok`. The earlier session used direct PR API URLs and performed no login. Its report remains at `/Users/bagtyyar/.claude-orch/autotm/runs/issue-369-native.md` without alteration.

| Earlier state | Historical evidence |
|---|---|
| Keyboard on entry, Popular before typing | `02-search-empty-keyboard.jpg` |
| Recent and Popular | `06-search-recent-and-popular.jpg` |
| Latin `camry` results and model selection | `03-camry-model-result.jpg`, `05-results-toyota-camry.jpg` |
| `camry 2018` rows and Results 2018-2018 chip | `07a-camry-2018-result.jpg`, `07-results-camry-2018.jpg` |
| `2018` alone and filtered full feed | `08a-year-only-row.jpg`, `08-results-year-2018-feed.jpg` |
| Whole-brand Lexus selection | `09a-lexus-brand-result.jpg`, `09-results-whole-brand-lexus.jpg` |
| Historical failed Cyrillic `камри` query | `04-no-match-query-editable.jpg` |
| Search Back returns to the existing Home | `10-home-scrolled-before.jpg`, `11-home-after-search-back-1.jpg`, `12-home-after-search-back-2.jpg`, `13-home-after-edge-back-gesture.jpg` |

Frame 04 is evidence of the former bug, not proof of today's required Cyrillic behavior or today's unknown-query state. The former matcher missed Latin-only production Camry names; frames 16-18 and the seed-backed regression now prove the repair. No catalog names were changed to obtain it.

Earlier Back evidence preserved a small Home scroll offset through two Search/Back cycles. The edge-back swipe alone cannot distinguish duplicate Homes; the retained offset is the discriminating evidence. Earlier `camry 2018` Results were empty because fixture Camry years are 2021. Current Lexus range Results contain seeded 2016/2018 listings.
