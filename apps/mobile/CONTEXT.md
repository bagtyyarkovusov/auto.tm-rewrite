# apps/mobile — CONTEXT

## Purpose

The primary user surface. Expo (React Native) app for Android + iOS. Anonymous browsing + auth-on-action for buyers and sellers.

## Audience

- TM-based buyers and sellers
- Private users (most) and dealership reps (few but high-value)

## What it contains

- `expo-router` for navigation
- 5-tab bottom nav: Search (feed) / Favorites / [+] Sell / Chat / Services (implemented as placeholder screens; OTP trigger on feed)
- NativeWind v4 + React Native Reusables (RNR) for ALL styling and composite components — see [`docs/agents/nativewind-v4.md`](../../docs/agents/nativewind-v4.md) for the authoritative guide (theme tokens, setup recipe, customization rules, component catalogue)
- RNR components are CLI-installed into `apps/mobile/components/ui/` and owned by the repo. `packages/ui/components/*` is WEB-ONLY (uses HTML elements) — never import it on mobile. Tokens (`@auto-tm/ui/tokens`, `@auto-tm/ui/theme/tailwind`) ARE shared across web + mobile and are the single source of truth for brand values.
- `expo-image-manipulator` for client-side image compression
- `react-native-compressor` for client-side video compression (custom dev client required for that flow; Expo Go is valid for current routing/auth smoke checks)
- `react-native-svg` for vector icons and brand SVG rendering; local `.svg` imports use `react-native-svg-transformer` at build time
- `@aws-sdk/client-s3` for presigned MinIO uploads
- Socket.IO client for chat WebSocket
- `expo-notifications` for FCM/APNS device token registration
- `expo-linking` for Universal Links / App Links handling
- `react-i18next` for RU + TK + EN
- `expo-image` is deferred until remote listing/gallery media needs caching, placeholders, and transitions; S2 auth does not add it for the static logo

## Top-level routes (Phase 1)

```
/(tabs)/
  index               Feed (personalized listings)
  favorites           Favorites + saved searches + comparisons
  sell                Sell / listing wizard entry
  chat                Conversation list
  services            Profile, garage, settings, blog, etc.

/(auth)/
  phone               Phone entry
  otp                 OTP verification
  totp                Admin TOTP (admin-flagged users only)

/(public)/
  listings/[id]       Listing detail (works for anon + auth)
  dealers/[slug]      Dealer showroom
  blog/[id]           Blog post

/chat/[conversationId]    Chat thread
/sell/wizard              Create listing wizard (7 steps)
/me                       Profile
/me/garage                My Garage
/me/listings              My listings
/me/saved-searches        My saved searches
```

## Deep link manifest

Paths that open the app via Universal Link / App Link:
- `/listings/*`
- `/dealers/*`
- `/blog/*`
- `/chat/*` (auth-gated; falls back to login flow)

Web-only (open in browser, never in app):
- `/admin/*`
- `/legal/*`

## State management

- React state for local UI
- React Query for server cache + mutations
- `expo-secure-store` for JWT access + refresh tokens
- `AsyncStorage` for local-only data (recent views, theme preference, locale override)

## Dependencies

- `apps/api` (HTTP + WS)
- `packages/contracts` (typed client)
- `packages/ui` (tokens — components are duplicated for RN, but tokens shared)

## Known issues

### pnpm + Expo SDK 55 compatibility

**`shamefully-hoist=true` in `.npmrc`** is required. React Native / Expo / Metro expect flat `node_modules` (npm/yarn-style). Without it, dozens of transitive dependencies fail to resolve (e.g., `whatwg-fetch`, `invariant`, `react-native-css-interop`).

### Expo SDK 55 package alignment

Expo Go includes native modules at SDK-specific versions. `expo install --fix` aligned this app to the SDK 55 expected package set, including `expo-router@55.0.14`, `react-native@0.83.6`, `react-native-svg@15.15.3`, and `react-native-reanimated@4.2.1`. After package alignment, run `pnpm install --force` at the repo root; pnpm can otherwise leave stale symlinks in `apps/mobile/node_modules`.

Agents must run the mobile gate in `docs/agents/mobile-expo.md` before claiming SDK/package/runtime fixes. The first command is always:

```bash
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
```

### react-native-screens Fabric source path

`react-native-screens` must keep using its React Native/Fabric source path in SDK 55 / Expo Go. Do not redirect it to `lib/commonjs/`; that bypasses Fabric view-config registration and caused `RNSSafeAreaView` runtime crashes.

Earlier local Codegen/screens patches were only workarounds for the stale `react-native@0.83.0` install. With SDK-aligned `react-native@0.83.6`, unpatched `react-native-screens@4.23.0` parses through `@react-native/codegen@0.83.6`.

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Expo
- [ADR-0006](../../docs/adr/0006-auth.md) — OTP + action-gated auth
- [ADR-0008](../../docs/adr/0008-media.md) — Client-side compression mandatory
