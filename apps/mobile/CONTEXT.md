# apps/mobile — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in the relevant sprint files under `docs/prd/sprints/`.

## Purpose

The primary user surface. Expo (React Native) app for Android + iOS. Anonymous browsing + auth-on-action for buyers and sellers.

## Audience

- TM-based buyers and sellers
- Private users (most) and dealership reps (few but high-value)

## What it contains (today)

### Stack

- **`expo`** SDK 55 (`expo@55.0.26`), **`expo-router@55.0.16`** for navigation, **`react-native@0.83.6`**, **`react@19.2.0`**
- **NativeWind v4** (`nativewind@^4.2.0`, `tailwindcss@^3.4.17`) + **React Native Reusables (RNR)** for styling and composite components — see [`docs/agents/nativewind-v4.md`](../../docs/agents/nativewind-v4.md). 18 RNR components installed at `apps/mobile/components/ui/` (alert-dialog, avatar, badge, button, card, dialog, dropdown-menu, icon, input, native-only-animated-view, progress, separator, sheet, skeleton, switch, text, toast, tooltip). `lib/theme.ts` has HSL tokens (light + dark, RED brand primary `0 100% 45%`). `@rn-primitives/{alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, popover, portal, progress, separator, slot, switch, tooltip}` v1.4.0 wired.
- **`@tanstack/react-query@^5.100.10`** for server cache + mutations, layered on a small custom `apiClient` wrapper at `src/api/client.ts`. See [ADR-0015](../../docs/adr/0015-mobile-data-fetching.md) and [`docs/agents/mobile-data-fetching.md`](../../docs/agents/mobile-data-fetching.md). Query keys factory at `src/api/queryKeys.ts` (covers `catalog.*`, `listings.*`, `uploads.*`, `exchangeRates.*`).
- **`zustand@^5.0.13`** for client state (auth intent, modal lifecycle, form state). See `src/auth/intentStore.ts`.
- **`expo-secure-store`** for JWT access + refresh tokens (`src/auth/session.ts`).
- **`expo-image-picker`** for camera / photo-library selection.
- **`expo-camera`** for camera capture.
- **`expo-file-system`** for `documentDirectory` staging of upload media.
- **`expo-image-manipulator`** for client-side image compression (uses the `ImageManipulator.manipulate()` contextual API; deprecated `manipulateAsync` removed in #111).
- **`expo-network`** installed (network state detection; NetInfo preferred at runtime).
- **`@react-native-community/netinfo`** for reconnect detection and TanStack Query `onlineManager` integration.
- **`react-native-compressor`** for client-side video compression (custom dev client required for that flow; Expo Go is valid for current routing/auth smoke checks).
- **`react-native-svg`** (+ `react-native-svg-transformer` at build time) for vector icons and brand SVG rendering.
- **`expo-linking`** installed (Universal Links / App Links handling will be wired in S4).
- **`lucide-react-native`** for icons, rendered through the `@/components/ui/icon` wrapper.
- **Custom fonts**: `app/_layout.tsx` loads UberMove / UberMoveText `.otf` families via `useFonts`. **UberMove Mono** `.ttf` files (`UberMoveMono-Regular`, `UberMoveMono-Medium`) load **only on iOS** today; Android has no bundled mono fonts (tailwind `font-mono` falls through to `"Menlo", monospace` fallback on Android).

### Typography utilities (today)

[`tailwind.config.js`](tailwind.config.js) maps:

- **`font-heading`** → `UberMove-Medium`
- **`font-sans`** (default semantic body) → `UberMoveText-Regular`
- **`font-mono`** → `UberMoveMono-Regular`, `Menlo`, `monospace`

There are **no** `font-uber-move`, `font-uber-move-text`, or `font-uber-mono` utilities. Wizard shell + steps mostly use **`font-semibold`** on headings without specifying `font-heading`; auth `OtpCells` uses **`font-mono`** for the code digits.

### RNR primitive design contract (today)

Mobile RNR primitives are customized as an **AutoTM Base** layer: neutral-first surfaces, 8px default radius, UberMove semantic font utilities, flat cards/inputs, and restrained brand red. `Button` default is high-contrast neutral (`bg-foreground`); `Button variant="brand"` is the red commit/action style. Status UI uses `success-500`, `warning-500`, `info-500`, and `destructive` instead of brand red. `Progress`, `Switch`, `Tooltip`, tabs, and photo cover badges use neutral tokens so red stays reserved for true brand or commit moments.

### Routes (Phase 1, today)

```
/(tabs)/
  index               Feed (personalized listings)        — stub, no real feed
  favorites           Favorites + saved searches          — stub
  sell                Sell tab + inline 8-step create-listing wizard (S4) — WizardLayout overlays this route; tab bar hidden while wizard is open
  chat                Conversation list                   — stub
  services            Profile, garage, settings, blog     — stub

/(auth)/
  phone               Phone entry                         — wired (S2), design-refactored (#124)
  otp                 OTP verification                    — wired (S2), design-refactored (#124)

/(public)/
  listings/[id]       Buyer-facing listing detail stub    — wired (S4, #133); renders title/price/photos/description from `useListingDetail`; no contact/favorite/chat (S5/S7)

/listings/
  [id]/edit           Edit published listing               — wired (S4); converged on wizardMachine + WizardLayout; opens at Review (Step 8/8), section Edit affordances detour to shared steps, Done returns to Review, Save changes orchestrated via `useSaveListingEdit` (fields → attach → remove → reorder, fail-fast, retry-from-failure per ADR-0025); no edit draft/autosave; photos editable via `useUploadQueue('edit-' + listingId, payload)` with local staging (ADR-0024 compliant)

/dev/
  catalog             Dev-only catalog smoke screen       — wired (S3), gated __DEV__
```

There is **no** dedicated **`/sell/wizard`** Expo route — the create flow runs **inline** under `/(tabs)/sell`.

No `/chat/[conversationId]`, no `/me/*` routes today — they ship with their owning sprints.

### Listing wizard — known implementation gaps

Documented honestly so CONTEXT matches code. Planned fixes live in roadmap below (next PRs).

| Gap | What code does today |
|-----|----------------------|
| **`waiting_for_network` state** | NetInfo offline events now move `compressed` / `presigned` / `uploading` photos into `waiting_for_network`; reconnect reuses upload resume. |
| **`removePhoto` vs `queueRef`** | Compression/upload paths update `queueRef` synchronously; **remove relies on passive `queueRef.current = queue` on the next render** — brief window vs in-flight uploads. |
| **`orphanCleanup`** | `app/_layout.tsx` calls `cleanupOrphanDraftDirs(existingDraftIds, existingListingIds)` after authenticated `useMyDrafts` + `useMyListings` resolve. Canonical detail in [`src/listings/CONTEXT.md`](src/listings/CONTEXT.md). |
| **`Step2Photos` props noise** | Still accepts `payload` / `onChange` / `disabledTooltip`; **implementations ignore them** (photo props only). |

### Planned refactor roadmap (follow-up PRs — not aspirational CONTEXT)

1. **Create orchestration cleanup**: Extract create orchestration out of **`sell.tsx`** into a dedicated hook/module.

   Remaining convergence items (locked 2026-05-22):
   - **Design system migration**: add `size="pill"` variant + `disabled:bg-muted disabled:border-border disabled:text-muted-foreground` baked into every Button variant. Wizard footer migrates from inlined `cn()` classes to `variant + size` props.
   - **Heading hierarchy**: Apple Large Title pattern in `WizardHeader` (muted position-marker row + `text-2xl font-heading` step title + progress); step bodies delete their `text-2xl font-semibold` title.

3. **Refactoring UI (photos step + WizardLayout)** — hierarchy: unify duplicate route title + header step title + step body `text-2xl`; simplify upload overlays vs step-level summary; keep upload/status overlays on semantic tokens instead of brand red; propagate `font-heading` on wizard headings.

## Navigation chrome (today)

- **Tab bar**: Custom `AutoTmTabBar` component at `components/navigation/AutoTmTabBar.tsx`. Replaces default Expo Router tab bar; renders 5 routes (Search, Favorites, Sell, Chat, Services) with active/inactive icon + label styling. Central Sell action (`PlusCircle`) has distinct visual treatment. Uses `lucide-react-native` icons via RNR `Icon` wrapper.
- **Auth modals**: `/(auth)/phone` and `/(auth)/otp` render as `presentation: "fullScreenModal"` Stack screens. Both use `KeyboardAvoidingView` + `SafeAreaView` layout with `BrandLogo`, `LocaleSwitcher`, and `PhoneInput` / `OtpCells` components.

## State management (today)

- React state for local UI
- TanStack Query v5 + custom `apiClient` wrapper at `src/api/client.ts` (single API entry point)
- Zustand stores: `src/auth/intentStore.ts` (auth-on-action deferred-replay)
- `expo-secure-store` for JWT access + refresh tokens
- `AsyncStorage` reserved for future TanStack Query cross-launch persistence; not wired today
- Upload staging state machine at `src/listings/uploadStaging/` — compress → presign → PUT → attach; `UploadError` discriminated union categorizes 7 error codes with retryable flag; file-existence checks via `getInfoAsync` at 3 checkpoints
- Wizard autosave via debounced `PATCH /listings/drafts/:id`
- Wizard design system applied in #124: **`WizardLayout`** shows route title + **`text-lg`** step title + progress; steps **also** echo a **`text-2xl font-semibold`** screen title (**three-level heading stack — refinement backlog**, see **Planned refactor roadmap** above). Body spacing (`gap-5 py-5`), field groups (`gap-1.5`), 52px inputs (`h-[52px]`), pill buttons (`h-[52px] rounded-full`), picker rows match input height.

Identity hooks live at `src/api/identity/*`.
Catalog hooks live at `src/api/catalog/*` (`useBrands`, `useModels`, `useGenerations`, `useColors`, `useBodyTypes`, `useEngineTypes`, `useTransmissions`, `useDriveTypes`, `useRegions`, `useCities`).
Listings hooks live at `src/api/listings/*` (`useCreateDraft`, `useUpdateDraft`, `useDiscardDraft`, `usePublishDraft`, `useMyDrafts`, `useMyListings`, `useListingDetail`, `useEditListing`, `useAttachMedia`, `useRemoveMedia`, `useReorderMedia`, `useArchiveListing`, `useDeleteListing`, `useMarkSold`, `useRepublishListing`).
Uploads hook lives at `src/api/uploads/usePresignUpload`.
Exchange-rate hook lives at `src/api/exchange-rates/useExchangeRates`.
Upload staging utilities live at `src/listings/uploadStaging/` (`types.ts`, `stagingDir.ts`, `compressor.ts`, `queueState.ts`, `uploadErrors.ts`, `orphanCleanup.ts`, `appStateResume.ts`).

## Dependencies

- `apps/api` (HTTP)
- `packages/contracts` (typed client via Zod)
- `@auto-tm/ui` workspace package (tokens — components are duplicated for RN, but tokens shared)

## Planned additions (future sprints)

Per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md), the deps + routes + state below are NOT in code today. Tracked in the named sprint files.

- **S3 (Catalog)** — `src/api/catalog/*` hooks; dev-only `/dev/catalog` route gated `__DEV__`. ✅ Shipped.
- **S4 (Listings CRUD)** —
  - Mobile uploads are **HTTPS PUT** to presigned URLs — **`apps/mobile/package.json` does not include `@aws-sdk/client-s3`** (clients never embedded the SDK; server issues presigned URLs).
  - **Shipped**: inline **8-step** create wizard on **`/(tabs)/sell`**, upload staging utilities, drafts/publish/edit hooks, **`/listings/[id]/edit`**, **`/(public)/listings/[id]`** buyer detail stub.
  - **Still missing vs PRD / backlog**: optional refactor to a standalone **`/sell/wizard`** route (today everything lives in **`sell.tsx`**).
  - Universal Links / App Links manifest wiring via the already-installed `expo-linking`
  - Mobile foundation (`apps/mobile` deps, RNR primitives, query keys, catalog/listings/uploads hooks, upload staging pipeline) ✅ Shipped.
- **S5 (Listings UX)** — saved-search UI, filter sheet; mobile picker modals (brand-picker, model-picker)
- **S6 (Garage + Dealership)** — `/me/garage`, `/me/listings`; `/(public)/dealers/[slug]`
- **S7 (Conversations)** —
  - **`socket.io-client`** dep (not in package.json today; S7 adds it)
  - Routes: `/chat/[conversationId]`
- **S8 (Notifications)** —
  - **`expo-notifications`** dep (not in package.json today; S8 adds it for FCM/APNS device token registration)
- **S9 (Admin)** — `/(auth)/totp` route for admin TOTP enrollment (admin-flagged users only)
- **i18n** —
  - **`react-i18next`** dep (not in package.json today; sprint TBD — likely S5 alongside locale switcher UX)
- **App-wide locale store + query-key invalidation on locale change** — S5 picker UX consumes; locale store ships then.

## Known issues / workarounds

### pnpm + Expo SDK 55 compatibility

**`shamefully-hoist=true` in `.npmrc`** is required. React Native / Expo / Metro expect flat `node_modules` (npm/yarn-style). Without it, dozens of transitive dependencies fail to resolve (e.g., `whatwg-fetch`, `invariant`, `react-native-css-interop`).

### Expo SDK 55 package alignment

Expo Go includes native modules at SDK-specific versions. `expo install --check` expects this app's SDK 55 package set to include `expo@55.0.26`, `expo-router@55.0.16`, `expo-camera@55.0.19`, `expo-file-system@55.0.22`, `expo-font@55.0.8`, `expo-image-manipulator@55.0.17`, `react-native@0.83.6`, `react-native-svg@15.15.3`, and `react-native-reanimated@4.2.1`. After package alignment, run `pnpm install --force` at the repo root; pnpm can otherwise leave stale symlinks in `apps/mobile/node_modules`.

Agents must run the mobile gate in `docs/agents/mobile-expo.md` before claiming SDK/package/runtime fixes. The first command is always:

```bash
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
```

### react-native-screens Fabric source path

`react-native-screens` must keep using its React Native/Fabric source path in SDK 55 / Expo Go. Do not redirect it to `lib/commonjs/`; that bypasses Fabric view-config registration and caused `RNSSafeAreaView` runtime crashes.

### NativeWind token and lucide interop guardrail

`apps/mobile/metro.config.js` pins NativeWind `inlineRem: 16`, so shared spacing tokens from `packages/ui/tokens/spacing.ts` must be converted to rem with `px / 16` in `@auto-tm/ui/theme/tailwind`. Do not divide by the 4px grid step; that turns `h-10` into `160px` on native.

Lucide icons must render through `@/components/ui/icon`. The wrapper maps NativeWind class styles into lucide props and must preserve `fill="none"` by default; passing an undefined fill prop through `react-native-svg` makes outline icons render as black filled shapes.

### Upload pipeline hardening (post-#93)

Issue #93 (mobile wizard) shipped in PR #110. The following fixes were discovered during simulator testing and applied as post-ship hardening:

| Commit | Problem | Fix |
|---|---|---|
| `b8d3f3c` | JWT 401 on all API calls — `IdentityModule` registered its own `JwtModule` before `ConfigModule.forRoot()` loaded `.env`. Tokens signed with fallback secret, verified with real secret. | Removed redundant `JwtModule` from `IdentityModule`. Updated 8 e2e tests to import `JwtModule` explicitly. |
| `8542079` | 429 rate-limit on multi-photo upload — `ThrottlerGuard` at 60/min hit by simultaneous presign requests. Retry storm from auto-resume. | `@SkipThrottle()` on `/uploads/presign`. Mobile `MAX_CONCURRENT = 2`. Retry cap at 2. Rate-limited photos skipped in auto-resume. |
| `c5ed428` | "Local file missing" + "PUT failed" — `setQueue()` is async; `processUploadQueue()` ran before React state propagated. `uploadAsync` defaulted to MULTIPART. | Synchronous `queueRef.current` update before enqueue. `uploadType: BINARY_CONTENT` on PUT. |
| `c1c3747` | Crash: `ImagePicker.MediaType.Images` — `MediaType` is a TS type alias, not a runtime object. | Changed to string literal array: `mediaTypes: ["images"]` |
| #112 | Upload pipeline lacks file-existence checks and error categorization. No `getInfoAsync` guards before compression/upload. All errors show generic "Upload failed". | `compressor.ts` verifies source file exists via `getInfoAsync` before `ImageManipulator.manipulate()`. `useUploadQueue.ts` verifies destination file after compression and `localUri` on disk before PUT. `UploadError` discriminated union with 7 error codes (`PRESIGN_FAILED`, `PUT_FAILED`, `LOCAL_FILE_MISSING`, `NETWORK_ERROR`, `RATE_LIMITED`, `COMPRESSION_FAILED`, `UNKNOWN`). Non-retryable errors (`LOCAL_FILE_MISSING`) excluded from auto-resume. UI in `Step2Photos.tsx` renders different icon/color for retryable vs non-retryable failures. |

Full analysis with state machines, sequence diagrams, and race condition analysis: [`docs/prd/flows/61-create-listing-analysis.md`](../../docs/prd/flows/61-create-listing-analysis.md).

### Upload pipeline open issues

Historical GitHub Issues #111–#115 captured Expo-file-system realities. **`Step2Photos` now mitigates the worst `#114/#115` regressions**:

- Copies every picker URI to **`${documentDirectory}picker-temp/`** before enqueueing uploads (survives iOS cache eviction during parallel work — original #114 symptom).
- Library multi-select invokes **`Promise.all`** over temp copies (`onAddPhoto` per asset) (#115 parallelism).

Residual risk (still tracked by issues until closed): **`Promise.all` bursts** spike CPU concurrently; revisit batching/back-pressure if QA shows thermal throttling.

- **#114** ⚠️ **partially mitigated** — **`picker-temp` + `Promise.all`** in `Step2Photos` (still open if Issue remains for edge cases Camera-only paths, telemetry, docs).
- **#115** ⚠️ **partially mitigated** — parallel enqueue replaces sequential **`for-await`**, but concurrency still limited by compressor + **`MAX_CONCURRENT = 2`** uploads.
- **#112** ✅ — Upload pipeline file-existence checks and error categorization shipped in PR #<N>. `getInfoAsync` guards at 3 checkpoints (before compression, after compression, before PUT). Retryable vs non-retryable distinction via `UploadError` type.
- **#113** ✅ — Compressor hardened: staging transfer uses **`copyAsync` only** (no `moveAsync` path) — orphaned cache files prevented by deterministic copy semantics.
- **#111** ✅ — `expo-image-manipulator` `manipulateAsync` migrated to `ImageManipulator.manipulate()` contextual API in PR #<N>. Deprecated call removed; identical compression behavior preserved.

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Expo
- [ADR-0006](../../docs/adr/0006-auth.md) — OTP + action-gated auth
- [ADR-0008](../../docs/adr/0008-media.md) — Client-side compression mandatory
- [ADR-0014](../../docs/adr/0014-mobile-component-library.md) — NativeWind v4 + RNR
- [ADR-0015](../../docs/adr/0015-mobile-data-fetching.md) — TanStack Query v5 + apiClient wrapper
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0024](../../docs/adr/0024-owner-post-publish-photo-editing.md) — Owner post-publish photo editing
- [ADR-0025](../../docs/adr/0025-edit-save-atomicity.md) — Edit Save-changes sequential best-effort (Phase 1) → transactional bundle (Phase 2)
- [ADR-0026](../../docs/adr/0026-edit-mode-review-first-entry.md) — Edit opens at Review; create stays linear
