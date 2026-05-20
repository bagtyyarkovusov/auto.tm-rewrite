# mobile/listings — CONTEXT

> Current implemented state per [ADR-0019](../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in the sprint files under [`docs/prd/sprints/`](../../../../docs/prd/sprints/).

## Purpose

Client-side listing creation and upload pipeline for the Expo mobile app. Three subsystems: the wizard state machine (step flow + validation), the media upload pipeline (compress + stage + upload), and autosave (debounced draft persistence with retry).

## Module shape (today)

- `apps/mobile/src/listings/`
  - `wizard/` — wizard state machine + autosave + step UI components
    - `wizardMachine.ts` — reducer-based state machine (not XState)
    - `useWizardAutosave.ts` — debounced PATCH with exponential-backoff retry
    - `wizardMachine.spec.ts` — unit tests for reducer
    - `useWizardAutosave.spec.tsx` — tests for save lifecycle
    - `Step1Vin.tsx` … `Step8Review.tsx` — step UI components with design-matched styling (`font-uber` titles, `gap-6` spacing, `gray-500/600` muted text, `error` semantic tokens)
    - `WizardLayout.tsx` — shell with design-matched header (back + overflow menu + centered route title), 2px black progress bar, 52px rounded-full footer buttons (Back outline / Continue filled), save status indicator, error banner, discard confirmation dialog
    - `PhotoThumbnail.tsx` — photo grid item (`w-[48%] aspect-square`, `rounded-lg`, grayscale placeholder bg) with state overlay and reorder menu
    - `PhotoStateOverlay.tsx` — per-photo upload-state badge using grayscale + semantic tokens (black checkmarks, error red for failures, white text on dark overlays)
    - `PickerRow.tsx` — shared picker primitive: `h-[52px]`, `rounded-lg`, `border-gray-200`, `text-[17px]` value text
  - `uploadStaging/` — media upload pipeline
    - `types.ts` — `PhotoState`, `UploadErrorCode`, `StagedPhoto`, `UploadQueue`, `PublishGateResult`
    - `useUploadQueue.ts` — orchestrator hook: compress → presign → PUT → track
    - `compressor.ts` — `expo-image-manipulator` chain API (resize ≤2400px, JPEG 0.8, re-compress at 0.6 if >5 MB)
    - `queueState.ts` — pure state machine: `PhotoUploadReducer` (discriminated-union actions) + helpers: `updatePhotoState`, `removePhotoFromQueue`, `reorderPhotos`, `reconstructQueueFromDraft`, `computePublishGate`
    - `uploadErrors.ts` — `buildUploadError` classifies caught errors into `UploadErrorCode`
    - `stagingDir.ts` — file-system path helpers: `getStagingPath`, `ensureDraftDir`, `deleteDraftDir`, `listDraftDirs`
    - `appStateResume.ts` — `AppState` + NetInfo listeners to auto-resume uploads
    - `orphanCleanup.ts` — deletes staging dirs for drafts that no longer exist

## 1. Media upload pipeline

### Photo lifecycle (9 states)

```
selected → compressed → presigned → uploading → uploaded → attached
             ↓             ↓           ↓
           failed ←──────────←──────────┘
             ↓
   waiting_for_network
             ↓
           lost (unrecoverable — no local file, no server key)
```

| State | Meaning | Trigger |
|---|---|---|
| `selected` | Picked from gallery; no file yet in staging | `addPhoto()` |
| `compressed` | Resized + JPEG-compressed; staged at `listing-staging/{draftId}/{photoId}.jpg` | `compressPhoto()` success |
| `presigned` | MinIO presigned PUT URL obtained | `/uploads/presign` response |
| `uploading` | Binary PUT to MinIO in progress | `FileSystem.uploadAsync` started |
| `uploaded` | PUT succeeded; `key` (MinIO object key) set | PUT 2xx |
| `attached` | API confirmed media row created | `reconstructQueueFromDraft` when `key` exists |
| `failed` | Any step errored; may be retryable | caught exception |
| `waiting_for_network` | Network dropped mid-upload | NetInfo reports disconnected |
| `lost` | Photo referenced in draft payload but local file missing and no server `key` | `reconstructQueueFromDraft` when neither local file nor `key` exists |

### StagedPhoto shape

```typescript
interface StagedPhoto {
  photoId: string;
  localUri?: string;       // staging dir path after compression
  key?: string;            // MinIO object key after upload
  uploadUrl?: string;      // presigned PUT URL
  state: PhotoState;
  width?: number;
  height?: number;
  fileSize?: number;
  sortOrder: number;
  retryCount: number;
  error?: UploadError;
}
```

### Error codes

| Code | Produced by | Retryable | Auto-resume? |
|---|---|---|---|
| `COMPRESSION_FAILED` | (defined in types; not currently produced by `buildUploadError`) | yes | no |
| `LOCAL_FILE_MISSING` | `CompressionError` or missing `localUri` / missing file on disk | no | no |
| `PRESIGN_FAILED` | API 4xx/5xx on `/uploads/presign` | yes | yes |
| `PUT_FAILED` | MinIO PUT 4xx/5xx | yes | yes |
| `NETWORK_ERROR` | fetch/TypeError/connectivity keywords | yes | yes |
| `RATE_LIMITED` | API 429 on presign | yes | no (skipped) |
| `UNKNOWN` | catchall | yes | yes |

### File system layout

```
${documentDirectory}/
  picker-temp/                     ← ephemeral; copies of picker URIs before compression
  listing-staging/
    {draftId}/
      {photoId}.jpg                ← compressed, staging; persists until attached
```

### Concurrency model

- **Compression**: unlimited parallel (all selected photos compress via `Promise.all`)
- **Uploads**: max 2 concurrent (`MAX_CONCURRENT = 2` in `useUploadQueue`)
- Upload queue is FIFO; `processUploadQueue` drains recursively via `.finally()`

### Publish gate

Blocks publish button unless ALL of:
- ≥1 photo exists in queue
- No photos in `selected`, `compressed`, `presigned`, or `uploading` state
- No photos in `failed` state
- ≥1 photo in `attached` or `uploaded` state

### Auto-resume

Two event sources in `appStateResume.ts`:
- **App foreground**: `AppState` "active" → check `NetInfo.fetch()` → resume if connected
- **Network available**: `NetInfo.addEventListener` → resume immediately

Resume logic: enqueues photos in `compressed`, `waiting_for_network`, or `failed` (if `retryCount < 2` and `isRetryable`). Skips `RATE_LIMITED` and non-retryable errors.

### Orphan cleanup

`cleanupOrphanDraftDirs(existingDraftIds)` runs on app launch. Lists all directories under `listing-staging/`, deletes any whose `draftId` has no matching draft.

### State reconstruction on resume

`reconstructQueueFromDraft(draftId, payload, localPhotoIds)`:
- Photo has `key` → state = `attached`
- Photo has local file → state = `compressed` (re-enqueued for upload)
- Neither → state = `lost` (unrecoverable)

## 2. Wizard state machine

Reducer-based stepper in `wizardMachine.ts`. Not XState — a pure `(state, action) → state` function with a `buildMachineContext()` selector for derived UI state.

### Machine status

`idle → loading → step ⇄ saving ⇄ saveError`
`step → publishing → complete | publishError`
`any → idle (DISCARD)`

### Steps

The wizard ships eight steps in the contract enum: seven data steps + a final `review` summary step. This diverges from the original wireframe + hifi spec (which wraps Review into Step 7); see [sprint-04 retro](../../../../../docs/prd/sprints/sprint-04-listings-crud-retro.md) for the closure-time decision and rationale.

| Index | Step name | Required fields | Validation |
|---|---|---|---|
| 0 | `vin` | `vin?` (optional) | max 17 chars |
| 1 | `photos` | `photos[]` with `key` | ≥1 uploaded photo |
| 2 | `vehicle` | `brandId`, `modelId`, `year` | all required + valid UUIDs; `generationId` optional |
| 3 | `specs` | `condition` | `mileageKm` required when `condition='used'`; color/body/transmission/drive/engine/power optional |
| 4 | `price` | `priceAmount`, `priceCurrency` | amount > 0, ≤ 999,999,999 |
| 5 | `location` | `regionId`, `cityId` | both required; `locationText` optional |
| 6 | `contact` | `description`, contact prefs | description 1–2000 chars; `allowCalls \|\| allowChat` |
| 7 | `review` | (no fields of its own) | summary screen; Publish requires all 7 data steps validated |

### Step dependency graph

From `packages/contracts/src/schemas/wizard.ts` (shared between mobile + API):

```
vin:      []
photos:   [vin]
vehicle:  [vin, photos]
specs:    [vin, photos, vehicle]
price:    [vin, photos, vehicle, specs]
location: [vin, photos, vehicle, specs, price]
contact:  [vin, photos, vehicle, specs, price, location]
review:   [vin, photos, vehicle, specs, price, location, contact]
```

### Cascade invalidation

When a field changes → its owning step is invalidated → all downstream steps lose validation.

Example: changing `brandId` invalidates `vehicle` → cascades to `specs`, `price`, `location`, `contact`, `review`.

Implemented in `UPDATE_FIELDS` action via `getInvalidatedSteps(changedFields)` from `@auto-tm/contracts`.

### Navigation rules

- **Backward**: always allowed (no validation check)
- **Forward via NEXT**: validates current step first; blocks if invalid. On `review`, NEXT is a no-op — Publish is the only action.
- **Forward via GO_TO_STEP**: allowed only if all target step's dependencies are in `validatedSteps`
- **Review**: reachable only when all 7 data steps are in `validatedSteps`; Publish requires the same condition

### Resume logic

`INIT` action: loads draft payload → extracts `validatedSteps[]` → resumes at the first unvalidated step up to the previously-reached step. Handles legacy numeric `currentStep` (1–7) via `mapLegacyStep()`.

### Derived context (`buildMachineContext`)

```typescript
interface WizardMachineContext {
  state: WizardMachineState;
  canContinue: boolean;                // current step valid (false on review — Publish handles advance)
  canPublish: boolean;                  // on review + all data steps validated
  canGoBack: boolean;                   // index > 0 and status === "step"
  stepErrors: string[];                 // current step's Zod errors, flat list
  fieldErrors: Record<string, string>;  // current step's Zod errors keyed by field path
  isLastStep: boolean;                  // currentStep === "review"
  progressPercent: number;              // position-based: (stepNumber / 8) × 100
  stepNumber: number;                   // 1..8, currentIndex + 1
  stepCount: number;                    // 8 (WIZARD_STEPS.length)
}
```

### Error display rule

Each step renders its own field errors inline directly under the relevant Input/Picker, reading from `WizardMachineContext.fieldErrors[fieldPath]`. The Vehicle step gates required-field errors until the user has either attempted Continue on the step or interacted with that specific field, so selecting Brand does not immediately reveal downstream Model/Year errors. The shared `WizardLayout` does **not** render `stepErrors` as a global list; layout-level error UI is reserved for the save banner (network / autosave failures) and a one-line `disabledReason` helper below a disabled Continue/Publish button after an attempted advance. This is the divergence point from the original spec's "global errors block at top of step body" pattern — see [sprint-04 retro](../../../../../docs/prd/sprints/sprint-04-listings-crud-retro.md).

### Shared schema authority

`packages/contracts/src/schemas/wizard.ts` is the single source of truth for step names, step validation schemas (Zod), dependency graph, and invalidation logic. Both mobile and API (`UpdateDraft`, `ValidateDraftStep`) consume it.

## 3. Autosave

`useWizardAutosave(draftId)` — debounced PATCH to `/api/v1/listings/drafts/:id` with exponential-backoff retry and network-aware auto-retry.

### Status lifecycle

```
idle → saving → idle (success)
idle → saving → saving (retry 1/3) → saving (retry 2/3) → saving (retry 3/3) → error
error → saving (manual retrySave or network available)
```

### Timing

| Parameter | Value |
|---|---|
| Debounce delay | 500 ms |
| Max retries | 3 |
| Retry delays | 1000 ms, 2000 ms, 4000 ms (exponential) |

### Methods

- `save(payload)` — debounced; resets retry counter
- `forceSave(payload)` — flushes debounce timer + immediate save; used on step transition and before publish
- `retrySave()` — manual retry from error state; resets retry counter

### Network awareness

- `NetInfo.addEventListener` tracks connectivity via `isOnlineRef`
- When offline: save error shows "Will retry when online"
- When back online + pending payload + status is error: auto-retries with reset retry counter

### Pending payload tracking

`pendingPayloadRef` holds the last payload attempted. On retry (manual or auto), the pending payload is re-sent — no data loss between debounce and failure.

## 4. Platform invariants — DO NOT REMOVE

These workarounds exist because of iOS-specific runtime behavior discovered on-device during S4 (#116–#120). Removing them will reintroduce the bugs.

### 4.1 Copy picker URIs before compression

**What**: All picker URIs are copied to `${documentDirectory}picker-temp/` before parallel compression starts. Temp copies are cleaned up after compression completes.

**Why**: iOS purges the picker cache directory under memory pressure. When multiple photos are selected and compressed in parallel via `Promise.all`, later compressions can find their source URI deleted because iOS reclaimed the cache while earlier compressions were running. (#119 / `ebd00f5`)

**Hardening path**: After each `copyAsync` to `picker-temp/`, verify the copy exists with `getInfoAsync`. Fail fast with `LOCAL_FILE_MISSING` if the copy is missing, instead of discovering the failure mid-compression.

### 4.2 moveAsync fallback to copyAsync

**What**: `compressor.ts` tries `moveAsync` to transfer the compressed file to the staging directory. On failure, falls back to `copyAsync`. Verifies destination exists after either operation.

**Why**: `FileSystem.moveAsync` fails silently on some iOS versions when crossing filesystem boundaries (e.g., cache → documents). (#118 / `d42b6e8`)

**Hardening path**: Remove `moveAsync` entirely. Always use `copyAsync` — it works reliably across filesystem boundaries and the performance cost on a ≤5 MB JPEG is negligible. One code path instead of two.

### 4.3 useRef counter for parallel compression tracking

**What**: `compressingCount` is a `useRef<number>` counter, not a `useState<boolean>`. The React state `isCompressing` toggles only at the 0→1 and 1→0 boundary crossings.

**Why**: A boolean `useState` flag cannot track multiple concurrent async operations. When N photos compress in parallel and the first one finishes, `setIsCompressing(false)` fires while N-1 compressions are still running. This caused the UI to incorrectly show compression as complete. (#120 / `16c44b7`)

**Hardening path**: Extract into a `useAsyncCounter()` hook with a clear name (`{ increment, decrement, isActive }`) so the intent is obvious and the pattern is reusable.

### 4.4 expo-image-manipulator contextual chain API

**What**: `compressor.ts` uses `ImageManipulator.manipulate(uri).resize().renderAsync().saveAsync()` — the contextual chain API.

**Why**: The previous `manipulateAsync()` top-level function was deprecated in Expo SDK 55. The chain API is the only supported surface. (#116 / `dda8537`)

**Hardening path**: No code change needed — this is the correct API. On any Expo SDK upgrade, re-verify via Context7 (`resolve-library-id` → `query-docs` for `expo-image-manipulator`) before assuming the chain API is unchanged.

## Notable decisions

- [ADR-0008](../../../../docs/adr/0008-media.md) — Direct-to-MinIO upload, eager Sharp variants (server-side)
- [ADR-0019](../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state only
- API-side listings context: [`apps/api/src/modules/listings/CONTEXT.md`](../../../api/src/modules/listings/CONTEXT.md)
