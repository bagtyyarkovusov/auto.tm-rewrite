# 79 — Web vs mobile

## What's shared

- **Design tokens** — `packages/ui/tokens/` is the single source of truth for colors, typography, spacing, radii, shadows, motion
- **Component names + prop contracts** — `<Button intent="primary" size="md">` means the same thing on both platforms
- **Icon names** — `Heart`, `MessageSquare`, etc., from Lucide
- **Copy / translations** — i18n JSON files are duplicated per app, but content is identical
- **Domain concepts** — Listing card looks similar (same brand badge, same price format, same favorite ♥)

## What's different (and why)

| Aspect | Web | Mobile | Why different |
|---|---|---|---|
| Component implementations | React DOM + Tailwind | React Native + NativeWind | Different rendering primitives |
| Navigation | Next.js App Router (file-based, server-rendered) | expo-router (file-based, client-side) | Different runtime models |
| Forms | HTML `<form>` + native validation | TextInput + manual validation | Different input primitives |
| Modals | Radix Dialog (overlays page) | react-native-bottom-sheet (slides up) | Mobile expects sheet, web expects modal |
| Image picker | Custom (Phase 2+) | `expo-image-picker` | Mobile has camera + library; web is upload-only |
| Camera | None | `expo-camera` | Web doesn't shoot photos in MVP |
| Push notifications | Browser Notification API (Phase 2) | FCM/APNS via `expo-notifications` | Native is essential mobile feature |
| Storage | localStorage / cookies | `expo-secure-store` + AsyncStorage | Web has no secure storage equivalent |
| Maps | Static images / Phase 2 embeds | Native maps SDK | Mobile has reliable native maps |
| WebSockets | Browser WebSocket | Socket.IO client | Same protocol, different SDK |

## Feature parity matrix (Phase 1)

| Feature | Mobile | Public web | Admin web |
|---|---|---|---|
| Browse feed | ✓ | ✗ (landing only) | ✗ |
| Listing detail | ✓ | ✓ (OG, anonymous) | ✓ (with moderation toolbar) |
| Create listing | ✓ | ✗ | ✗ |
| Favorites | ✓ | ✗ | ✗ |
| Saved searches | ✓ | ✗ | ✗ |
| Chat | ✓ | ✗ | ✗ |
| Garage | ✓ | ✗ | ✗ |
| Dealer page | ✓ | ✓ (OG, anonymous) | ✓ (verify action) |
| Blog post view | ✓ | ✓ (OG, anonymous) | ✓ |
| Blog post create | ✓ | ✗ | ✗ |
| User profile | ✓ | ✗ | ✓ (admin view) |
| Settings | ✓ | ✗ | ✓ |
| Notifications | ✓ | ✗ | ✓ (send broadcast) |
| Login | ✓ (OTP) | ✗ | ✓ (OTP + TOTP) |
| Admin moderation | ✗ | ✗ | ✓ |
| Catalog edit | ✗ | ✗ | ✓ |
| SMS gateway health | ✗ | ✗ | ✓ |
| Inspection reports (Phase 2) | View | View | Create + edit + publish |

## Public web's minimal scope

The public web (`apps/web` at `auto.tm`) is intentionally limited:

- Landing page (marketing)
- Listing detail (so shared links work + Google indexes)
- Dealer page (same reasons)
- Blog post view (same)
- Legal pages

It does NOT do: search, browse feed, chat, sell, favorite, profile.

Reason: TM users are mobile-first. Building full web parity adds 3-4 months and forces forever-maintenance of web/mobile feature parity. We send web visitors to install the app, not to browse on desktop.

## Why public web exists at all

Three reasons:

1. **Deep-link unfurl** — when Aman shares `https://auto.tm/listings/abc` in WhatsApp, the recipient sees a rich preview (photo, title, price). Requires server-rendered HTML with OG meta. Mobile-only doesn't give this.
2. **SEO** — Google indexes listings so people find them via search.
3. **No-app fallback** — when someone taps a shared link and doesn't have the app, the web page lets them see the listing AND prompts them to install.

## Admin web's full scope

Admin (`apps/admin` at `admin.auto.tm`) is desktop-focused, full-featured:

- All admin operations (moderation, user mgmt, broadcasts, catalog edit, gateway health, audit)
- Phase 2 inspection report workflow

Built with shadcn/ui for productivity and a clean look. NOT mobile-optimized — admins use desktops.

## Decision tree: where does this feature live?

```
Is the audience an admin?
├── YES → apps/admin only
└── NO → continues...

Is it a transaction (buy / sell / message / favorite)?
├── YES → apps/mobile only (don't build for web)
└── NO → continues...

Is it shareable / SEO-worthy / openable from a link?
├── YES → apps/mobile + apps/web (with OG meta)
└── NO → apps/mobile only
```

## References

- [Feature 38 — Showroom](../features/38-showroom.md) — web example
- [Feature 40 — Admin](../features/40-admin.md) — admin web only
- `apps/web/CONTEXT.md`, `apps/admin/CONTEXT.md`, `apps/mobile/CONTEXT.md`
- [ADR-0002 — Stack](../../adr/0002-stack.md)
