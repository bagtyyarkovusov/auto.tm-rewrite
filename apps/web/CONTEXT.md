# apps/web — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). The public web app is a **scaffold** today; listing detail rendering ships in S4/S5 and MLP public-web polish ships in S8. Aspirational content lives in the relevant sprint files and feature PRDs.

## Purpose

Public-facing web at `auto.tm`. Next.js + shadcn/ui. When shipped, serves:

1. **Deep-link landing pages** — when someone shares `https://auto.tm/ru/listings/abc` in WhatsApp, this app serves the unfurl preview + the web page if the recipient doesn't have the app installed
2. **SEO** — listings indexed by Google so people can find them via search
3. **Marketing** — landing page, "Get the app" CTA

Scope is intentionally **minimal** for MVP — full marketplace functionality stays in the mobile app.

## Audience (when shipped)

- Anonymous web visitors clicking shared links
- Google bot crawling listings
- Marketing landing page visitors

## What it contains (today)

- Next.js scaffold under `src/app/[locale]/` — `layout.tsx` + stub `page.tsx` + `globals.css`
- `src/middleware.ts` for locale routing
- `src/i18n/locales.ts` defining supported locales
- `src/lib/utils.ts` — `cn()` helper
- `src/components/ui/button.tsx` — first installed shadcn component
- `@auto-tm/web` consuming `next@^16.2.2`, workspace deps `@auto-tm/contracts` + `@auto-tm/ui`
- No listing/dealer/blog routes yet; no SSR data fetching; no OG metadata logic; no Universal Links / App Links manifests

## Public API surface

None — web calls `apps/api` for listing/dealer/blog data via SSR.

## Dependencies

- `apps/api` (HTTP, SSR data fetching)
- `packages/contracts` (typed client)
- `packages/ui` (tokens + shadcn theme)

## Planned additions (future sprints)

Per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in the named sprint files:

- **S4 (Listings CRUD)** — `docs/prd/sprints/sprint-04-listings-crud.md`. Adds:
  - `/[locale]/listings/[id]` — public listing detail (photo gallery, full spec, "Open in app" + "Get the app" CTAs)
  - OG metadata via `generateMetadata()`: `og:title = "{Brand} {Model}, {Year} — {Price}"`, `og:image` (1200×630 first photo), `og:description`, `twitter:card = summary_large_image`
- **S5 (Search + listing detail)** — public listing detail polish and minimal share URL / OG behavior
- **S6 (Contact seller)** — listing-detail Message CTA points to the MLP contact flow
- **S8 (Private beta polish)** — simple landing page, `/[locale]/legal/privacy`, `/[locale]/legal/terms`, and any beta-required link metadata
- **Post-MLP dealership bet** — `/[locale]/dealers/[slug]` public dealer showroom
- **Post-MLP rich public web** — app-store badges, Universal Links / App Links polish, blog read-only pages (`/[locale]/blog/[id]`)

## What this app will NOT do (MVP)

- No search / browse feed (users go to the app)
- No chat
- No create listing
- No favorites or saved searches
- No profile / garage

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Next.js for SSR + OG
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
