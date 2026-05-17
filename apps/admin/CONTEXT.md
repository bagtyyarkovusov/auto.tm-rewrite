# apps/admin — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). The admin app is a **stub** today; the full dashboard ships in S9. Aspirational content lives in `docs/prd/sprints/sprint-09-admin.md`.

## Purpose

Internal admin dashboard. Next.js + shadcn/ui at `admin.auto.tm`. Used by ~5-10 AutoTM staff for moderation, user management, push announcements, dealer verification, SMS gateway health, and (Phase 2) inspection reports.

## Audience (when shipped)

- AutoTM moderators / admins
- Always on desktop
- TOTP 2FA required after phone OTP login (TOTP enrollment ships in S9 per ADR-0006 / ADR-0012)

## What it contains (today)

- Next.js scaffold under `src/app/` — `layout.tsx` + stub `page.tsx` + `globals.css` + `favicon.ico`
- Next.js version 16.x (`@auto-tm/admin` consuming `next@^16.2.2`)
- Workspace deps: `@auto-tm/contracts`, `@auto-tm/ui`, `shadcn`, `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`
- No routes beyond the index stub, no auth wiring, no API client, no shadcn components installed via CLI yet

## Public API surface

None — admin app calls `apps/api` only.

## Dependencies

- `apps/api` (HTTP)
- `packages/contracts` (typed client)
- `packages/ui` (tokens + shadcn theme)

## Planned additions (S9 — Admin dashboard)

Per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in `docs/prd/sprints/sprint-09-admin.md`:

- Auth flow: Phone OTP → TOTP enrollment + verify → JWT in HTTP-only cookie
- App Router routes:
  - `/login` — OTP entry + TOTP
  - `/dashboard` — overview: active listings, pending moderation, gateway health
  - `/listings` + `/listings/:id` — moderate listings
  - `/users` + `/users/:id` — list / suspend
  - `/dealers` + `/dealers/:id` — verify dealerships
  - `/notifications` — broadcast + history
  - `/sms` — gateway health, recent OTPs, error rate
  - `/catalog` — manage brands / models / generations / colors / regions (trilingual)
  - `/audit` — admin-action audit log
  - `/reports` (Phase 2) — inspection reports CRUD + PDF
- Server actions for mutations
- shadcn/ui components installed via CLI consuming `packages/ui/tokens/`
- RBAC: every route checks `role === 'admin'` + permission flags
- API client wired via `@auto-tm/contracts` typed routes

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Next.js + shadcn/ui
- [ADR-0006](../../docs/adr/0006-auth.md) — Admin OTP + TOTP 2FA
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
