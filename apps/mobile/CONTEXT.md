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
- **`@tanstack/react-query@^5.100.10`** for server cache + mutations, layered on a small custom `apiClient` wrapper at `src/api/client.ts`. See [ADR-0015](../../docs/adr/0015-mobile-data-fetching.md) and [`docs/agents/mobile-data-fetching.md`](../../docs/agents/mobile-data-fetching.md). Query keys factory at `src/api/queryKeys.ts` (covers `me`, `catalog.*`, `listings.*`, `uploads.*`, `exchangeRates.*`, `conversations.*`, `reports.*`, `favorites.*`). The wrapper uses `AbortController` with a 30-second default request timeout (15 seconds for refresh); timeouts throw `ApiError("NETWORK_ERROR", 0, "Request timed out")`. The wrapper sends `Accept-Language` from `localeStore` on every request.
- **`react-i18next@^15.5.1`** + **`i18next@^24.2.3`** for UI localization. Namespaced per feature (`common`, `auth`, `account`, `listings`, `conversations`) with `tk`/`ru`/`en` resources. Init in `app/_layout.tsx` hydrates the locale store before rendering.
- **`expo-localization@~16.1.1`** for device locale detection on first launch.
- **`@react-native-async-storage/async-storage@^2.1.2`** for locale persistence (`localeStore`) and reserved for future TanStack Query cross-launch persistence.
- **`zustand@^5.0.13`** for client state (auth intent, modal lifecycle, form state). See `src/auth/intentStore.ts`.
- **`expo-secure-store`** for JWT access + refresh tokens (`src/auth/session.ts`).
- **`expo-image`** for remote listing photos (feed cards + detail).
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

There are **no** `font-uber-move`, `font-uber-move-text`, or `font-uber-mono` utilities. Wizard `WizardHeader` and the Sell entry screen use **`font-heading`** for prominent headings. `font-semibold` is reserved for body emphasis (field labels, card titles). Auth `OtpCells` uses **`font-mono`** for the code digits.

### RNR primitive design contract (today)

Mobile RNR primitives are customized as an **AutoTM Base** layer: neutral-first surfaces, 8px default radius, UberMove semantic font utilities, flat cards/inputs, and restrained brand red. `Button` default is high-contrast neutral (`bg-foreground`); `Button variant="brand"` is the red commit/action style. `Button size="pill"` (52px rounded-full) is the commit-button size used in the wizard footer and Sell entry screen. `variant` and `size` are orthogonal — callers combine them (e.g., `variant="brand" size="pill"`). Every variant bakes in `disabled:bg-muted disabled:border disabled:border-border` (container) and `disabled:text-muted-foreground` (text) so disabled buttons show a visible muted shell instead of fading via `opacity-50`. Status UI uses `success-500`, `warning-500`, `info-500`, and `destructive` instead of brand red. `Progress`, `Switch`, `Tooltip`, tabs, and photo cover badges use neutral tokens so red stays reserved for true brand or commit moments.

### Routes (Phase 1, today)

```
/(tabs)/
  index               Feed (chronological listings)       — real feed via `useListings`; `expo-image` cards; pull-to-refresh; infinite scroll
  favorites           Favorites list                      — real infinite list via `useMyFavorites`; `ListingCard` reuse; loading/empty/error/retry; pull-to-refresh; infinite scroll; auth-on-action for anonymous users
  sell                Sell tab + inline 8-step create-listing wizard (S4) — WizardLayout overlays this route; tab bar hidden while wizard is open; now links to My listings & drafts management and supports `?resumeDraftId=<id>` to resume any draft (not just latest)
  chat                Conversation list                   — authenticated conversation list with loading, empty, error, retry, and pull-to-refresh; anonymous users see auth-on-action entry (#173)
  services            Services screen with Profile, Garage, Settings, Blog, About tiles — Profile navigates to `/profile` (auth-on-action for anonymous users); Settings navigates to `/settings`; Garage/Blog/About are disabled stubs (dead-tile cleanup tracked in S8a UI sweep); includes entry to My listings & drafts

/(auth)/
  phone               Phone entry                         — wired (S2), design-refactored (#124)
  otp                 OTP verification                    — wired (S2), design-refactored (#124); shows account-restoration AlertDialog when verification response includes `deletionScheduledAt` (user in 30-day grace period)

/(public)/
  listings/[id]       Listing detail (buyer + owner)      — complete detail surface (S4, #145 + #146); photo gallery with fullscreen viewer, spec grid, seller block, price with seller-term badges; buyer CTAs: Call/Message/Share/Favorite (Message enabled for eligible non-owner active listings with `allowChat=true` via #172; opens auth-on-action for anonymous users, then resumes into conversation; Favorite wired with optimistic toggle via `useFavoriteListing`/`useUnfavoriteListing`, auth-on-action for anonymous users, receives initial `isFavorited` state from detail response); sold badge and disabled contact actions for sold/archived listings; unavailable state with back/retry for 404s; owner sees asymmetric price (TMT primary + original currency secondary for USD/AED), owner action panel (Edit, Mark sold, Archive, Republish, Delete) with AlertDialog confirmations, hides buyer CTAs; ownership determined by `useViewer` comparing session user.id to `listing.sellerId`

/conversations/
  index               Conversation list (route wrapper)    — #173; thin wrapper rendering `ConversationList` with back-nav header; no duplicate list logic
  open-listing        Auth-resume redirector               — #172; reads `listingId` from query params, calls `useOpenConversation`, then redirects to `/conversations/[id]` with listing card params
  [id]                Conversation detail (text thread)    — #172/#173; compact listing card at top (tap to open listing detail), message list with optimistic pending/confirmed/failed states and retry, composer with 1000-char limit; shared path for buyer send and seller reply; uses `useConversationMessages` (infinite query) and `useSendTextMessage`

/profile
  profile             Profile screen showing signed-in identity — phone, displayName, role, avatar, memberSince; uses `useMe`; auth-on-action for anonymous users via Services tile intercept

/listings/
  manage              My Listings & Drafts management      — wired (S4 #147); segmented tabs for Active/Sold/Archived/Drafts; auth-on-action prompt for anonymous users; reuses feed ListingCard visual language via `OwnerListingCard`; `DraftCard` with Resume/Discard and destructive `AlertDialog` confirmation; pull-to-refresh + infinite scroll for both listings and drafts; resume any draft by navigating to `/(tabs)/sell?resumeDraftId=<id>`; links to detail (`/(public)/listings/[id]`) and edit (`/listings/[id]/edit`)
  [id]/edit           Edit published listing               — wired (S4); converged on wizardMachine + WizardLayout; opens at Review (Step 8/8), section Edit affordances detour to shared steps, Done returns to Review, Save changes orchestrated via `useSaveListingEdit` (fields → attach → remove → reorder, fail-fast, retry-from-failure per ADR-0025); no edit draft/autosave; photos editable via `useUploadQueue('edit-' + listingId, payload)` with local staging (ADR-0024 compliant)

/settings
  index               Settings screen                      — wired (#192); language switch via `LocaleSwitcher`, delete-account entry navigates to `/account/delete`, logout with AlertDialog confirmation; logout calls `POST /auth/logout`, clears `expo-secure-store` session, clears TanStack Query cache, and redirects to `/(tabs)/index`

/account/
  delete              Delete account flow                  — wired (#197); destructive AlertDialog confirmation explaining 30-day grace period + scheduled deletion date, calls `DELETE /me`, clears session + query cache, shows post-delete "scheduled for deletion on <date>" messaging with Done button redirecting to `/(tabs)/index`

/dev/
  catalog             Dev-only catalog smoke screen       — wired (S3), gated __DEV__
```

There is **no** dedicated **`/sell/wizard`** Expo route — the create flow runs **inline** under `/(tabs)/sell`.

No `/chat/[conversationId]` route today — ships with its owning sprint.

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
   - **Design system migration**: ✅ Shipped in #134. `size="pill"` + disabled-state bake-in live in `buttonVariants`/`buttonTextVariants`. Wizard footer and Sell entry buttons use `variant + size` props.
   - **Heading hierarchy**: ✅ Shipped in #135. Apple Large Title pattern in `WizardHeader` (muted position-marker row + `text-2xl font-heading` step title + progress); step bodies deleted their `text-2xl font-semibold` title.

3. **Refactoring UI (photos step + WizardLayout)** — simplify upload overlays vs step-level summary; keep upload/status overlays on semantic tokens instead of brand red.

## Navigation chrome (today)

- **Tab bar**: Custom `AutoTmTabBar` component at `components/navigation/AutoTmTabBar.tsx`. Replaces default Expo Router tab bar; renders 5 routes (Search, Favorites, Sell, Chat, Services) with active/inactive icon + label styling. Central Sell action (`PlusCircle`) has distinct visual treatment. Uses `lucide-react-native` icons via RNR `Icon` wrapper.
- **ErrorBoundary**: `components/ErrorBoundary.tsx` wraps the `<Stack>` in `app/_layout.tsx`; class component with `withTranslation` from `react-i18next` for localized fallback UI (`somethingWentWrong`, `unexpectedError`, `tryAgain`) and a reload button.
- **Auth modals**: `/(auth)/phone` and `/(auth)/otp` render as `presentation: "fullScreenModal"` Stack screens. Both use `KeyboardAvoidingView` + `SafeAreaView` layout with `BrandLogo`, `LocaleSwitcher`, and `PhoneInput` / `OtpCells` components.

## State management (today)

- React state for local UI
- TanStack Query v5 + custom `apiClient` wrapper at `src/api/client.ts` (single API entry point)
- Zustand stores: `src/auth/intentStore.ts` (auth-on-action deferred-replay), `src/locale/localeStore.ts` (locale + AsyncStorage persistence)
- `expo-secure-store` for JWT access + refresh tokens
- `AsyncStorage` for locale persistence (`localeStore`) and reserved for future TanStack Query cross-launch persistence
- Upload staging state machine at `src/listings/uploadStaging/` — compress → presign → PUT → attach; `UploadError` discriminated union categorizes 7 error codes with retryable flag; file-existence checks via `getInfoAsync` at 3 checkpoints
- Wizard autosave via debounced `PATCH /listings/drafts/:id`
- Wizard design system applied in #124 + #135: **`WizardHeader`** shows muted position-marker (`text-xs text-muted-foreground`) + **`text-2xl font-heading`** step title + progress bar. Step bodies open directly with form rows or brief `text-sm text-muted-foreground` orientation copy — no duplicate title. Body spacing (`gap-5 py-5`), field groups (`gap-1.5`), 52px inputs (`h-[52px]`), pill buttons (`h-[52px] rounded-full`), picker rows match input height.

Identity hooks live at `src/api/identity/*` (`useRequestOtp`, `useVerifyOtp`, `useRefreshSession`, `useMe`, `useDeleteAccount`). Viewer hook lives at `src/auth/useViewer.ts`. `useMe` fetches `GET /api/v1/me` via TanStack Query and parses through `AuthSchemas.MeResponseSchema`. `useLogout` at `src/auth/useLogout.ts` calls `POST /auth/logout` with the stored refresh token, then `clearAuthSession`, clears the TanStack Query cache, and redirects to `/(tabs)/index`. `useDeleteAccount` calls `DELETE /me` and returns 204; on success the caller clears session and query cache.
Catalog hooks live at `src/api/catalog/*` (`useBrands`, `useModels`, `useGenerations`, `useColors`, `useBodyTypes`, `useEngineTypes`, `useTransmissions`, `useDriveTypes`, `useRegions`, `useCities`). Catalog hooks no longer send `?locale=` query params; locale is transmitted via `Accept-Language` header from `localeStore`. Query keys still segment by locale so caches invalidate on locale change.
Listings hooks live at `src/api/listings/*` (`useListings`, `useCreateDraft`, `useUpdateDraft`, `useDiscardDraft`, `usePublishDraft`, `useMyDrafts`, `useMyListings`, `useInfiniteMyListings`, `useInfiniteMyDrafts`, `useListingDetail`, `useEditListing`, `useAttachMedia`, `useRemoveMedia`, `useReorderMedia`, `useArchiveListing`, `useDeleteListing`, `useMarkSold`, `useRepublishListing`, `useFavoriteListing`, `useUnfavoriteListing`, `useMyFavorites`). `useListingDetail` sends the auth token when available so the API can return personalized fields such as `isFavorited`. Owner mutations invalidate `detail`, `myListings`, `myListingsInfinite`, `myDrafts`, `myDraftsInfinite`, and `all` query keys on success. Favorite mutations invalidate `detail` and `favorites` query keys on success.
Uploads hook lives at `src/api/uploads/usePresignUpload`.
Exchange-rate hook lives at `src/api/exchange-rates/useExchangeRates`.
Conversation hooks live at `src/api/conversations/*` (`useConversations`, `useConversationMessages`, `useOpenConversation`, `useSendTextMessage`). `useConversations` and `useConversationMessages` are `useInfiniteQuery` hooks with cursor pagination. `useOpenConversation` invalidates the conversation list and detail on success. `useSendTextMessage` invalidates messages, conversation list, and conversation detail on success.
Conversation UI components live at `src/conversations/components/` (`ConversationList.tsx`, `ConversationListItem.tsx`, `ConversationListingCard.tsx`, `MessageBubble.tsx`, `MessageComposer.tsx`, `MessageList.tsx`, `useConversationCatalogMaps.ts`). `ConversationList` renders the authenticated conversation list with loading skeleton, empty state, error/retry, pull-to-refresh via `RefreshControl`, and infinite scroll; it uses `useConversationCatalogMaps` to resolve brand/model IDs to human-readable names for each row. `useConversationCatalogMaps` derives locale from `i18n.language` and relies on `Accept-Language` header (no `?locale=` query params). `ConversationListItem` is a compact row (listing thumbnail, title/price, last message preview, updated time, role badge, listing status when non-active) that navigates to `/conversations/[id]` with listing card params; receives `brandName`/`modelName` props from parent and falls back to raw IDs; cover image has `onError` fallback to placeholder. `ConversationListingCard` renders a compact tap-to-navigate listing card (cover image, title, price, status). `MessageBubble` supports `confirmed` / `pending` / `failed` status with retry affordance. `MessageComposer` is a `KeyboardAvoidingView` wrapper around a multiline `TextInput` (1000-char max, blank rejection) and a send button. `MessageList` is an inverted `FlatList` of `MessageBubble`s.
Listing components live at `src/listings/components/` (`ListingDetail.tsx`, `PhotoGallery.tsx`, `PriceDisplay.tsx`, `SellerBlock.tsx`, `ContactCtaBar.tsx`, `OwnerActions.tsx`, `OwnerListingCard.tsx`, `DraftCard.tsx`). `PriceDisplay` supports asymmetric owner mode (TMT + original currency). `OwnerActions` renders status-aware controls with `AlertDialog` confirmations. `OwnerListingCard` adapts the feed card visual language for owner management with status badge, Open, and Edit actions; receives `brandName`/`modelName`/`cityName` props and falls back to raw IDs; uses shared `buildVariantUrl` from `src/listings/detail/buildVariantUrl.ts` for cover images (correctly handles `listing-videos` vs `listing-photos` buckets); cover image has `onError` fallback to placeholder. `DraftCard` shows draft identity, progress, photo count, Resume, and destructive Discard with `AlertDialog` confirmation; uses shared `buildVariantUrl` for cover images with `onError` fallback. `ContactCtaBar` enables Message for eligible non-owner active listings with `allowChat=true`; anonymous taps store auth intent and route through OTP; authenticated taps call `useOpenConversation` and navigate to `/conversations/[id]`. Favorite button toggles optimistically via `useFavoriteListing` / `useUnfavoriteListing`, rolls back on mutation error, shows `ActivityIndicator` while pending, and receives initial `isFavorited` state from the parent detail screen.
Admin hooks live at `src/api/admin/*` (`useCreateReport`, `useConfig`). `useCreateReport` is a `useMutation` hook that submits reports via `POST /{targetType}s/{targetId}/report` and parses the response through `AdminSchemas.CreateReportResponseSchema`. `useConfig` is a `useQuery` hook that reads `GET /config` and parses `AdminSchemas.ConfigResponseSchema`; it is used to conditionally hide report affordances when `reportEntryEnabled` is known false.
Admin UI components live at `src/admin/components/` (`ReportSheet.tsx`). `ReportSheet` is a bottom-sheet report form rendered via RNR `Sheet` with reason picker, required-details input for `other`, generic success state, and generic error copy. It integrates with `useAuth` for auth-on-action and `useCreateReport` for submission.
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
  - **Shipped**: inline **8-step** create wizard on **`/(tabs)/sell`**, upload staging utilities, drafts/publish/edit hooks, **`/listings/[id]/edit`**, **`/(public)/listings/[id]`** complete buyer detail (photo gallery, spec grid, seller block, price with seller-term badges, Call/Message/Share/Favorite CTAs), and real mobile feed on **`/(tabs)/index`**.
  - **Shipped via #147**: My Listings/Drafts management surface at `/listings/manage` with Active/Sold/Archived/Drafts tabs, resume-any-draft, and auth-on-action. Existing `useMyListings`/`useMyDrafts` preserved for `app/_layout.tsx` orphan cleanup; new `useInfiniteMyListings`/`useInfiniteMyDrafts` power the management screen.
  - Universal Links / App Links manifest wiring via the already-installed `expo-linking`
  - Mobile foundation (`apps/mobile` deps, RNR primitives, query keys, catalog/listings/uploads hooks, upload staging pipeline) ✅ Shipped.
- **S5 (Search + listing detail)** — MLP filter sheet; mobile picker modals (brand-picker, model-picker)
- **S6 (Contact seller)** — conversation data hooks shipped (`src/api/conversations/*`). Conversation list/detail routes and visible UI remain planned; no `socket.io-client` dependency required for MLP
	- **S7 (Minimal admin + moderation)** — ✅ Shipped: report-entry UI on active non-owner listing detail (`/(public)/listings/[id]`). Report affordance is hidden for owner, sold, archived, banned, draft, or unavailable listing states. It is also hidden when `useConfig` reads `reportEntryEnabled=false` from the server; the API still enforces the guard authoritatively and returns 403 `FEATURE_DISABLED` if called. Anonymous report taps use the existing auth-on-action pattern: store auth intent and route through `/(auth)/phone`, then return to target detail (one more Report tap). `ReportSheet` component (`src/admin/components/ReportSheet.tsx`) renders a bottom sheet with reason picker (localized labels), required details field when `other` is chosen, 1000-char cap, generic success state, and generic error copy for `NOT_FOUND` / `REPORT_TARGET_NOT_REPORTABLE` / `SELF_REPORT_NOT_ALLOWED` / `USER_SUSPENDED` / `FEATURE_DISABLED`. Mobile never displays report id, queue status, duplicate/reused state, reviewer state, other reporters' counts, or target staff role. New report and duplicate pending reuse both show the same generic success copy: "Thanks, we received your report." There is no global report action, no report-from-message entry point unless S6 is explicitly reshaped, and no public report management surface. User report affordances require a visible public target and are hidden for the viewer's own profile; mobile does not special-case visible admin users or expose staff role during report creation. Client UI trims `other` details and enforces required non-empty state before submit, but API validation owns the canonical trim, blank-after-trim rejection, and final cap. S7 has no client-visible report-specific quota. Reporting is submit-only in S7: no report history screen, status tracking, edit flow, retract flow, appeals/support flow, resolution notification, or admin-reason exposure. Reported listing owners/users see no report metadata in mobile surfaces: no report count, reason/details, reporter identity, status, or admin notes; moderated targets show only generic banned/suspended state. Pending reports do not block owner archive/delete or account deletion UI in S7.
	- **S7 moderation enforcement** — banned listings disappear from public feed/search/favorites and non-owner detail; owner surfaces may show only a generic banned notice. Owner edit/media/mark-sold/archive/republish/delete actions are blocked on banned listings until admin unban. Suspended users can browse and read existing conversations, but create/edit/publish listing, contact/message, report, and other authenticated marketplace mutations show generic account-restricted UI from `FORBIDDEN` / `USER_SUSPENDED`. User suspension does not auto-hide that user's listings; only listing status/admin ban controls listing visibility.
	- **S8 (Private beta polish)** — legal/settings links, beta distribution polish, smoke-path fixes. Mobile may read server-provided beta feature state to hide unavailable entry points, but API enforcement remains authoritative. `REPORT_ENTRY_ENABLED=false` hides report affordances when known and handles HTTP 403 `FEATURE_DISABLED` with generic unavailable copy. `LISTING_PUBLISH_ENABLED=false` blocks publish affordances while draft editing can continue. `LISTING_MUTATIONS_ENABLED=false` makes owner listing surfaces read-only for create/edit/publish/media/mark-sold/archive/republish/delete while account deletion remains owned by identity. `CONTACT_ENABLED=false` hides or disables new contact/message sends while browse and existing conversation history remain readable.
- **Post-MLP Garage/Dealership** — `/me/garage`, dealer public routes, dealer-specific listing UX
- **Post-MLP rich chat** — `socket.io-client`, realtime chat routes, attachments, read receipts
- **Post-MLP notifications** — `expo-notifications` for FCM/APNS device token registration
- **Post-MLP mobile admin convenience** — add a native `/(auth)/totp` route only if admins ever need mobile admin login; S7 admin TOTP enrollment lives in `apps/admin`.
- **i18n** — ✅ Shipped: `react-i18next` + `expo-localization` + `localeStore` (zustand + AsyncStorage). Device-detect → `ru` fallback. `Accept-Language` header sent from store on every API request. Catalog hooks dropped `?locale=` params; server resolves via header. Query keys include locale segment (fixed `cities`). `authCopy` subsumed into `auth` namespace. Per-feature namespaces: `common`, `auth`, `account`, `listings`, `conversations`.

## Known issues / workarounds

### pnpm + Expo SDK 55 compatibility

**`shamefully-hoist=true` in `.npmrc`** is required. React Native / Expo / Metro expect flat `node_modules` (npm/yarn-style). Without it, dozens of transitive dependencies fail to resolve (e.g., `whatwg-fetch`, `invariant`, `react-native-css-interop`).

### Expo SDK 55 package alignment

Expo Go includes native modules at SDK-specific versions. `expo install --check` expects this app's SDK 55 package set to include `expo@55.0.26`, `expo-router@55.0.16`, `expo-camera@55.0.19`, `expo-file-system@55.0.22`, `expo-font@55.0.8`, `expo-image-manipulator@55.0.17`, `react-native@0.83.6`, `react-native-svg@15.15.3`, `react-native-reanimated@4.2.1`, and `react-native-worklets@0.7.4`. After package alignment, run `pnpm install --force` at the repo root; pnpm can otherwise leave stale symlinks in `apps/mobile/node_modules`.

Reanimated 4 initializes through Worklets. Expo SDK 55 installs `react-native-reanimated` and `react-native-worklets` together; both must be explicit app dependencies, especially when adding React Native Reusables components that import animation builders such as `FadeIn`, `FadeOut`, `SlideInDown`, or `FadeInUp`. A transitive or SDK-mismatched Worklets peer can pass typecheck and fail only inside Expo Go with `Exception in HostFunction` at module import time.

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
