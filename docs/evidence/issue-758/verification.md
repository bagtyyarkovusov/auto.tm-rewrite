# Issue 758 verification record

[Issue](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/758) · [Draft PR 761](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/761)

Implementer attribution: provider OpenAI, client Codex CLI, model gpt-6.1-sol, effort high. Code head `25ef9eb17e8f5f63c59e886720d70539165a423a`; base `70f2370b`. This records automated verification, not completed device acceptance. The PR body owns the mutable Execution state.

## Causes and confidence

| Defect | Cause established before changing production code | Confidence and limits |
|---|---|---|
| 3 | Report crash trace points to `CropImageContract.kt:66`. Installed `expo-image-picker@55.0.24` calls `requireNotNull(result.uriContent)` even on crop failure; `allowsEditing` selects this native activity before assets reach JS. SDK 55 docs and upstream [expo/expo#48011](https://github.com/expo/expo/issues/48011) corroborate this. With editing disabled and quality 1, original bytes are copied; negative dimensions and compression decode failure reach the existing unsupported state. Native `ERR_FAILED_TO_READ_FILE` is classified likewise. | High for avoiding this exact library-pick crop crash. Native result handling is mocked in tests; the second Android pass must confirm unsupported-file delivery. Android library crop UI is intentionally bypassed. |
| 5 | Installed `expo-file-system@55.0.26` `UploadTask.uploadAsync()` removes its progress subscription after success but has no rejection `finally`; `cancelAsync()` releases it. The app formerly cancelled only on timeout. Separately, rapid Retry calls start multiple jobs sharing the same compressed file/session; one can dispose the owner another still needs. Tests isolate both rejected-task cleanup and concurrent Retry triggers, and exercise Log out -> Cancel during the failed transfer, followed by Retry or another pick. | High for these two code defects; medium that they explain the original sticky device failure. The report did not isolate its exact trigger, and this session cannot prove that every instant picker failure shares this cause. The PR remains draft for that device proof. |
| 14 | State was initialized to 0, and nonpositive expected-byte totals were mapped to 0. SDK 55 upload callbacks and Android buffered/throttled byte events do not guarantee intermediate progress for a small compressed photo. The UI treated missing evidence as a measured percentage. | High for the indeterminate fallback and reported byte progress. Device animation/appearance still pending. |

Sources queried through Context7 before implementation: `/expo/expo/__branch__sdk-55` for editing/raw export and legacy task lifecycle; `/websites/expo_dev_versions_v55_0_0` for upload callbacks/cancellation; `/react/react-native-website` for ActivityIndicator. Context7 included some main-branch snippets, checked against the installed SDK 55/RN 0.83 sources. No unavailable-server fallback was needed. Upstream issue lookup supplements those docs.


## Test-first evidence

The native boundaries use the existing photo-device fakes; HTTP uses MSW and the real client/hooks. UI tests render Profile and press its actual controls. No native process runs in these tests.

| Criterion | Pushed red checkpoint | Actual failure | Green evidence |
|---|---|---|---|
| Defect 3 | `740f860daf4af469785045a5ff66ac1ccf195144` | Android native crop/read rejection expected unsupported, received failed. | Same hook tests pass; rendered existing invalid-file error/reselection tests pass. |
| Defect 5 | `740f860daf4af469785045a5ff66ac1ccf195144` | Rejected task cancellation expected once, received zero. Rapid Retry expected two cumulative transfers, received three. Rendered Log out/Cancel + Retry/new-photo paths failed cleanup assertion. | Both UI recovery paths succeed and simultaneous Retry shares one transfer. Original indefinite device failure remains unproven. |
| Defect 14 | `740f860daf4af469785045a5ff66ac1ccf195144` | Unknown progress expected no numeric value, received 0. | Spinner/no fabricated percentage; measured 25% and 75%, disabled avatar and success/preparing states pass. |
| Progress across unknown totals | `27b0e321b49b0788774e4c4d37be807b7907a1e1` | Unknown total between measured/stale events caused 75% to fall to 25%. | Targeted test passes after preserving the last measured percentage at `25ef9eb1`. |
| Session fences | Unchanged tests from the PR 740 paths included in the focused run. | No artificial red required for retained behaviour. | Client and Profile Photo auth tests pass; `src/api/client.ts` unchanged. |

Initial red command, run before production changes:

```sh
pnpm --filter @auto-tm/mobile exec vitest run src/identity/useProfilePhotoUpload.spec.tsx test/screens/profile-photo.spec.tsx --maxWorkers=1 --minWorkers=1
```

Result: 8 intended assertion failures, 80 passed. Same command subsequently passed all 88. An initial missing contracts `dist` setup error was resolved by building the existing package and was not counted as red. The red-checkpoint hosted run stopped at lint errors in new tests; those were fixed in the implementation commit. Local assertion failures are the behaviour evidence.

Progress-edge red/green command:

```sh
pnpm --filter @auto-tm/mobile exec vitest run test/screens/profile-photo.spec.tsx -t 'never moves progress backwards' --maxWorkers=1 --minWorkers=1
```

Final focused command at the code head:

```sh
pnpm --filter @auto-tm/mobile exec vitest run src/identity components/identity test/screens/profile-photo.spec.tsx test/screens/profile.spec.tsx test/screens/cabinet-profile-identity.spec.tsx src/api/profilePhotoAuth.spec.tsx src/api/client.spec.ts --maxWorkers=1 --minWorkers=1
```

Result: 235 tests in 9 files passed. All heavy local phases ran one at a time.

## Gates

| Gate | Evidence |
|---|---|
| Install | `pnpm install --frozen-lockfile` passed, no dependency/lockfile change. |
| Runtime shared contracts | `pnpm --filter @auto-tm/contracts build` passed. |
| Mobile typecheck | `pnpm --filter @auto-tm/mobile typecheck` passed again after the final code change. |
| Dependency alignment | `CI=1 pnpm --filter @auto-tm/mobile exec expo install --check` passed. |
| Affected lint | `pnpm --filter @auto-tm/mobile exec eslint src/identity/useProfilePhotoUpload.ts src/identity/useProfilePhotoUpload.spec.tsx app/profile.tsx test/screens/profile-photo.spec.tsx` passed without warnings after final code change. |
| Diff hygiene | `git diff --check` passed. |
| Full hosted repository checks | [PR Checks run 37734880974](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37734880974) passed the full lane at code head `25ef9eb17e8f5f63c59e886720d70539165a423a`, including repository lint/typecheck/tests, container-backed gates and admin runtime validation. |
| Device/runtime/visual proof | Missing, emulator reserved by the user. Second pass below owns this proof. |
| Mobile iOS export and iOS runtime/VoiceOver | Not run under requested local resource/gate constraints; hosted workflow does not supply these. |
| Local full repository tests/typecheck, native/Docker builds | Not run per user; hosted full check supplies repository lint/typecheck/tests and container-backed gates. |
| Independent review/ready/merge | Not requested at this verification-only stopping point. PR stays draft without auto-merge. |

Full local outputs retained outside git at `/tmp/issue-758-red.log`, `/tmp/issue-758-exact-green.log`, `/tmp/issue-758-progress-red.log`, `/tmp/issue-758-progress-green.log`, `/tmp/issue-758-focused.log`, `/tmp/issue-758-typecheck.log`, and `/tmp/issue-758-lint.log`. This document records the relevant results so another session does not depend on temporary files.

The original report was read from `origin/agent/release-emulator-pass`, including the crash trace and PNGs 092, 109, 110, 081, 082, 083 and 107. Those are before evidence, never after screenshots. No permissions audit/build claim is made because no native/configuration change was introduced.

Outside the assigned production area, only the existing rendered screen spec changed, plus this evidence and the current mobile overview. No Conversations, Listings, Notifications, auth-component, app.config.js or API-client behaviour was edited. Canonical terms remain User, Profile Photo and Assigned Avatar.

## Second Android 16 verification pass

Use a release build containing the verified PR code head on the reserved Android 16/API 36 emulator, edge-to-edge enabled. Keep native dependencies/build configuration unchanged. Capture screenshots/video and Android logcat for each failure; record build SHA.

1. Sign in as tester A -> Cabinet -> Profile -> camera badge -> Choose from library. Pick the same corrupt `.jpg` containing non-image bytes. Expect the localized unsupported-photo message, app still running, earlier avatar unchanged and Choose another photo/Cancel available. No Android library crop screen should appear. Pick a valid JPEG, PNG and WebP afterward; expect Photo updated without restarting. Check library cancellation changes nothing and requests no media permission.
2. Throttle networking until a valid library upload fails. During the transfer tap Log out, then Cancel. Restore the network and tap Retry; expect success using the retained photo with no picker reopened. Repeat the failure, Cancel its error, then pick a different valid image; expect success. Repeat both sequences three times without force-stop. Also try rapid Retry taps, timeout at 60 seconds, and Log out/Cancel after the error is visible. If instant failures persist, save logcat plus presign/PUT/adoption responses to isolate the remaining native/network cause.
3. On a slow transfer, expect an animated spinner and localized Loading text while byte progress is unavailable; no fabricated 0%. If byte events arrive, expect a moving ring and nondecreasing percentage. Check preparing/success and disabled avatar; repeat in EN/RU/TK and light/dark. Capture video showing the intermediate or indeterminate state.
4. Confirm actual Log out during upload, then sign in as tester B. No A preview, late success notice, storage/adoption request or cached identity may appear for B. Finally verify camera permission denial/settings and valid camera square crop. iOS cropping/VoiceOver is a separate unrun platform gate.

