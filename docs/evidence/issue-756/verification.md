# Issue 756 verification evidence

Issue: [#756](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/756). Draft PR: [#762](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/762).

Implementer: Codex; provider OpenAI; client Codex CLI; model gpt-6.1-sol; effort high.

Code head: `3c1617d76b10b5e619969ce86c10b8909c867ad0`. Device acceptance remains pending for the reserved second emulator pass. No emulator, simulator, native or Docker build was run. No dependencies or native configuration changed.

Source evidence: [release-pass report](https://github.com/bagtyyarkovusov/auto.tm-rewrite/blob/7164657d7c63d25d1a67faf066c559fb3515ddc7/docs/evidence/release-emulator-pass/report.md). All cited images for defects 2, 7, 10 and 4 were extracted with git show and viewed: 130, 131, 132, 133, 134, 139, 144, 145, 146, 147, 156, 158.

## Cause assessment

- Defect 2: composer-only `KeyboardAvoidingView` uses its parent-local footer frame against screen keyboard coordinates. RN 0.83.10 implementation confirms the mismatch; avoidance now encloses the Android flex screen. Report portals had no avoidance or scrollable form. Confidence **high** in these causes, **medium** in final device layout until the reserved pass. Context7's RN result also identifies later edge-to-edge fixes in 0.86; no upgrade or native patch is introduced.
- Defect 7: acknowledged local Messages were removed from rendered history as soon as their status became sent, before the matching server row arrived. Socket acknowledgement alone also neither patches nor invalidates the message cache. Keeping acknowledged local rows closes this gap. Sending while reading older history also now returns to the newest row. Confidence **high** in the demonstrated visibility gap; the exact emulator socket/event timing was not captured. The API already fans out `message:new` to the room, so this PR does not claim a missing API broadcast.
- Defect 10: VirtualizedList already applies inversion to its empty component; the additional `scaleY: -1` overrides that correction. Removed. Confidence **high**, installed RN implementation plus screenshot 130.
- Defect 4: Expo Android API 33+ returns DENIED before the first ask with `canAskAgain=true`; the wrapper prematurely classified it as refusal. Requestable Android states now reach the persisted ask gate, while iOS denial and permanent denial remain unchanged. Direct conversation sends now enable registration too, rather than relying only on Messages-tab entry. Confidence **high** in source and test diagnosis; real system prompt/token delivery need device/provider proof.

## Test-first acceptance evidence

| Criterion | Pushed red checkpoint / exact command / failure | Green evidence |
|---|---|---|
| Defect 7, new/existing thread | `1889add0`; `pnpm --filter @auto-tm/mobile test test/screens/conversation-by-id.spec.tsx`; 2 fail, sent text absent | same command passes after `e1878cfd`; additionally HTTP text and socket/HTTP image acknowledgement, delayed echo and dedup tests pass |
| Defect 7, older-history viewport | `e3b490d2`; `pnpm --filter @auto-tm/mobile test src/conversations/components/MessageList.spec.tsx`; 1 fail, no scroll request | same command green after `433dbc32`; incoming Messages preserve reading position |
| Defect 7, fast acknowledgement | `8779bdec`; `pnpm --filter @auto-tm/mobile test test/screens/conversation-by-id.spec.tsx`; 2 fail, pending-only scroll skipped when acknowledgement renders immediately | same screen tests green at `21b200ec`, with adjacent suite 564 pass; final suite 566 pass at `3c1617d7` |
| Review regression: acknowledged Delete | `c9239376`; `pnpm --filter @auto-tm/mobile test test/screens/conversation-by-id.spec.tsx src/admin/components/report-success.spec.tsx`; 2 fail because Delete is absent without server echo, plus 1 static-style convention assertion | 566 adjacent tests pass after `3c1617d7`; socket and HTTP deletion redact the retained local row |
| Defect 10 | `b3276652`; `pnpm --filter @auto-tm/mobile test src/conversations/components/MessageList.spec.tsx`; 1 fail, extra scaleY transform | same command green after `914a8612`; rendered style assertion, actual upright appearance pending device |
| Defect 4, Android permission/grant | `1aa5b413`; `pnpm --filter @auto-tm/mobile test src/notifications/useChatPushTokenRegistration.spec.tsx`; 2 fail, denied returned and token not registered | same command 9 pass after `c8dc4ed2`, including unchanged iOS denial |
| Defect 4, first send from Listing | `b2d85e98`; `pnpm --filter @auto-tm/mobile test test/screens/conversation-by-id.spec.tsx`; 1 fail, token registration never reaches API | same command green after `c6daf337`, grant posts native token to `/notifications/tokens` |
| Defect 2, composer | `1f0033fe`; `pnpm --filter @auto-tm/mobile test test/screens/conversation-by-id.spec.tsx`; Android fails, active avoidance only encloses footer; iOS passes | same command green after `8196d1ca`; native layout pending |
| Defect 2, both report sheets | `eb727bc2`; `pnpm --filter @auto-tm/mobile test src/admin/components/report-success.spec.tsx`; 4 fail, no KeyboardAvoidingView | same command 13 pass after `9ddaf58a`; real sheet composition, scrollable details and pinned enabled Submit on both platforms; native layout pending |

Focused acceptance aggregate **132 tests pass**; affected adjacent gate **47 files / 566 tests pass**. Full local logs are in `/tmp/issue-756-*.log`; this file preserves the red checkpoints, exact commands and concise outcomes. Hosted full-suite evidence is linked above. Render hosts prove component wiring, actions and supplied styles; they do not emulate keyboards, portals, virtualization or native permission dialogs.

## Device verification pass

1. Use the second-pass Android 16 edge-to-edge development/release build with these JS fixes. Fresh app data, sign in, open another seller's Listing and Message without visiting the Messages tab first. Empty text must be upright. Type a multiline draft with the keyboard open. Capture composer, typed text and enabled Send above the keyboard; send once.
2. The notification system prompt must appear after that send. Grant it. With a Firebase-configured build, verify a native FCM token is registered on the API. A local build without Firebase config can prove the prompt but cannot prove token acquisition or remote delivery. On fresh data separately deny the prompt, send again and reopen Messages; no repeated request or blocked chat.
3. In an existing thread send distinct text once with keyboard open and once after scrolling into older history. Each bubble must appear immediately at the bottom, remain after keyboard dismissal, and appear exactly once after reopening. Repeat with an image and with a disconnected socket/HTTP fallback if the test environment can force it. Long-press a just-acknowledged own Message, verify Copy and Delete, confirm Delete and check it is redacted even before its server echo. Receive a Message while reading older history and verify no forced jump.
4. Conversation menu > Report > Other, type details; Submit must remain above the keyboard while reasons/details scroll. Submit one report and verify confirmation. Repeat for long-press peer Message > Report message > Other. Verify typed details survive scrolling and Submit works with keyboard still open.
5. Repeat composer/report layouts in light and dark themes, large text, portrait small screen and rotation. Capture screenshots. Repeat composer send and both report forms on iOS for native regression proof.

## Local verification commands

- `pnpm install --frozen-lockfile` and `pnpm --filter @auto-tm/contracts build`: pass.
- `pnpm --filter @auto-tm/mobile exec vitest run src/conversations src/admin/components src/notifications src/api/conversations test/screens/conversation-by-id.spec.tsx test/screens/conversation-detail.spec.tsx test/screens/chat-tab.spec.tsx test/routes/conversations-toast.spec.tsx test/routes/conversations-draft.spec.tsx --maxWorkers 1 --minWorkers 1`: 566 pass / 47 files.
- `pnpm --filter @auto-tm/mobile typecheck`: pass after fixing a test tuple narrowing error.
- `pnpm --filter @auto-tm/mobile exec eslint <all 12 changed mobile TS/TSX paths>`: pass, zero warnings.
- `CI=1 pnpm --filter @auto-tm/mobile exec expo install --check`: dependencies up to date.
- `CI=1 pnpm --filter @auto-tm/mobile exec expo export -p ios --clear --max-workers 1 --no-bytecode --output-dir /tmp/issue-756-ios-export`: pass, 5.9MB JS bundle. This compiles no native runtime.
- `git diff --check`: pass. No forbidden-file or dependency changes; worktree clean.

## Single review-fix round

All three findings accepted and fixed in `3c1617d7`. The review-regression red tests were committed/pushed first at `c9239376`. The report tests additionally underwent an explicit temporary opt-out mutation: removing both avoidKeyboard props caused four failures at enabled=true, then restoration yielded 13/13 pass. This is a test-sensitivity check, not a claimed reproduction on a device. Scope remained within the accepted findings; no re-review and no formal review request.

The implementation head is `3c1617d76b10b5e619969ce86c10b8909c867ad0`. Hosted full `pr` passed at this code head: [run 37736170987](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37736170987). Repository lint, typecheck, tests and the admin session/runtime checks all passed. This documentation is pushed separately after that green code run; its docs-lane result remains in the mutable PR Execution state.

## Documentation sources and remaining evidence

Context7 IDs: `/react/react-native-website`, `/expo/expo/__branch__sdk-55`, `/tanstack/query`, `/vitest-dev/vitest`, `/nativewind/nativewind/nativewind_4.2.0`. Queries verified keyboard ownership and offsets, list inversion/scrolling, permission/channel/token ordering, mutation-cache timing, worker limits and JS-only export. No unavailable-server fallback was needed. Some versioned results included main-branch excerpts; installed RN 0.83.10, expo-notifications 55.0.27, Query 5.100.10 and CSS-interop 0.2.4 sources checked the actual operations. Android VirtualizedList uses a platform counter-inversion, which the empty component's explicit transform overrode. No NativeWind v5 APIs were used.

All four defect paths have rendered/source-level or hook evidence; native acceptance remains pending. The host renderer does not model keyboard coordinates, portal measurement, virtualization, system permission dialogs, FCM/APNS acquisition or native iOS layout. The reserved second-pass owner must execute the listed steps and attach new screenshots. The local release-pass build lacks Firebase configuration, so notification grant can be observed there but token acquisition and remote delivery need a configured build. This PR stays draft, without review requests or auto-merge.

The production exception to the assigned paths is the small default-disabled `avoidKeyboard` option in `components/ui/sheet.tsx`, required for the full portal viewport. Native host setup and existing screen tests are the other mechanical exceptions. Call handling, identity, Listing implementation, auth components and app.config.js remain untouched. No migrations, dependency changes, native builds or permission-audit changes are included.

## Hosted documentation evidence

The documentation-only checkpoint `bd2dfae5d16be19fa0d7fc6e9f1e9b112febfe1d` passed the required `pr` check in [run 37737214406](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37737214406). `Docs checks` passed and repository lint/typecheck/tests were skipped in the short docs lane, following the full green implementation run. This final evidence correction is another separate docs-only checkpoint after that completed green docs run. The current head/check and remaining device acceptance are tracked in the PR's single Execution state.
