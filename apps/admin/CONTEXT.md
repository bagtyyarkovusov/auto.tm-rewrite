# apps/admin — CONTEXT

## Purpose

Internal admin dashboard. Next.js 15 + shadcn/ui at `admin.auto.tm`. Used by ~5-10 AutoTM staff for moderation, user management, push announcements, dealer verification, SMS gateway health, and (Phase 2) inspection reports.

## Audience

- AutoTM moderators / admins
- Always on desktop
- TOTP 2FA required after phone OTP login

## What it contains

- App Router routes under `app/`
- Server actions for mutations
- shadcn/ui components consuming `packages/ui/tokens/`
- Auth flow: Phone OTP → TOTP → JWT in HTTP-only cookie
- All-RBAC-gated: every route checks `role === 'admin'` + permission flags

## Pages (Phase 1)

| Route | Purpose |
|---|---|
| `/login` | OTP entry + TOTP |
| `/dashboard` | Overview: active listings, pending moderation, gateway health |
| `/listings` | List + filter + moderate listings |
| `/listings/:id` | View + moderate a listing |
| `/users` | List users + search |
| `/users/:id` | View user, suspend / unsuspend |
| `/dealers` | List dealerships + verify status |
| `/dealers/:id` | View dealership, edit, mark verified |
| `/notifications` | Send notification to all / segment / topic; view history + stats |
| `/sms` | Per-phone health, recent OTPs, error rate, SIM credit (manual) |
| `/catalog` | Manage brands / models / generations / colors / regions (trilingual) |
| `/audit` | Audit log of admin actions |
| `/reports` (Phase 2) | Inspection reports CRUD + PDF generation |

## Public API surface

None — admin app calls `apps/api` only.

## Dependencies

- `apps/api` (HTTP)
- `packages/contracts` (typed client)
- `packages/ui` (tokens + shadcn theme)

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Next.js + shadcn/ui
- [ADR-0006](../../docs/adr/0006-auth.md) — Admin OTP + TOTP 2FA
