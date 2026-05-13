# apps/web — CONTEXT

## Purpose

Public-facing web at `auto.tm`. Next.js 15 + shadcn/ui. Serves:

1. **Deep-link landing pages** — when someone shares `https://auto.tm/ru/listings/abc` in WhatsApp, this app serves the unfurl preview + the web page if the recipient doesn't have the app installed
2. **SEO** — listings indexed by Google so people can find them via search
3. **Marketing** — landing page, "Get the app" CTA

Scope is intentionally **minimal** for MVP — full marketplace functionality stays in the mobile app.

## Audience

- Anonymous web visitors clicking shared links
- Google bot crawling listings
- Marketing landing page visitors

## What it contains

- App Router routes under `app/[lang]/`
- Server-rendered HTML with full OG meta via `generateMetadata()`
- shadcn/ui components consuming `packages/ui/tokens/`
- Anonymous-only (no login flow at all in MVP)
- "Open in app" CTAs that trigger Universal Links / App Links

## Pages (Phase 1)

| Route | Purpose |
|---|---|
| `/[lang]` | Landing page (hero, value props, screenshots, app store badges) |
| `/[lang]/listings/[id]` | Public listing detail (photo gallery, full spec, "Open in app" + "Get the app") |
| `/[lang]/dealers/[slug]` | Public dealer showroom |
| `/[lang]/blog/[id]` | Read-only blog post (Bortzhurnal) |
| `/[lang]/legal/privacy` | Privacy policy |
| `/[lang]/legal/terms` | Terms of service |
| `/.well-known/apple-app-site-association` | Universal Links manifest |
| `/.well-known/assetlinks.json` | Android App Links manifest |

## What this app does NOT do (MVP)

- No search / browse feed (users go to the app)
- No chat
- No create listing
- No favorites or saved searches
- No profile / garage

## Public API surface

None — web calls `apps/api` for listing/dealer/blog data via SSR.

## OG / SEO requirements

Every listing detail page sets:
- `og:title` = "{Brand} {Model}, {Year} — {Price}"
- `og:image` = listing first photo, 1200×630 cropped
- `og:description` = "{Mileage}, {Region}, {Condition}"
- `og:url` = canonical
- `twitter:card` = `summary_large_image`

## Dependencies

- `apps/api` (HTTP, SSR data fetching)
- `packages/contracts` (typed client)
- `packages/ui` (tokens + shadcn theme)

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Next.js for SSR + OG
