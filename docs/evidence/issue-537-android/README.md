# Issue 537 Android evidence

App JavaScript and real PR550 backend commit: `5e1b282d2b88b20eb835d9fdf408747545ff71ca`.

Android Medium_Phone_API_36.1, emulator-5554, software renderer. Existing AutoTM debug APK native build provenance is unverified. Native dependency/config inputs have no diff between candidate prior build `c69df53` and this app commit. Metro used the owned worktree and port8092. Frozen install, contracts build and CI Expo install check passed.

PR environment `6bb10ab7-29c0-40e3-a12a-638d854e034a`; API deployment `a8ae8d66-0375-4a0c-a203-0ac581d13cd0`; worker deployment `d8eb25af-9980-478a-b411-ee5c3d59aa77`. Coordinator verified SUCCESS, exact /readyz SHA and completed seed before tests. Media and uploads use real PR550 services.

Each *-server.json is an actual public GET /api/v1/listings/:id read-back, trimmed to listing ID and media ID/key/sortOrder. No mock backend was used.

- State1 baseline: two persisted Sportage photos.
- State2: native library selection, upload, drag new photo to cover, remove original front photo, Done and Save. Server new attachment a7ee93ad is order0, retained original f923ae09 order1, removed original02cf3d0f absent.
- State3: session transport proxy forwarded successful attach317b9dfa and its complete response, then denied subsequent API calls and any in-flight GET response. The attach invalidation GET and reorder were blocked, keeping the seed stale. Banner shows succeeded fields/attach and failed order. Server new key occurs once.
- State3b: still transport-offline, return to Photos step2, drop just-attached last photo. Restore API transport and press header Retry on step2. Server317b9dfa is gone, retained row IDs/order unchanged, no duplicate attachments.
- State4 independent unchanged Retry: pending.
- State5 reopened saved order: blocked by the staging issue below.

## Reopen staging limitation

Unmodified reopen after state2 shows the correct two server photos plus one extra pending local staging photo and permanent `1 Uploading...`, which disables Save. This is a failure, not a pass. Native UI removal of that extra local photo was the explicit workaround before state3. No application source or native configuration was changed.

Repro: add local photo, save edit successfully, navigate to public detail, press Edit, open Photos. The previous staging file remains under files/listing-staging/edit-{listingId}/{localPhotoId}.jpg. `useUploadQueue.ts:100-127` reconstructs from local files; `queueState.ts:79-88` appends local IDs absent from the server payload as `selected`, with no localUri. `finishSave` in edit.tsx navigates without staging cleanup. Server IDs differ from local staging IDs after attach, so that saved local file is now an unmatched orphan. #538 criterion3 covers successful-save/session-baseline reconciliation. A fresh independent Spec review must judge the observed limitation.

This checkpoint contains no secrets, application code changes, proxy logs or signing data. Retry proof is still in progress.
