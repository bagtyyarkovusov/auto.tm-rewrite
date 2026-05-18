# apps/mobile — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in the relevant sprint files under `docs/prd/sprints/`.

## Purpose

The primary user surface. Expo (React Native) app for Android + iOS. Anonymous browsing + auth-on-action for buyers and sellers.

## Audience

- TM-based buyers and sellers
- Private users (most) and dealership reps (few but high-value)

## What it contains (today)

### Stack

- **`expo`** SDK 55, **`expo-router`** for navigation, **`react-native@0.83.6`**, **`react@19.2.0`**
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

### Routes (Phase 1, today)

```
/(tabs)/
  index               Feed (personalized listings)        — stub, no real feed
  favorites           Favorites + saved searches          — stub
  sell                Sell / listing wizard entry         — 7-step create-listing wizard (S4)
  chat                Conversation list                   — stub
  services            Profile, garage, settings, blog     — stub

/(auth)/
  phone               Phone entry                         — wired (S2)
  otp                 OTP verification                    — wired (S2)

/dev/
  catalog             Dev-only catalog smoke screen       — wired (S3), gated __DEV__
```

No `/chat/[conversationId]`, no `/me/*` routes today — they ship with their owning sprints.

## State management (today)

- React state for local UI
- TanStack Query v5 + custom `apiClient` wrapper at `src/api/client.ts` (single API entry point)
- Zustand stores: `src/auth/intentStore.ts` (auth-on-action deferred-replay)
- `expo-secure-store` for JWT access + refresh tokens
- `AsyncStorage` reserved for future TanStack Query cross-launch persistence; not wired today
- Upload staging state machine at `src/listings/uploadStaging/` — compress → presign → PUT → attach; `UploadError` discriminated union categorizes 7 error codes with retryable flag; file-existence checks via `getInfoAsync` at 3 checkpoints
- Wizard autosave via debounced `PATCH /listings/drafts/:id`

Identity hooks live at `src/api/identity/*`.
Catalog hooks live at `src/api/catalog/*` (`useBrands`, `useModels`, `useGenerations`, `useColors`, `useBodyTypes`, `useEngineTypes`, `useTransmissions`, `useDriveTypes`, `useRegions`, `useCities`).
Listings hooks live at `src/api/listings/*` (`useCreateDraft`, `useUpdateDraft`, `useDiscardDraft`, `usePublishDraft`, `useMyDrafts`, `useMyListings`, `useListingDetail`, `useEditListing`, `useArchiveListing`, `useDeleteListing`, `useMarkSold`, `useRepublishListing`).
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
  - **`@aws-sdk/client-s3`** dep for presigned MinIO uploads (current package.json does NOT include this; S4 adds it)
  - Routes: `/(public)/listings/[id]`, `/sell/wizard` (7-step create-listing wizard), `/listings/[id]/edit`
  - Universal Links / App Links manifest wiring via the already-installed `expo-linking`
  - Mobile foundation (deps, RNR primitives, query keys, catalog/listings/uploads hooks, upload staging) ✅ Shipped.
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

Expo Go includes native modules at SDK-specific versions. `expo install --fix` aligned this app to the SDK 55 expected package set (`expo-router@55.0.14`, `react-native@0.83.6`, `react-native-svg@15.15.3`, `react-native-reanimated@4.2.1`). After package alignment, run `pnpm install --force` at the repo root; pnpm can otherwise leave stale symlinks in `apps/mobile/node_modules`.

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

Discovered during Context7-validated analysis (Expo SDK 55 docs). Tracked as GitHub issues:

- **#114** — iOS temp file cleanup can delete picker URIs before compression. Picker returns cache-directory URIs; iOS purges them under memory pressure. Mitigation: copy to document directory before compression, or parallelize compression.
- **#115** — Sequential photo processing blocks UI on multi-select. `for...await onAddPhoto()` compresses one photo at a time. With 20 photos this freezes the UI for seconds. Mitigation: `Promise.all` for parallel compression.
- **#112** ✅ — Upload pipeline file-existence checks and error categorization shipped in PR #<N>. `getInfoAsync` guards at 3 checkpoints (before compression, after compression, before PUT). Retryable vs non-retryable distinction via `UploadError` type.
- **#113** — `moveAsync` failure in `compressor.ts` leaves file in cache. If move throws, compressed file stays in cache and may be cleaned up. Needs `copyAsync` fallback.
- **#111** ✅ — `expo-image-manipulator` `manipulateAsync` migrated to `ImageManipulator.manipulate()` contextual API in PR #<N>. Deprecated call removed; identical compression behavior preserved.

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Expo
- [ADR-0006](../../docs/adr/0006-auth.md) — OTP + action-gated auth
- [ADR-0008](../../docs/adr/0008-media.md) — Client-side compression mandatory
- [ADR-0014](../../docs/adr/0014-mobile-component-library.md) — NativeWind v4 + RNR
- [ADR-0015](../../docs/adr/0015-mobile-data-fetching.md) — TanStack Query v5 + apiClient wrapper
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
