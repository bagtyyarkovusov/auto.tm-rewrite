# apps/mobile — CONTEXT

## Purpose

The primary user surface. Expo (React Native) app for Android + iOS. Anonymous browsing + auth-on-action for buyers and sellers.

## Audience

- TM-based buyers and sellers
- Private users (most) and dealership reps (few but high-value)

## What it contains

- `expo-router` for navigation
- 5-tab bottom nav: Search / Favorites / [+] Sell / Chat / Services
- NativeWind for styling (Tailwind classnames in RN)
- shadcn-style component library mirrored from `packages/ui/`
- `expo-image-manipulator` for client-side image compression
- `react-native-compressor` for client-side video compression (custom dev client required)
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

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Expo
- [ADR-0006](../../docs/adr/0006-auth.md) — OTP + action-gated auth
- [ADR-0008](../../docs/adr/0008-media.md) — Client-side compression mandatory
