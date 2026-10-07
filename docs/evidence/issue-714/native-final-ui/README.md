# Final accepted UI photo-step evidence

Captured on 2026-10-07 from `f39ca061b9f856f7688bd1c91be217cb48e08aaa`, after mechanically integrating accepted PR #696 main `9c5d9ce0`. These supersede the earlier screenshots for styling proof.

| State | Screenshot | Observed native Continue state |
|---|---|---|
| 2 photos, English, light | [photos-2-en-light.png](photos-2-en-light.png) | disabled |
| 3 photos, English, light | [photos-3-en-light.png](photos-3-en-light.png) | enabled |
| 2 photos, English, dark | [photos-2-en-dark.png](photos-2-en-dark.png) | disabled |
| 3 photos, English, dark | [photos-3-en-dark.png](photos-3-en-dark.png) | enabled |

The temporary PR-only route rendered the actual shipped `WizardLayout`, `Step2Photos` and shared `StepPhotosSchema` with two or three local uploaded-photo fixtures. Its exact source is [photo-proof-route.tsx.txt](photo-proof-route.tsx.txt), also saved at `/tmp/714-photo-proof-route.tsx`. Android UI Automator supplied the observed Continue enabled flag, counter and helper. All four captures were visually inspected. They show accepted fonts/semantic colors, minimum-three guidance at two, and the suggested-eight nudge at three.

This is **fixture-state component evidence**, not login, real uploads or server publication. No credentials, seed or live mutation ran. Metro used an inert API URL `http://127.0.0.1:8101/api/v1`, so no reviewer/production API was used. Device was the existing `Medium_Phone_API_36.1`, `emulator-5554`; owned Metro port8100 was checked free first.

The accepted SDK55 debug APK was preserved before baseline-worktree cleanup at `/tmp/issue714-preserved-native/ui696-sdk55-app-debug.apk`, SHA256 `776eadd0f19ba0efe39caab2578ce1e809f6c755809209f39a2adcb963c9dc4d`. It was built at UI checkpoint080566ca with native inputs unchanged at accepted finala566aaec/merged9c5d9ce0. Package/app-config/native-input diff from accepted main to this branch is empty. No new native build was required; this runtime proves that compatible preserved client loads the integrated source.

[proof.json](proof.json) records screenshot/source hashes, dimensions, metadata and observed states. The four unedited PNGs are 1080x2400, with no EXIF/XMP. The temporary route was removed, generated router typing restored, native debug-host preference restored, only8100 reverse removed, and owned Metro/emulator stopped. Source hashes match before/after; shipped source stayed unchanged. Initial shell quoting and helper-selector mistakes affected only capture setup, were corrected, and are not passing assertions or production fixes.

The approved Camry photos are by Damian B Oh, CC BY-SA4.0. Source pages, original URLs, licence and attribution are in [the bundled fixture README](../../../../packages/db/scripts/reviewer-fixtures/README.md) and its manifest, and the localized public demo-credits pages. These captures retain those attribution/licence requirements.

Post-integration gates all passed with actual exit0: frozen install; repository unit10/10 tasks, mobile2754 tests, contracts413, API1829 passed/1 skipped; typecheck11/11; lint11/11; API/web builds; runtime imports; agent docs/glossary/smoke; Expo dependency check; iOS and Android clear exports. Full command/result records are `/tmp/714-ui-local-results.json`, `/tmp/714-ui-local-gates.py`, `/tmp/714-ui-unit.log` and their named gate logs. Container-backed publication/storage/race tests belong to the hosted required `pr` check; sourcef39ca061 passed it. Real signed-in staging/physical-device release flow, wider locale/accessibility matrix and production publication remain outside this bounded evidence.
