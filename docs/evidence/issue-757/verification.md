# Issue 757 verification checkpoint

Code verified at `bdd212b3da0f215b5769a2229049363be8818722`. Documentation checkpoint `9d060e6983ed3903245e801982f775974a69c0d0`. Execution attribution: Codex, provider OpenAI, client Codex CLI, model gpt-6.1-sol, effort high.

The implementation keeps [PR 760](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/760) draft. Its single mutable Execution state is the recovery authority. This file records test evidence; native device outcomes remain pending.

## Baseline

The [release-emulator report](https://github.com/bagtyyarkovusov/auto.tm-rewrite/blob/7164657d7c63d25d1a67faf066c559fb3515ddc7/docs/evidence/release-emulator-pass/report.md) tested main ee1931e9 on Android 16 with edge-to-edge enabled. Cited PNGs were extracted with git show and viewed before implementation: 129/159 Call; 064/065 Back; 053/055 VIN; 044 Camera and 077 Profile reference; 125 plural; 025/026 Home. These are before-fix evidence, not verification of this PR.

## Red checkpoints

Production edits began only after the initial failing tests were committed and pushed at `f7f551db9733a21402575228e60570c2fbbf035c`.

| Behaviour | Failing command and result |
|---|---|
| Call, all four entry points | Rendered Call taps with canOpenURL returning false did not open the dialer. Rejected openURL produced no number alert and unhandled rejection in three event handlers. Eight-spec mobile command below: 23 failures and 169 passes across these and the other criteria. |
| Back | `pnpm --filter @auto-tm/mobile test -- test/routes/onboarding-back.spec.tsx`: 4 failures. Root anchor was onboarding instead of tabs; the onboarding route remained eligible for returning, skipping and completing Users. |
| VIN contract | `pnpm --filter @auto-tm/contracts test -- src/schemas/vin.spec.ts`: 8 failures and 5 passes. Short, forbidden-letter, punctuation, whitespace and non-ASCII values passed the vehicle contract. Existing overlength rejection and valid/empty values passed. |
| VIN wizard copy | `pnpm --filter @auto-tm/mobile test -- src/listings/wizard/VinField.spec.tsx`: 3 failures for absent localized validation errors after typing Corolla in RU/TK/EN. |
| Camera | Permanent-denial dialog absent in all locales; denied request still launched Camera; final request becoming permanent denial offered no settings recovery. |
| Russian plural | Filter buttons for 1–4, 21 and 22 used the many form. Cases 5 and 11–14 already passed and remain regression coverage. |
| Home | The rendered native style lacked an explicit transparent background and pressed/resting opacity. |

The eight-spec red command was:

```sh
pnpm --filter @auto-tm/mobile test -- \
  src/listings/components/ContactCtaBar.spec.tsx \
  src/listings/favorites/FavoriteListingCard.spec.tsx \
  src/listings/feed/ListingLargeCard.spec.tsx \
  src/conversations/components/ConversationHeader.spec.tsx \
  src/listings/wizard/Step2Photos.spec.tsx \
  src/listings/wizard/VinField.spec.tsx \
  src/listings/search/SearchParametersForm.spec.tsx \
  src/listings/feed/HomeHeader.spec.tsx
```

The conversation regressions were later moved to Listings' ConversationCall.spec.tsx. The final diff changes no other conversation file.

A stronger native-event Home test was committed and pushed at `c953eff8ef9cc0f47895609118371ea78f21ae2a`. `pnpm --filter @auto-tm/mobile test -- src/listings/feed/HomeHeader.spec.tsx` failed on the expected pressed object after onPressIn. Installed css-interop 0.2.4 flattens inline styles, so the initial callback approach would not survive real interop. The final action uses an explicit style object and local state, reset on release and before navigation.

The [first full hosted run](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37735367903) failed only two mobile translation parity assertions because EN/TK lacked the new RU plural keys. Repair attempt 1 of 3 added matching forms. Before that repair, `f3aaddce240923589f2adde6bae42a1b57e40fa2` committed and pushed an English singular regression. `pnpm --filter @auto-tm/mobile test -- src/listings/search/SearchParametersForm.spec.tsx src/i18n/resources.spec.ts` reproduced 3 failures and 53 passes, the two parity assertions and missing "Show 1 listing".

The next [full hosted run](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37736074117) passed all 2,982 mobile tests, but its existing API ValidateDraftStep test found duplicate errors for an overlength VIN. Repair attempt 2 of 3 preserves the established single vinTooLong error. Red checkpoint 358f44c4bda31f7f54660abc52afd4389f4df325 added the contract regression; the focused VIN command failed 1 test with 13 passing before production edits. The final contract skips its format refinement when max length already fails. The same contract test and the existing focused API use-case test now pass. The localized message also interpolates the exported length bound through the established wizard error translator.

## Green gates

| Gate | Result |
|---|---|
| pnpm install --frozen-lockfile | Passed before implementation. |
| Focused/adjacent mobile command below | 44 files, 605 tests passed on the final code. |
| pnpm --filter @auto-tm/contracts test | 13 files, 452 tests passed. |
| pnpm --filter @auto-tm/mobile typecheck | Passed after the final code change. |
| pnpm --filter @auto-tm/api test -- src/modules/listings/application/ValidateDraftStep.spec.ts | 8 tests passed, including the existing overlength error assertion. |
| pnpm --filter @auto-tm/contracts typecheck | Passed. |
| Affected mobile/contracts pnpm exec eslint paths | Passed; each changed TS/TSX file checked, including the final Home and translation changes. |
| CI=1 pnpm --filter @auto-tm/mobile exec expo install --check | Passed, dependencies up to date. |
| pnpm --filter @auto-tm/mobile exec expo export -p ios --clear --max-workers 1 | Passed after the final translation repair. Single worker; no native build. |
| pnpm --filter @auto-tm/contracts build | Passed, compiled contract consumers refreshed. |
| pnpm --filter @auto-tm/contracts openapi:generate | Passed; generated no tracked change. |
| Full required hosted pr | [Run 37737287521](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37737287521) passed on code head bdd212b3, including repository lint/typecheck/tests, disposable-service tests and admin runtime verification. |
| pnpm check:runtime-imports | Passed after compiling ignored DB JavaScript artifacts. |
| git diff --check | Passed. |

```sh
pnpm --filter @auto-tm/mobile test -- \
  src/listings/wizard src/listings/feed src/listings/favorites \
  src/listings/components/ContactCtaBar.spec.tsx \
  src/listings/components/ConversationCall.spec.tsx \
  src/listings/search/SearchParametersForm.spec.tsx \
  test/routes/onboarding-back.spec.tsx \
  src/onboarding/onboardingFlag.spec.ts src/i18n/resources.spec.ts
```

Local full-repository gates were delegated to hosted CI under the user's 16 GB/resource constraint. No emulator, simulator, native or Docker build was started. No dependency, version, app manifest or permission changed. No store permissions-audit update was needed.

## Cause confidence and documentation

Call: high, all four handlers used the visibility preflight and the baseline manifest lacked tel queries. Back: high, onboarding was the root anchor and remained unguarded. VIN: high, the contract had only max length. Camera: high, no permanent-denial branch existed. Russian plural: high, only the many sentence existed. Home: medium, the active-fill/animated path and release-only reset are established, but the native event sequence causing the retained fill is inferred from source and screenshots.

Context7 verified Linking semantics through /react/react-native-website; SDK 55 Router guards and ImagePicker through /expo/expo/__branch__sdk-55; state styling through /nativewind/nativewind/nativewind_4.2.0; plural categories through /i18next/i18next; regex through /websites/v3_zod_dev. Runtime import setup also consulted /prisma/web for Prisma 7.8.0: client generation needs no database connection, but this repository config requires a DATABASE_URL value while loading. An initial missing-artifact check and missing-env generation attempt were resolved by compiling ignored DB JavaScript with an unused local placeholder URL. No unavailable-server fallback was used. [Android package visibility](https://developer.android.com/training/package-visibility/use-cases) and [SDK 55 permissions](https://docs.expo.dev/versions/v55.0.0/sdk/imagepicker/#permissionresponse) supplement snippets that mixed main and SDK 55.

Installed versions: Expo 55.0.31, Router 55.0.18, ImagePicker 55.0.24, Linking 55.0.17, RN 0.83.10, NativeWind 4.2.3, css-interop 0.2.4, i18next 24.2.3, Zod 3.25.76. Versioned NativeWind 4.2.0 docs were checked against installed v4 code.

The mobile overview records the protected onboarding boundary; Listings' overview and mutable Listings PRD record the strict optional VIN. Partial draft autosave and historical Listing reads remain permissive. The one production scope exception is onboardingFlag.ts's small completion subscription; the conversation change is confined to its Call handler/import.

## Missing device evidence and handoff

The native-host test adapter proves React state, localized content, callbacks, guarded route eligibility and native style objects. It does not execute a real navigation tree, native Back dispatch, a dialer, camera permissions, NativeWind rendering, portals or animation. After-fix screenshots and those native outcomes remain unverified. The PR contains exact steps for Android 16 edge-to-edge and Android 11+ Call, completed/skipped/cold-start Back, invalid/empty/valid VIN in RU/TK/EN, permanent camera denial/settings/regrant, Russian counts and Home light/dark/Reduce Motion.

## Fix round (review at 622c586e)

The independent review (Standards and Spec, Claude Opus, pinned to 622c586e) returned "fix first" on both axes and listed FIX 1–7. This is the single authorised fix round under ADR-0085; no re-review runs. Codex implemented FIX 1–6 and exhausted its provider quota mid-item-6; Kimi K2.8 (Kimi Code CLI) verified the pushed checkpoint, repaired lint, and completed FIX 7.

| FIX | Evidence |
|---|---|
| 1. Stored invalid VIN must not block editing a Listing | Red `bea83acd` (edit price of a Listing with stored VIN "Corolla" could not save). Green `2a19471b`: the wizard skips the VIN format check for a stored VIN in edit mode. |
| 2. Enforce the VIN rule at first publish only | Red `f035fe7d` (API use-case regressions for publish/edit/republish). Green `5b0cd94f`: `PublishListing` applies the shared `VinSchema` from contracts; republish and edits of published Listings stay unaffected. `openapi:generate` produced no tracked change. |
| 3. Russian plural without `Intl.PluralRules` | Red `43aaed06`. Green `bbaa3632`: `showResultsCount` selects one/few/many/other by count ranges; the test deletes `Intl.PluralRules` and covers 1, 2, 5, 11, 21, 22, 25. |
| 4. Remove dead onboarding guard | Red `8e46a4a9`. Green `958696db`: `Stack.Protected`, the completion subscription and the readiness gate are removed; `initialRouteName: "(tabs)"` remains the Back anchor. |
| 5. Back after publish lands on tabs | Red `521dbcd3`. Green `9147ca4e`: publish pushes the detail over the tabs instead of replacing them; `sell-toast.spec.tsx` drives a real `useNavigationBuilder`/`StackRouter` stack. |
| 6. ASCII-only VIN uppercasing; dial-string sanitising | Red `ac46a41f`. Green `1b02f37c` plus non-ASCII regression `14be3e4b` and refinement in checkpoint `74403c23`: only ASCII letters normalise, so Unicode lookalikes stay invalid; the dialer strips the dial string to digits and a leading `+`. |
| 7. Device steps in the PR body | Updated in the PR body with this docs commit: Back step replaced by the report's exact sequence, stored-invalid-VIN edit/save added, RU counts 5 and 11 marked mandatory. |

Checkpoint `74403c23` failed the hosted `pr` check on lint (3 errors, 7 import/order warnings in apps/mobile). Repair commit `9166843a` cleared them without behavior change. Local gates on `9166843a`: affected lint (mobile, contracts, api), typecheck, 214 focused mobile tests across the nine touched specs, 454 contracts tests, 126 API listing-application tests, `check:runtime-imports`, and `openapi:generate` (no change) all passed. Hosted [pr run 37775906289](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37775906289) passed on code head 9166843a.

No independent review or merge was performed. Keep the PR draft; the integration owner runs the device pass. The live worktree and branch remain available at .claude/worktrees/codex-issue-757 and agent/issue-757; do not retire them before integration.
