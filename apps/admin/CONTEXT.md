# apps/admin — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). MLP moderation scope lives in `docs/prd/sprints/sprint-07-minimal-admin.md`; the full dashboard expansion is post-MLP per [ADR-0027](../../docs/adr/0027-mlp-beta-scope.md).

## Purpose

Internal admin dashboard. Next.js + shadcn/ui at `admin.auto.tm`. MLP beta uses it for moderation, reports, and audit log. Post-MLP expansion adds user management breadth, push announcements, dealer verification, SMS gateway health, and inspection reports.

## Audience (when shipped)

- AutoTM moderators / admins
- Always on desktop
- TOTP 2FA is required for S7 MLP admin exposure; no beta admin surface may rely on OTP-only login.

## What it contains (today)

- Next.js 16.x App Router scaffold under `src/app/` — `layout.tsx` + `globals.css` + `favicon.ico`
- `src/app/healthz/route.ts` — dependency-free deploy health endpoint (`status`/`service` + `commitSha`/`environment` from build-baked `AUTOTM_COMMIT_SHA` / Railway's `RAILWAY_ENVIRONMENT_NAME`); used by the Docker `HEALTHCHECK` and Railway health gate. Never calls the API or any data store
- `next.config.ts` sets `output: "standalone"` with `outputFileTracingRoot` at the repo root — the production image (`infra/docker/admin.Dockerfile`) runs the traced `apps/admin/server.js`, and the login page wraps its `useSearchParams` content in `<Suspense>` so the static build succeeds
- **Auth bridge (S7)** — server-side API fetch wrapper, HTTP-only cookie storage, refresh-on-401, TOTP status/enrollment/verify flow, auth gate
- `middleware.ts` — fast-path redirect when access cookie is missing on protected routes; preserves sanitized `pathname + search` as `returnTo` and forwards it to server layouts in `x-admin-return-to`
- `src/lib/cookies.ts` — canonical cookie names/flags, set/clear helpers
- `src/lib/validators.ts` — `validateReturnTo` (relative protected admin paths only), `validateOrigin`, shared `x-admin-return-to` header name
- `src/lib/api-client.ts` — server-side fetch wrapper with refresh-on-401, cookie rotation, clear+redirect on failure
- `src/lib/qrcode.ts` — server-side QR data URL generation (TOTP secret never reaches client bundle)
- `src/app/actions.ts` — server actions for: request OTP, verify OTP, TOTP status/enroll/verify, logout, logout-all, auth gate helpers
- `src/app/(admin)/actions.ts` — server actions for moderation (`listReports`, `getReportDetail`, `dismissReport`, `banListing`, `unbanListing`, `suspendUser`, `unsuspendUser`), audit (`listAuditEntries`), config (`getConfig`), and **S9a inspection-interest stats (`listInspectionInterestStats`)**
- `src/app/login/page.tsx` — OTP entry → TOTP enroll/verify UI with backup codes display
- `src/app/(admin)/layout.tsx` — protected layout with full auth+elevation check via API
- `src/app/(admin)/reports/page.tsx` — reports list (pending default, status/targetType filters, pagination, empty state, invalid-filter reset)
- `src/app/(admin)/reports/inspection-interests/page.tsx` — S9a inspection-interest counts surface; lists aggregate interest per listing (total, buyer, seller) plus willingness-to-pay sum/count/average; paginated, dense operational table with deep-links to listing action pages
- `src/app/(admin)/reports/[id]/page.tsx` — report detail with reporter/target summaries, live counts, dismiss/ban/suspend action forms with required reason; conditionally hides action forms when `ADMIN_MODERATION_ACTIONS_ENABLED=false`
- `src/app/(admin)/listings/[id]/page.tsx` — listing deep-link action page (direct ban/unban); conditionally hides forms when `ADMIN_MODERATION_ACTIONS_ENABLED=false`
- `src/app/(admin)/users/[id]/page.tsx` — user deep-link action page (direct suspend/unsuspend); conditionally hides forms when `ADMIN_MODERATION_ACTIONS_ENABLED=false`
- `src/app/(admin)/audit/page.tsx` — audit list (newest-first, action/targetType/targetId filters, pagination)
- Workspace deps: `@auto-tm/contracts`, `@auto-tm/ui`, `shadcn`, `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `qrcode`

## Public API surface

None — admin app calls `apps/api` only through server actions / route handlers.

## Dependencies

- `apps/api` (HTTP, server-side only)
- `packages/contracts` (typed client)
- `packages/ui` (tokens + shadcn theme)

## Auth flow

- Phone OTP → normal non-elevated session → TOTP status (`/auth/admin/totp/status`) → already-enrolled admins go directly to the TOTP verify form, while not-yet-enrolled admins call TOTP enroll and receive a QR data URL server-side (issuer `auto.tm Admin`). Pending enrollment is idempotent across sessions until first verification, so an admin who scans the QR, leaves, and logs in again sees the same QR and can use the saved authenticator entry. First TOTP verify returns `adminTotpExpiresAt` plus 10 backup codes exactly once → screen-only backup-code display with copy-to-clipboard → later elevation accepts TOTP or one backup code and returns `adminTotpExpiresAt` only → 12-hour admin elevation on the same session → redirect to `/reports`. Refresh preserves but never extends elevation.
- A `role = admin` user provisioned by the S7 bootstrap runbook/script without TOTP is a pending admin assignment; the admin app shows only the TOTP setup/verify path until `AdminGuard` access succeeds.

## Token bridge

- Admin access/refresh tokens stored in HTTP-only cookies readable only by the Next.js server.
- Production cookie names: `__Host-auto_tm_admin_access` / `__Host-auto_tm_admin_refresh` with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, no `Domain`.
- Local dev: unprefixed `auto_tm_admin_access` / `auto_tm_admin_refresh` (when `__Host-` constraints can't be met).
- Browser client code never receives tokens and never calls `apps/api` directly.
- Server actions / route handlers call `apps/api` with `Authorization: Bearer <accessToken>`.

## Server action API wrapper

- `apiFetch`: forwards bearer token, refreshes once on API 401 using the refresh cookie, rotates cookies on success, retries original request once, clears cookies + redirects to `/login` on refresh failure.
- `apiFetchOptional`: same as `apiFetch` but returns `null` instead of redirecting on auth failure. Used for optional auth checks.
- Refresh never extends TOTP elevation.

## Auth gate

- `middleware.ts`: fast-path redirect to `/login` when access cookie is missing on protected paths (`/reports`, `/audit`, `/listings`, `/users`).
- `app/(admin)/layout.tsx`: full auth validation via `requireAuthWithReturnTo()` server action. Calls `/auth/admin/totp/status`, handles 401 refresh, redirects to `/login` or `/login?mode=totp` with the middleware-provided sanitized `returnTo`.

## TOTP `returnTo`

- Validated by `validateReturnTo`: accepts only relative protected admin paths (`/reports`, `/audit`, `/listings`, `/users`, including nested paths and query strings).
- Rejects absolute URLs, protocol-relative URLs, cross-host redirects, and paths with dangerous characters.
- The login page also re-validates the query-string `returnTo` before `router.push`; invalid values fall back to `/reports`.

## Non-admin on admin host

- After OTP success, if `role !== admin`, clears cookies and shows generic "Доступ к панели администратора ограничен" copy without exposing normal-user account details.

## CSRF posture

- No separate CSRF-token system. Admin mutations stay behind same-site server actions / route handlers.
- Browser-posted route handlers validate `Origin` against the configured admin origin (`ADMIN_ORIGIN` env var, or derived from request URL). No `Referer` fallback.

## Logout

- `logout`: attempts API logout server-side with the refresh token, then clears both cookies locally even if API call fails. Redirects to `/login`.
- `logoutAll`: attempts bearer-protected API logout-all endpoint, then clears both cookies locally even if revoke fails. Redirects to `/login`.

## App Router routes

- `/healthz` — dependency-free deploy health (Railway/Docker healthchecks)
- `/login` — OTP entry + TOTP enrollment/verify
- `/reports` — MLP moderation queue (pending default, filters, pagination, empty state)
- `/reports/inspection-interests` — S9a inspection-interest counts and willingness-to-pay summary
- `/reports/:id` — report detail with action forms (dismiss, ban, suspend)
- `/listings/:id` — direct listing ban/unban action page
- `/users/:id` — direct user suspend/unsuspend action page
- `/audit` — audit log list with filters
- `/dashboard`, `/dealers`, `/notifications`, `/sms`, `/catalog` — post-MLP

## Testing

- Unit tests in `src/lib/`:
  - `validators.spec.ts` — `validateReturnTo` accepts/rejects paths, `validateOrigin` matches/rejects origins, no Referer fallback
  - `middleware.spec.ts` — missing-cookie redirects preserve `pathname + search` in `returnTo`; protected requests with an access cookie forward sanitized `x-admin-return-to`
  - `cookies.spec.ts` — canonical names/flags, set/clear, no token leakage in logs
  - `api-client.spec.ts` — bearer forwarding, refresh-on-401 with retry, cookie rotation, clear+redirect on refresh failure, no token material in errors
- Moderation server-action tests in `src/app/(admin)/actions.spec.ts`:
  - `listReports` / `getReportDetail` / `listAuditEntries` success + error paths
  - `dismissReport` / `banListing` / `unbanListing` / `suspendUser` / `unsuspendUser` success + conflict/policy error handling (REPORT_ALREADY_RESOLVED, MODERATION_TARGET_STATE_CONFLICT, ADMIN_TARGET_NOT_MODERATABLE, SELF_MODERATION_NOT_ALLOWED, FEATURE_DISABLED)
  - `getConfig` success + error paths
  - `listInspectionInterestStats` success + error paths and pagination forwarding
  - Operator-script actor rendering, audit entry fields
- Admin auth server-action tests in `src/app/actions.spec.ts`:
  - `verifyOtp` surfaces whether TOTP is already enrolled after OTP succeeds
  - `enrollTotp` marks verified-enrollment conflicts with `reason = "already-enrolled"` so the login UI can show verify without an error banner

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Next.js + shadcn/ui
- [ADR-0006](../../docs/adr/0006-auth.md) — Admin OTP + TOTP 2FA
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0027](../../docs/adr/0027-mlp-beta-scope.md) — Minimal admin first; full dashboard post-MLP
- [ADR-0039](../../docs/adr/0039-phased-cloud-first-hosting.md) — Railway-era hosting; `/healthz` deploy evidence
