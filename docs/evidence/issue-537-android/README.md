# Issue 537 Android evidence

App JavaScript and real PR550 backend commit: `5e1b282d2b88b20eb835d9fdf408747545ff71ca`.

Android Medium_Phone_API_36.1, emulator-5554, software renderer. Existing AutoTM debug APK native build provenance is unverified. Native dependency/config inputs have no diff between candidate prior build `c69df53` and this app commit. Metro used the owned worktree and port8092. Frozen install, contracts build and CI Expo install check passed.

PR environment `6bb10ab7-29c0-40e3-a12a-638d854e034a`; API deployment `a8ae8d66-0375-4a0c-a203-0ac581d13cd0`; worker deployment `d8eb25af-9980-478a-b411-ee5c3d59aa77`. Coordinator verified SUCCESS, exact /readyz SHA and completed seed before tests. Media and uploads use real PR550 services.

Each *-server.json is an actual public GET /api/v1/listings/:id read-back, trimmed to listing ID and media ID/key/sortOrder. No mock backend was used.

- State1 baseline: two persisted Sportage photos.
- State2: native library selection, upload, drag new photo to cover, remove original front photo, Done and Save. Server new attachment a7ee93ad is order0, retained original f923ae09 order1, removed original02cf3d0f absent.
- State3: session transport proxy forwarded successful attach317b9dfa and its complete response, then denied subsequent API calls and any in-flight GET response. The attach invalidation GET and reorder were blocked, keeping the seed stale. Banner shows succeeded fields/attach and failed order. Server new key occurs once.
- State3b: still transport-offline, return to Photos step2, drop just-attached last photo. Restore API transport and press header Retry on step2. Server317b9dfa is gone, retained row IDs/order unchanged, no duplicate attachments.
- State4 independent unchanged Retry: pass. Fresh edit session after state3b, explicit native removal of the same leftover local orphan, then add one new photo. Fault after successful attach59f0765e. Restore API and press Retry without editing. Server retains exactly3 rows, same IDs and order before/after Retry. Successful transport operations show only reorder on Retry, no second fields PATCH or attachment.
- State5 reopened saved order: blocked by the staging issue below.

## Reopen staging limitation

Unmodified reopen after state2 shows the correct two server photos plus one extra pending local staging photo and permanent `1 Uploading...`, which disables Save. This is a failure, not a pass. Native UI removal of that extra local photo was the explicit workaround before state3. No application source or native configuration was changed.

Repro: add local photo, save edit successfully, navigate to public detail, press Edit, open Photos. The previous staging file remains under files/listing-staging/edit-{listingId}/{localPhotoId}.jpg. `useUploadQueue.ts:100-127` reconstructs from local files; `queueState.ts:79-88` appends local IDs absent from the server payload as `selected`, with no localUri. `finishSave` in edit.tsx navigates without staging cleanup. Server IDs differ from local staging IDs after attach, so that saved local file is now an unmatched orphan. #538 criterion3 covers successful-save/session-baseline reconciliation. A fresh independent Spec review must judge the observed limitation.

The state3b offline screenshot is before the drop tap and proves header Retry on the non-review step. The drop and successful completion are evidenced by the DELETE317b9dfa operation and final2-row GET plus public detail screenshot. No post-drop pre-Retry screenshot was captured.

State5 was re-captured after state4. The server retains3 saved rows while the edit screen shows the3 saved photos plus2 orphan pending local photos (`2 Uploading...`). Reopen remains blocked.

The sanitized-media-operations.json file contains successful listing mutation metadata only, stripped to media IDs/keys/order. It shows exactly3 successful attaches across all three distinct runs and no second attach on either Retry. Raw proxy logs stay private in /tmp.

Context7 consulted /expo/expo/__branch__sdk-55 for Expo checks/env and /react/react-native-website for custom Metro host/port and adb reverse. No application source or signing data changed. Session complete; owned Metro/proxy stopped and worktree unlocked.
