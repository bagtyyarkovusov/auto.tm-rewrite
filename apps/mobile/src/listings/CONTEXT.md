# mobile/listings — CONTEXT

> Current implemented state per [ADR-0019](../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in the sprint files under [`docs/prd/sprints/`](../../../../docs/prd/sprints/).

## Purpose

Client-side listing creation + upload pipeline + feed browsing + search filters for `apps/mobile`. Five subsystems: the **wizard** (step navigation + contracts validation), **media upload staging** (compress → presign → PUT), **autosave** (debounced draft persistence + retry), **feed** (chronological listing cards via `useListings`), and **search** (filter sheet with draft/active state).

**Single wizard shell today** — create and edit share `wizardMachine` + `WizardLayout`, but persistence and photos differ by flow:

| Flow | Primary route | Wizard state | Photos |
|---|---|---|---|
| **Create draft / publish** | `app/(tabs)/sell.tsx` | `wizardMachine` reducer (`wizardMachine.ts`) | `useUploadQueue` wired end-to-end |
| **Edit published listing** | `app/listings/[id]/edit.tsx` | `wizardMachine` reducer initialized with `mode: "edit"`, `listingId`, and `entryStep: "review"`. Edit opens at Review (Step 8/8); section Edit affordances detour to shared step bodies; detour footer shows single Done action back to Review. Field edits stay local until **Save changes**, then direct `PATCH /listings/:id` through `useEditListing`; no `ListingDraft` or autosave is created for published edits. | `useUploadQueue('edit-' + listingId, payload)` wired end-to-end. Existing media seeds the queue in `attached` state via `reconstructQueueFromListing`. New uploads compress + PUT immediately for responsiveness. Removed photos are dropped from the local queue only; actual `DELETE /listings/:id/media/:mediaId` is deferred to the Save changes orchestrator (A4). Reordered photos update local `sortOrder` only; actual `PUT /listings/:id/media/order` is deferred to A4. |

## Module shape (today)

- `apps/mobile/src/listings/`
  - `feed/` — public feed card components
    - `ListingCard.tsx` — cover image (`expo-image` `list` variant) + derived title + price + status badge + city
    - `FeedSkeleton.tsx` — skeleton rows for initial load
    - `FeedEmpty.tsx` — empty feed CTA to Sell tab
    - `FeedError.tsx` — retry affordance on network/API failure
  - `search/` — feed filter sheet + filter state hook
    - `useListingFilters.ts` — hook managing `draft` (in-progress edits), `active` (committed filters), `setField`, `apply`, `reset`, `count`, and `isValid`. Filter type inferred from `@auto-tm/contracts` `ListingFilterSchema`. Apply commits draft → active; reset clears both. `isValid` is `false` when `yearMin > yearMax`.
    - `useListingFilters.spec.ts` — unit tests for apply/reset/count transitions, draft/active isolation, and `isValid` logic.
    - `FilterSheet.tsx` — RNR `Sheet` shell hosting `BrandModelFilterControl`, `CityFilterControl`, `PriceRangeFilterControl`, `YearRangeFilterControl`, and `ConditionFilterControl`. Apply closes the sheet and is disabled when `isValid` is `false` or any control reports invalid (price-range min > max); Reset clears all filters. Active-filter count is surfaced on the Search tab trigger via a `Badge`.
    - `BrandModelFilterControl.tsx` — Brand→Model filter control: two `PickerRow`s + two `CatalogPickerSheet`s. Reuses `useBrands()` and `useModels(brandId)` with hardcoded `"ru"` locale. Model row disabled until brand selected; selecting a brand clears any previously selected model. Writes `brandId`/`modelId` to filter draft via `setField`.
    - `BrandModelFilterControl.spec.ts` — static source tests verifying picker wiring, cascade rule, and loading/error/empty states.
    - `CityFilterControl.tsx` — Region → City drilldown control for the filter sheet. Uses `useRegions` + `useCities(regionId)` to populate searchable `CatalogPickerSheet`s. Only `cityId` is written to the draft; regionId is local state used solely to fetch the city list. A module-level `cityMetaCache` preserves the selected city name across sheet close/open cycles.
    - `CityFilterControl.spec.tsx` — source-code analysis tests for the control structure, drilldown behavior, selection/clear logic, and picker state wiring.
    - `PriceRangeFilterControl.tsx` — two RNR `Input` fields (`keyboardType="number-pad"`) for `priceMin`/`priceMax` in TMT. Digits-only; empty = unbounded. Inline `text-destructive` error when `min > max`; signals validity to the sheet host via `onValidityChange`.
    - `PriceRangeFilterControl.spec.tsx` — source-assertion tests for input structure, digit stripping, validation logic, and FilterSheet integration.
    - `YearRangeFilterControl.tsx` — two `Input` fields (`number-pad`, 4-digit) for `yearMin`/`yearMax`. Digits-only, clamped to 1900–current year + 1. Open-ended when either bound is empty. Inline `text-destructive` error when `yearMin > yearMax`. Local text state syncs with external draft changes (e.g. reset).
    - `YearRangeFilterControl.spec.tsx` — source tests + `parseYearInput` behavioral tests for bounds and digit stripping.
    - `yearRangeFilterLogic.ts` — pure `parseYearInput` helper with digit stripping, 4-digit requirement, and 1900–current-year+1 clamping.
    - `ConditionFilterControl.tsx` — tri-state segmented control (Any / New / Used) for the `condition` filter. Any clears the field from the draft; New/Used write the corresponding `ListingCondition` enum value. Selected segment is visually distinct (`bg-card` foreground vs `text-muted-foreground`).
    - `ConditionFilterControl.spec.tsx` — unit tests for segment rendering, selection state, and onChange callbacks.
  - `detail/` — buyer listing detail helpers
    - `useCatalogMaps.ts` — resolves catalog IDs (brand, model, generation, color, bodyType, transmission, driveType, engineType, region, city) to display names using existing public catalog hooks; falls back to raw ID when catalog data is loading
    - `buildVariantUrl.ts` — constructs `expo-image` URLs from MinIO keys and variant names (`detail`, `fullscreen`, etc.)
  - `components/` — shared listing display components (used by feed + detail + management)
    - `PhotoGallery.tsx` — horizontal paging gallery (`FlatList` + `expo-image` `detail` variant) with dot indicator; tap opens fullscreen modal (`fullscreen` variant); no-media fallback renders "No photos"
    - `PriceDisplay.tsx` — public/buyer TMT-only price + owner asymmetric mode (TMT primary + original currency secondary for USD/AED) + conditional seller-term badges (`Exchange possible`, `Installment possible`)
    - `SellerBlock.tsx` — private seller label + location context (region/city/locationText) + contact phone when calls enabled; no avatar/tenure/response time (backend lacks rich seller profile in S4)
    - `ContactCtaBar.tsx` — sticky bottom CTA bar: Call (`tel:` via `expo-linking`, disabled when sold/no-phone/allowCalls=false), Message (disabled, "Chat coming soon"), Share (`react-native` `Share`), Favorite (disabled, "Favorite coming soon")
    - `ListingDetail.tsx` — full detail composition: title (year + brand + model + generation), sold badge, price block, spec grid (year, condition, mileage, transmission, drive, engine, power, color, body type, VIN — conditional on presence), description, seller block; branches between buyer (`SellerBlock`) and owner (`OwnerActions`) presentation via `isOwner` prop
    - `OwnerActions.tsx` — status-aware owner controls on detail (Edit, Mark sold, Archive, Republish, Delete) with `AlertDialog` confirmations; disables while pending and invalidates feed/detail/management caches on success
    - `OwnerListingCard.tsx` — feed-card visual language adapted for owner management with status badge, Open and Edit actions
    - `DraftCard.tsx` — draft row/card with draft identity, progress, photo count, Resume CTA, and destructive Discard with `AlertDialog` confirmation
  - `wizard/` — wizard state machine + autosave + step UI components
    - `wizardMachine.ts` — reducer-based state machine (not XState)
    - `useWizardAutosave.ts` — debounced PATCH with exponential-backoff retry
    - `wizardMachine.spec.ts` — unit tests for reducer
    - `useWizardAutosave.spec.tsx` — tests for save lifecycle
    - `Step1Vin.tsx` … `Step8Review.tsx` — step UI bodies. Design system conventions: single-source-of-truth title in `WizardHeader` (`text-2xl font-heading`), body opens directly with form rows or brief `text-sm text-muted-foreground` orientation copy, body (`gap-5 py-5`), field groups (`gap-1.5`), 52px inputs, pill-shaped buttons.
    - `WizardLayout.tsx` — shell with Next/Back navigation (sub-components: `WizardHeader`, `SaveStatusIndicator`, `SaveErrorBanner`, `WizardFooter`, `DiscardConfirmationDialog`). Footer buttons are 52px pill-shaped (`h-[52px] rounded-full`). Overflow button opens `WizardOverflowMenu` sheet first; "Discard draft" inside the sheet opens `DiscardConfirmationDialog`. Dialog shows loading spinner + "Discarding…" and error text when discard mutation is pending or fails.
    - `PhotoThumbnail.tsx` — photo grid item with state overlay and reorder menu
    - `PhotoStateOverlay.tsx` — per-photo upload-state badge (compressing, uploading, failed, cover, etc.)
    - `PickerRow.tsx` — shared pressable picker row (`components/listings/wizard/`). 52px height, border, chevron/lock icon, label + error + helper text support.
  - `uploadStaging/` — media upload pipeline
    - `types.ts` — `PhotoState`, `UploadErrorCode`, `StagedPhoto`, `UploadQueue`, `PublishGateResult`
    - `useUploadQueue.ts` — orchestrator hook: compress → presign → PUT → track. Signature is `useUploadQueue(stagingKey, payload)` where `stagingKey` is opaque to the queue (`draft-{draftId}` for create today; `edit-{listingId}` is reserved for edit media). **Exports `publishGate` — presently unused consumer-side.**
    - `useAsyncCounter.ts` — ref-based counter surfaced as `isCompressing` (**prevents overlapping parallel compress regressions**)
    - `compressor.ts` — `expo-image-manipulator` chain API (resize ≤2400px, JPEG 0.8, re-compress at 0.6 if >5 MB)
    - `queueState.ts` — pure state machine: `PhotoUploadReducer` (discriminated-union actions) + helpers: `updatePhotoState`, `removePhotoFromQueue`, `reorderPhotos`, `reconstructQueueFromDraft`, `reconstructQueueFromListing`, `computePublishGate`
    - `uploadErrors.ts` — `buildUploadError` classifies caught errors into `UploadErrorCode`
    - `stagingDir.ts` — file-system path helpers: `getStagingPath`, `ensureDraftDir`, `deleteDraftDir`, `listDraftDirs`; helper names still say "Draft" but accept any opaque staging key
    - `appStateResume.ts` — `AppState` + NetInfo listeners to auto-resume uploads and surface offline transitions
    - `orphanCleanup.ts` — deletes `draft-*` staging dirs for drafts that no longer exist and `edit-*` staging dirs for listings that no longer exist; unknown prefixes are logged and skipped

## 1. Media upload pipeline

### Photo lifecycle (9 states — design surface area)

Lifecycle diagram expresses everything the domain can represent. Runtime transitions upload-ready / in-flight photos into `waiting_for_network` when NetInfo reports offline; reconnect reuses the same resume collector.

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
| `compressed` | Resized + JPEG-compressed; staged at `listing-staging/{stagingKey}/{photoId}.jpg` | `compressPhoto()` success |
| `presigned` | MinIO presigned PUT URL obtained | `/uploads/presign` response |
| `uploading` | Binary PUT to MinIO in progress | `FileSystem.uploadAsync` started |
| `uploaded` | PUT succeeded; `key` (MinIO object key) set | PUT 2xx |
| `attached` | API confirmed media row created | `reconstructQueueFromDraft` when `key` exists |
| `failed` | Any step errored; may be retryable | caught exception |
| `waiting_for_network` | Network dropped while a photo was `compressed`, `presigned`, or `uploading` | `appStateResume` NetInfo listener calls `useUploadQueue`'s offline transition |
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
    draft-{draftId}/                ← create flow
      {photoId}.jpg                ← compressed, staging; persists until attached
    edit-{listingId}/               ← edit flow; wired in `edit.tsx` via `useUploadQueue('edit-' + listingId, payload)`
      {photoId}.jpg                ← compressed, staging; persists until attached
```

### Concurrency model

- **Calls into `useUploadQueue.addPhoto`**: unbounded parallelism can be triggered concurrently from UI — gallery flow fans out `Promise.all` over temp copies invoking `addPhoto` per URI.
- **`addPhoto` body**: sequentially compress → enqueue upload worker for that id (heavy CPU still overlaps across parallel invocations — watch device thermals during stress tests).
- **Upload drain**: capped at **`MAX_CONCURRENT = 2`** binary PUT workers. `isUploading` is derived from a `useAsyncCounter` (ref-based increment/decrement) so parallel uploads do not incorrectly clear the uploading flag when one of two concurrent uploads finishes.
- **`processUploadQueue`**: FIFO drain guarded by concurrency counter; completions chain via `.finally()` recursion.
- **PUT timeout**: each `FileSystem.uploadAsync` call is wrapped in `Promise.race` with a 60-second timeout. Timeouts throw `ApiError("NETWORK_ERROR", 0, "Upload timed out")` which `buildUploadError` maps to retryable `NETWORK_ERROR`.

### Publish gate (`computePublishGate`)

Pure helper evaluates whether **staging work is complete** regardless of reducer validation:

Blocks publish (**theoretical consumer contract**) unless ALL hold:

- ≥1 photo exists in queue
- No photos remain in `selected`, `compressed`, `presigned`, or `uploading`
- No photo is `failed`
- ≥1 photo is `attached` OR `uploaded`

**Consumption** — `publishGate` is wired into `sell.tsx` and `edit.tsx` AND-gated with Zod-derived `canPublish`. Publish / Save changes are disabled when uploads are in-flight or failed; Continue between steps remains Zod-only so users can fill other wizard steps while photos upload.

### Auto-resume

Two event sources in `appStateResume.ts`:
- **App foreground**: `AppState` "active" → check `NetInfo.fetch()` → resume if connected
- **Network available**: `NetInfo.addEventListener` → resume immediately

Resume logic: enqueues photos in `compressed`, `waiting_for_network`, or `failed` (if `retryCount < 2` and `isRetryable`). Skips `RATE_LIMITED` and non-retryable errors.

### Orphan cleanup

`cleanupOrphanDraftDirs(existingDraftIds, existingListingIds)` is called from `app/_layout.tsx` at authenticated app boot after `useMyDrafts` and `useMyListings` resolve.

Directory semantics:

- `draft-{id}` → orphan when the current user's draft IDs do not contain `id`
- `edit-{id}` → orphan when the current user's listing IDs do not contain `id`
- unknown prefix → logged and skipped; never deleted by this helper

Edit-session local removal: when an existing `attached` photo is removed in edit mode, `removePhoto` drops it from the local queue (no `localUri` to delete) but does **not** fire `DELETE /listings/:id/media/:mediaId`. The photo disappears from the grid and from the staged payload, but the server-side `ListingMedia` row and MinIO object remain until the Save changes orchestrator (A4) applies the batch. Cancel/discard should clear local edit staging (`edit-{listingId}/` dir) and best-effort clean newly uploaded media that never reached `AttachMedia`. Any remote object left without a `ListingMedia` row is a storage orphan for API/storage cleanup, not public listing media.

### State reconstruction on resume

`reconstructQueueFromDraft(stagingKey, payload, localPhotoIds)`:
- Photo has `key` → state = `attached`
- Photo has local file → state = `compressed` (re-enqueued for upload)
- Neither → state = `lost` (unrecoverable)

## 2. Wizard state machine

Reducer-based stepper in `wizardMachine.ts`. Not XState — a pure `(state, action) → state` function with a `buildMachineContext()` selector for derived UI state.

### Machine status

Documented reducer supports create and edit sessions through a `mode: "create" | "edit"` discriminator. `draftId` is populated for create; `listingId` is populated for edit. Autosave UI is owned entirely by TanStack-backed `useWizardAutosave` (local `useState`), so the reducer does not expose `saving`, `saveError`, `SAVE_SUCCESS`, or `SAVE_RETRY` branches.

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
- **Edit route** (`/listings/[id]/edit`): initializes with `mode: "edit"` and `entryStep: "review"`, marks all data steps validated from the published listing payload, disables Back, and uses Review section Edit affordances for detours. Detour steps use the same schemas; invalid edits block Done and show the step error. Valid detours return to Review via `GO_TO_STEP("review")`.

### Resume logic

`INIT` action: loads draft/listing payload → extracts `validatedSteps[]` → resumes at the first unvalidated step up to the previously-reached step. Handles legacy numeric `currentStep` (1–7) via `mapLegacyStep()`. In edit mode with `entryStep: "review"`, it skips draft resume semantics, lands directly on Review, and marks all seven data steps validated because the payload came from a published listing.

**Resume-any-draft from management**: `app/(tabs)/sell.tsx` reads the `resumeDraftId` route param and, after the latest drafts list resolves, initializes the wizard with the requested draft instead of the most recently updated one. This lets the owner management screen resume any draft, not just the latest.

### Derived context (`buildMachineContext`)

```typescript
interface WizardMachineContext {
  state: WizardMachineState;
  canContinue: boolean;                // current step valid (false on review — Publish handles advance)
  canPublish: boolean;                  // on review + all data steps validated
  canGoBack: boolean;                   // index > 0 and status === "step"
  editDetourActive: boolean;            // edit mode away from Review
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

`useWizardAutosave(draftId)` — debounced PATCH to `/api/v1/listings/drafts/:id` with exponential-backoff retry and network-aware auto-retry. `forceSave` cancels any pending debounce and saves the latest payload exactly once.

### Status lifecycle

```
idle → saving → saved (success)
idle → saving → saving (retry 1/3) → saving (retry 2/3) → saving (retry 3/3) → error
error → saving (manual retrySave or network available)
```

### Timing

| Parameter | Value |
|---|---|
| Debounce delay | 500 ms |
| Max retries | 3 |
| Retry delays | 1000 ms, 2000 ms, 4000 ms (exponential) |
| Safety timeout | 10 000 ms (mutation → error if no response) |
| Saved-to-idle fade | 2 000 ms |

### Methods

- `save(payload)` — debounced; resets retry counter
- `forceSave(payload)` — flushes debounce timer + immediate save; used on step transition and before publish
- `retrySave()` — manual retry from error state; resets retry counter

### Network awareness

- `NetInfo.addEventListener` is subscribed **once on mount** (empty dependency array). The callback reads the latest status via `saveStatusRef` and only auto-retries when `status === "error"`.
- When offline OR when the error is `ApiError("NETWORK_ERROR")` (e.g., wrapper timeout): save error shows "Will retry when online"
- When back online + pending payload + status is error: auto-retries with reset retry counter

### Pending payload tracking

`pendingPayloadRef` holds the last payload attempted. On retry (manual or auto), the pending payload is re-sent — no data loss between debounce and failure.

### Create flow integration (`sell.tsx`)

Two effects collaborate:

1. **Queue synchronization** pushes `uploadQueue.photos` → `wizardMachine` via `UPDATE_FIELDS` whenever thumbnails mutate.
2. **Debounced `save()` effect** PATCHes derived payload using a stable `payloadKey` (`JSON.stringify` of payload + photos + validatedSteps). This eliminates the previous 25+ individual field dependencies and prevents reference-churn from resetting the debounce timer during active photo uploads.

**Defensive:** The 10 s safety timeout and 2 s saved-to-idle timeout are no longer cleared by spurious effect re-runs. `isMountedRef` is reset to `true` on every effect body run and only set to `false` on actual unmount.

## 4. Edit save orchestrator

`useSaveListingEdit(listingId, payload, photos, seedMedia)` — client-side orchestrator that commits a converged edit session to the server using the sequential best-effort pattern locked in [ADR-0025](../../../../docs/adr/0025-edit-save-atomicity.md).

### Diff computation

The hook computes four operation groups from the current wizard payload, upload queue snapshot, and the seed `ListingMedia[]` from initial load:

1. **`fieldsPatch`** — editable fields from `payload` (excludes locked fields: `brandId`, `modelId`, `generationId`, `year`, `vin`). Only included when at least one editable field is present.
2. **`attachOps`** — queue photos with `key` set and `photoId` **not** in `seedMedia` ids (new uploads that reached MinIO but were never attached).
3. **`removeOps`** — `seedMedia` ids absent from the current queue (locally removed photos).
4. **`reorderOp`** — always fired when `photos.length > 0`; sends the final `sortOrder` array derived from queue order.

### Sequence

Ops run in this order, fail-fast:

```
fields → attach (one per new photo) → remove (one per removed mediaId) → reorder
```

### Per-op state machine

Each op is tracked in a `Record<opId, OpState>` where `OpState ∈ {pending, in_flight, succeeded, failed}`.

- On any failure, the orchestrator **stops** immediately.
- `EditSessionError` is thrown, carrying the full per-op state map and the `failedOpId`.
- The UI renders the state map as a checklist (✓ succeeded, ✗ failed, · pending).

### Retry-from-failure

`retry()` re-runs the sequence but **skips ops already in `succeeded` state**. Failed ops are reset to `pending` and re-attempted. This avoids re-firing already-successful sub-operations (e.g., re-PATCHing unchanged fields).

### Integration

- `edit.tsx` replaces the direct `useEditListing` call with `useSaveListingEdit`.
- On success: "Changes saved" toast + `router.replace` to public detail.
- On failure: per-op error banner renders inline on the Review step, with a **Retry** button.

## 5. Search / filter state

`useListingFilters()` owns the filter-draft → active lifecycle on the Search tab. Filter type is `z.infer<typeof ListingsSchemas.ListingFilterSchema>` (contract-driven, not hand-rolled).

### State model

- `draft` — in-progress filter values edited inside the sheet. Mutated by `setField(key, value)`.
- `active` — committed filters that will be consumed by the query hook (#163). Mutated only by `apply()` or `reset()`.
- `count` — number of fields in `active` whose value is not `undefined`, `null`, or empty string.

### Lifecycle

```
open sheet → edit draft via setField → Apply → draft → active + close sheet
open sheet → edit draft → Reset → clear draft + active
```

`apply()` reads the latest draft via a synchronous ref (batched `setField` calls are visible to `apply` in the same event tick). `reset()` clears both states.

### UI contract

- The Search tab trigger shows a brand `Badge` with `count` when `count > 0`.
- `FilterSheet` hosts `BrandModelFilterControl`, `CityFilterControl`, `PriceRangeFilterControl`, `YearRangeFilterControl`, and `ConditionFilterControl`. All filter controls from #158–#162 are wired in.
- Apply button label adapts: `"Apply"` when no active filters, `"Show results ({count})"` when filters are active.
- Reset button is always visible and uses `variant="ghost"`; Apply uses `variant="brand" size="pill"`.

## 6. Platform invariants — DO NOT REMOVE

These workarounds exist because of iOS-specific runtime behavior discovered on-device during S4 (#116–#120). Removing them will reintroduce the bugs.

### 6.1 Copy picker URIs before compression

**What**: All picker URIs are copied to `${documentDirectory}picker-temp/` before parallel compression starts. Temp copies are cleaned up after compression completes.

**Why**: iOS purges the picker cache directory under memory pressure. When multiple photos are selected and compressed in parallel via `Promise.all`, later compressions can find their source URI deleted because iOS reclaimed the cache while earlier compressions were running. (#119 / `ebd00f5`)

**Hardening path**: After each `copyAsync` to `picker-temp/`, verify the copy exists with `getInfoAsync`. Fail fast with `LOCAL_FILE_MISSING` if the copy is missing, instead of discovering the failure mid-compression.

### 6.2 Staging transfer: copyAsync only — no moveAsync

**What**: Intermediate JPEG from `renderAsync()/saveAsync()` is **always** **`copyAsync`’d into** `listing-staging/{stagingKey}/{photoId}.jpg`, then temp files cleaned best-effort. **Never** **`moveAsync`**.

**Why**: `moveAsync` used to silently fail across cache ↔︎ documents boundaries (#118 legacy analysis); dual-path branching left stranded temp files (#113-era concern).

**Hardening residual**: Optionally add **`getInfoAsync`** right after **`copyAsync`** on `picker-temp` sources (parity with autosave caveat) — compressor already validates destination footprint post-transfer.

### 6.3 Parallel compression counter hook

**What**: `src/listings/uploadStaging/useAsyncCounter.ts` wraps the **ref-counter** semantics (`increment` / `decrement` → boolean `isActive`) consumed by **`useUploadQueue`**.

**Why**: Boolean `useState` cannot observe overlapping async compress sessions (#120 regression).

### 6.4 expo-image-manipulator contextual chain API

**What**: `compressor.ts` uses `ImageManipulator.manipulate(uri).resize().renderAsync().saveAsync()` — the contextual chain API.

**Why**: The previous `manipulateAsync()` top-level function was deprecated in Expo SDK 55. The chain API is the only supported surface. (#116 / `dda8537`)

**Hardening path**: No code change needed — this is the correct API. On any Expo SDK upgrade, re-verify via Context7 (`resolve-library-id` → `query-docs` for `expo-image-manipulator`) before assuming the chain API is unchanged.

## Cross-reference — engineering backlog

Correctness + UX remediation checklist (autosave deps, **`publishGate` wiring**, **`/(public)`** route, typography hierarchy): see **`### Planned refactor roadmap`** in [`apps/mobile/CONTEXT.md`](../CONTEXT.md).

## Notable decisions

- [ADR-0008](../../../../docs/adr/0008-media.md) — Direct-to-MinIO upload, eager Sharp variants (server-side)
- [ADR-0019](../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state only
- API-side listings context: [`apps/api/src/modules/listings/CONTEXT.md`](../../../api/src/modules/listings/CONTEXT.md)
