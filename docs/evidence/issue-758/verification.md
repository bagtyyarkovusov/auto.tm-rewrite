# Issue 758 Profile Photo verification evidence

This record distinguishes code-testable behavior from device proof. [PR 761](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/761) owns the mutable Execution state. The single fix round follows the independent review at `53c283da`; no re-review is required under ADR-0085.

## Causes, fixes and confidence

| Criterion / review FIX | Established cause and resulting behavior | Evidence and confidence |
|---|---|---|
| Defect 3 / FIX 1–2 | SDK 55 image-picker's native `CropImageContract.kt:66` dereferences a missing result URI before JavaScript can handle it. Android library and camera now skip native editing, per the orchestrator's release decision. iOS library/camera retain editing. The raw source MIME allowlist also wrongly rejected readable HEIC/HEIF/AVIF/GIF/BMP; only dimensions/decode/output limits govern acceptance, with JPEG output. | Picker-policy tests for both sources/platforms; five readable alternate-format tests; unreadable/native-read-error recovery tests. High for application policy and avoiding the crop path; real native corrupt-file delivery and codec support remain unverified. |
| FIX 3 | Previous compressor scaled the long side to 512, leaving a landscape short side around 288. `compressProfilePhoto` reads decoded dimensions, scales the short side to 512 and centre-crops a 512-square image. It saves an intermediate quality-1 JPEG, then reuses the existing compressor's final quality/size/staging checks read-only, cleaning up its intermediate file/native references. | Landscape, portrait, square and rotated-picker-metadata tests assert actual manipulator crop operations and saved 512-square output. High for geometry; medium for native EXIF proof, which is source-supported but not exercised on a device. |
| Defect 14 / FIX 4–5 | Missing totals were treated as progress, while a later invalid total erased visible measured progress. Unknown events now retain the last measured percent, or remain indeterminate if no measured event exists. Generic Loading text was inappropriate: visible status and iOS announcement now say Uploading photo in EN/RU/TK; measured copy includes the percent. | Rendered spinner/no numeric value, intermediate 75% after total=0, stale-event retention, localized indeterminate/25% status, single start announcement, preparing/result and disabled-avatar tests. High for state/text behavior; animation/look/accessibility on hardware remains unverified. |
| Defect 5 / FIX 6 | **Not proven or fixed. Root cause unknown.** Original sequence is failure on throttled network, then Log out → Cancel, restore network, one Retry. Cancelling Log out emits no session event; Retry already made a fresh presign/task before this change. The leaked progress listener is UUID-filtered and does not establish the sticky upload cause. | Existing defensive cleanup and concurrent-Retry tests pass, but their red assertions concerned cancellation/single-job behavior. The rendered Log out/Cancel test runs before failure and is not a reproduction of the original sequence. Criterion remains unchecked; orchestrator owns a reproduction/logcat follow-up (issue ID pending). PR uses `Refs #758`. |
| FIX 7 | A committed execution-record repeated the PR's mutable state. It is removed in the final separate documentation commit. | Documentation-only inspection; no behavioral red test required. PR body is the sole mutable Execution state. |
| Session fences | API-client, request ownership, refresh and cross-User fences are unchanged. | Existing Profile Photo auth/client and rendered session-isolation tests included in the focused run. No artificial red for retained behavior. Actual device sign-out remains pending. |

No in-app Android crop UI is added; that polish is deferred to #763. Other Deferred review findings (real 25ms wait and structural assertions) are untouched. No dependency, package upgrade, permissions, native configuration or forbidden-area behavior changed. Changes outside the assigned implementation area are limited to the existing rendered spec/native fake, three account i18n keys, the mobile overview and this evidence. The Listings compressor is reused without edits.

## Library documentation and installed source

Installed versions inspected before production changes: Expo 55, RN 0.83.10, image-picker55.0.24, file-system55.0.26, image-manipulator55.0.21. Context7 was used before relying on library APIs:

- `/websites/expo_dev_versions_v55_0_0`: `ImageManipulator.manipulate`, `renderAsync`, decoded `ImageRef.width/height`, explicit `resize`, crop rectangle and JPEG `saveAsync`; earlier legacy upload callbacks/cancellation.
- `/expo/expo/__branch__sdk-55`: picker editing/raw export, task lifetime and shared-object lifetime. Installed declarations confirm `.release()` on context/ImageRef.
- `/bumptech/glide`: EXIF-aware decoding. Installed image-loader uses Glide 5.0.5; `ImageLoaderService.kt` uses `Glide.asBitmap()`, feeding the decoded bitmap into `ImageManipulatorModule.kt`. iOS's installed `ImageManipulatorModule.swift` adds `ImageFixOrientationTransformer` before user transforms.
- `/react/react-native-website`: ActivityIndicator, checked against installed RN0.83.

Context7 did not supply a precise SDK 55 native EXIF section or a version-tagged Glide snippet. Installed native source and current Glide documentation support orientation handling; the rotated-metadata test proves use of decoded dimensions, **not native EXIF execution**. No unavailable-server fallback or added dependency was needed. Original crop-contract diagnosis is also corroborated by [upstream expo/expo#48011](https://github.com/expo/expo/issues/48011).

Original report and PNGs 092, 109, 110, 081, 082, 083 and 107 were inspected from `origin/agent/release-emulator-pass`. They are before evidence, never after screenshots.

## Test-first evidence

| Checkpoint | Red evidence | Green / limits |
|---|---|---|
| Original `740f860daf4af469785045a5ff66ac1ccf195144` | Eight intended failures: crop/read-error classification, rejected-task cancellation, single-job Retry and unknown progress. 80 passed. An initial missing contracts-dist setup error was resolved and not counted. | Original two-file command subsequently passed 88. These assertions did not prove original defect 5, square output, Android camera policy or photo-specific copy. Red-checkpoint CI failed test lint, subsequently repaired. |
| Original progress `27b0e321b49b0788774e4c4d37be807b7907a1e1` | Final stale event read 25% instead of 75%. | `25ef9eb1` preserved internal lastPercent but still switched visible UI to spinner on an intermediate unknown-total callback. The independent review identified that gap. |
| Fix round `c511c2f9188bee2071460bcbd20f42631a77346d` | **14 intended failures, 90 passed**: five readable source formats, Android camera crop policy, four crop/orientation inputs, intermediate progress after unknown total, three locales' upload status. Test/fake lint passed. Committed and pushed before production edits. | Same command **104 passed** at `5786613c9f2ae068ba4d01cfc272342196492517`. |

Exact fix-round red/green command:

```sh
pnpm --filter @auto-tm/mobile exec vitest run src/identity/useProfilePhotoUpload.spec.tsx test/screens/profile-photo.spec.tsx --maxWorkers=1 --minWorkers=1
```

Broader focused command:

```sh
pnpm --filter @auto-tm/mobile exec vitest run src/identity components/identity test/screens/profile-photo.spec.tsx test/screens/profile.spec.tsx test/screens/cabinet-profile-identity.spec.tsx src/api/profilePhotoAuth.spec.tsx src/api/client.spec.ts src/i18n/resources.spec.ts --maxWorkers=1 --minWorkers=1
```

**257 tests in 10 files passed.** Existing obsolete wrong-source-type expectations now test unreadable alternate-format decoding. Existing generic-status expectations use the new photo-specific text. Native adapters are mocked; these tests are not device proof. All heavy local phases ran one at a time.

## Verification gates

| Gate | Evidence |
|---|---|
| Frozen install / contracts build / Expo alignment | Passed in initial implementation; dependency/lockfile/configuration inputs remain unchanged. |
| Mobile typecheck | `pnpm --filter @auto-tm/mobile typecheck` passed after fix-round code. |
| Affected lint | `pnpm --filter @auto-tm/mobile exec eslint src/identity/compressProfilePhoto.ts src/identity/useProfilePhotoUpload.ts src/identity/useProfilePhotoUpload.spec.tsx src/i18n/resources.ts app/profile.tsx test/screens/profile-photo.spec.tsx test/profile-photo-device.ts` passed without warnings. |
| Diff hygiene | `git diff --check` passed. |
| Full hosted code gate | [Full PR Checks run 37737536604](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37737536604) passed at code head `5786613c9f2ae068ba4d01cfc272342196492517`, including repository lint/typecheck/tests, container-backed gates and admin runtime checks. |
| Documentation | Checked separately after full hosted code success, following the docs lane. Results/head remain in the PR Execution state. |
| Device/runtime/visual proof | **Missing**: emulator reserved. Required second pass below owns proof. |
| iOS export/runtime/VoiceOver | **Not run** under requested resource constraints; hosted workflow does not supply these. |
| Local full suite/repository typecheck/native/Docker builds | **Not run** per user. Hosted full lane supplies repository lint/typecheck/tests, container-backed gates and admin runtime checks. |

Relevant output logs remain outside git at `/tmp/issue-758-fix-red.log`, `/tmp/issue-758-fix-green.log`, `/tmp/issue-758-fix-focused.log`, `/tmp/issue-758-fix-typecheck.log` and `/tmp/issue-758-fix-lint.log`. This record includes relevant outcomes so future verification does not depend on temporary logs.

## Second Android 16 verification pass

Use a release build containing the PR's verified code SHA on Android 16/API 36, edge-to-edge enabled. **Start and preserve logcat before each sequence, even on success.** Record build SHA, timestamps, screenshots/video and presign/PUT/adoption outcomes without secrets. No new native build/dependency or permissions claim is made here.

1. Tester A → Cabinet → Profile → camera badge → library. Pick corrupt `.jpg` containing non-image bytes. Expect localized unsupported-photo message, app alive, prior avatar preserved and Choose another photo/Cancel available. No Android crop screen. Cancel picker and confirm no change. Then upload JPEG, PNG, WebP and device-readable HEIC/HEIF/AVIF/GIF/BMP without restarting; decoder-unsupported formats fail safely. Confirm no new library permission prompt.
2. Pick portrait, landscape, square and EXIF-rotated images with recognizable centre/edges. Confirm centre framing, upright orientation and stored **512 × 512 JPEG**. Repeat through camera, including permission denial/settings and valid capture: no Android crop screen, automatic square output. iOS library/camera should still show native cropping (separate unrun gate).
3. **Defect 5 diagnostic sequence, exact report order:** throttle network → select valid photo → **wait for upload failure** → Log out → Cancel → restore network → tap **Retry once**. Observe whether picker reopens and whether presign/PUT/adoption succeeds. Capture logcat/network outcomes **even on success**. Repeat three times without force-stop. Separately fail → cancel error → choose another valid image. Do not infer that defect 5 is fixed from defensive unit tests.
4. Slow upload: no byte events shows animated spinner and localized Uploading photo (EN/RU/TK); measured events show ring/percentage. An invalid-total event after a measured percentage must retain the measured UI. Check light/dark, preparing, success, disabled avatar, and video showing intermediate states.
5. Actual sign-out during transfer → sign in as tester B. No A preview, late notice, storage/adoption request or cached identity for B. iOS VoiceOver start/preparing/result announcements remain a separate missing device gate.
