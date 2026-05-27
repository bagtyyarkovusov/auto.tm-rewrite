# apps/admin — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). The admin app is a **stub** today. MLP moderation scope lives in `docs/prd/sprints/sprint-07-minimal-admin.md`; the full dashboard expansion is post-MLP per [ADR-0027](../../docs/adr/0027-mlp-beta-scope.md).

## Purpose

Internal admin dashboard. Next.js + shadcn/ui at `admin.auto.tm`. MLP beta uses it for moderation, reports, and audit log. Post-MLP expansion adds user management breadth, push announcements, dealer verification, SMS gateway health, and inspection reports.

## Audience (when shipped)

- AutoTM moderators / admins
- Always on desktop
- TOTP 2FA is required for S7 MLP admin exposure; no beta admin surface may rely on OTP-only login.

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

## Planned additions (S7 MLP moderation + post-MLP dashboard)

Per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md), MLP moderation is tracked in `docs/prd/sprints/sprint-07-minimal-admin.md`. Broader dashboard work is tracked in `docs/prd/features/40-admin.md` until a post-MLP sprint is shaped.

- Auth flow: Phone OTP -> normal non-elevated session -> TOTP status returns only `enrolled`, `elevated`, and `adminTotpExpiresAt?` -> TOTP enroll returns QR only using issuer label `auto.tm Admin` -> first TOTP verify returns `adminTotpExpiresAt` plus backup codes exactly once -> screen-only backup-code display with copy-to-clipboard -> later elevation accepts TOTP or one backup code through the same verify endpoint and returns `adminTotpExpiresAt` only -> 12-hour admin elevation on the same session -> redirect to `/reports`; refresh preserves but never extends elevation. If `AdminGuard` returns 403 because elevation expired, route the admin back to TOTP verification and preserve the intended destination.
- A `role = admin` user provisioned by the S7 bootstrap runbook/script without TOTP is a pending admin assignment; the admin app may show only the TOTP setup/verify path until `AdminGuard` access succeeds.
- Token bridge: admin access/refresh tokens are stored in HTTP-only cookies readable only by the Next.js server; browser client code never receives tokens and never calls `apps/api` directly. Production cookie names are `__Host-auto_tm_admin_access` and `__Host-auto_tm_admin_refresh` with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, no `Domain`, and max ages aligned to the API access-token and refresh/session lifetimes. Local dev may use unprefixed `auto_tm_admin_access` / `auto_tm_admin_refresh` only when the `__Host-` constraints cannot be satisfied. Server actions / route handlers call `apps/api` with `Authorization: Bearer <accessToken>`.
- Server actions / route handlers refresh once on API HTTP 401 using the refresh cookie, set rotated cookies on success, retry the original API request once, and clear cookies + redirect to login if refresh fails. A refreshed access token does not extend TOTP elevation; API HTTP 403 from expired elevation redirects to TOTP verification.
- TOTP `returnTo` is a relative internal admin path only. Reject absolute URLs, protocol-relative URLs, and cross-host redirects before redirecting after verification.
- If OTP succeeds on the admin host but the user is not `role = admin`, clear admin cookies and show generic "Admin access required" copy without exposing normal-user account details.
- CSRF posture: S7 does not add a separate CSRF-token system because admin mutations stay behind same-site server actions / route handlers. If a public route handler accepts a browser POST, it validates `Origin` against the configured admin origin and does not use `Referer` fallback.
- Logout: admin logout attempts API logout server-side with the refresh token, but clears both admin cookies locally even if API logout fails. Logout-all attempts the bearer-protected API logout-all endpoint and then clears both cookies locally even if revoke fails.
- S7 has no multi-tab heartbeat/session polling. The first tab/action/load to hit expired TOTP redirects to verification; other tabs discover expiry on their next protected server action or route load.
- Admin TOTP calls use `GET /auth/admin/totp/status`, `POST /auth/admin/totp/enroll`, and `POST /auth/admin/totp/verify`; they require `role = admin`, valid `sid`, and Session ownership, and they do not go through `AdminGuard`. Verified re-enroll returns `TOTP_ALREADY_ENROLLED`; pending unverified enrollment can be replaced if the admin loses the QR before verification.
- Admin TOTP/backup-code failures show the same generic error. The API throttles verification to 5 failed attempts per admin user/session per 10 minutes; throttled attempts use the standard rate-limit error.
- App Router routes:
  - `/login` — OTP entry + TOTP enrollment/verify
  - `/reports` + `/reports/:id` — MLP moderation queue
  - `/listings/:id` — MLP listing moderation action page, reachable from report detail or by known id; no `/listings` index/search page in S7
  - `/users/:id` — MLP user suspension action page, reachable from report detail or by known id; no `/users` index/search page in S7
  - `/audit` — MLP admin-action audit log
  - `/dashboard`, `/dealers`, `/notifications`, `/sms`, `/catalog` — post-MLP dashboard expansion; S7 has no dashboard landing page and no catalog UI
  - `/inspection-reports` (Phase 2) — inspection reports CRUD + PDF; the bounded context remains `reports/`, but the admin UI route is explicit to avoid colliding with S7 moderation reports
- Server actions / route handlers for API calls and mutations; direct browser calls to `apps/api` are not part of the MLP admin auth path. Rendered admin pages, JSON props, logs, and client-readable storage must never contain access or refresh tokens.
- shadcn/ui components installed via CLI consuming `packages/ui/tokens/`
- RBAC: every route checks `role === 'admin'` plus the TOTP-elevated admin session; the API enforces the same policy through `AdminGuard`; permission flags are post-MLP if added
- API client wired via `@auto-tm/contracts` typed routes
- Admin UI imports S7 admin constants and DTO types from `@auto-tm/contracts` for report reasons, content-report statuses, audit actions, and canonical `details.reason` handling. It must not maintain parallel string literals for these contracts.
- Admin UI reads S7/private-beta feature state from server-side config exposed through the admin server layer, never from client-owned local state. When `ADMIN_MODERATION_ACTIONS_ENABLED=false`, report/audit reads still render but dismiss/ban/unban/suspend/unsuspend controls are hidden or disabled. Server actions still handle API HTTP 403 `FORBIDDEN` with `details.reason = "FEATURE_DISABLED"` by refreshing and showing generic unavailable copy, because API enforcement is authoritative.
- Reports list uses the API's `OffsetPagination` (`page`, `pageSize`; default page size 50), defaults to pending reports, sorts oldest first with deterministic ties (`createdAt ASC, id ASC`), and exposes only status + target-type filters in S7. List rows expose exactly `id`, `status`, `createdAt`, `reason`, `targetType`, `targetId`, and `targetSummary`. `targetSummary` is live-resolved: listing targets use a display title such as year/make/model or listing title when available; user targets use a public display label when available; missing targets use an unavailable/deleted marker. List rows do not include report `details` preview text, reporter identity fields, full target state, counts, actionability flags, or `target.role`; the UI loads report detail before showing full details, reporter summary, target state, counts, actionability, or role-dependent suspend controls. Assignment, severity, age/SLA filters, full-text search, and smart prioritization are post-MLP.
- Invalid report-list filters or pagination (`status`, `targetType`, `page`, `pageSize`) reset to the default pending reports queue after the API returns `VALIDATION_FAILED`. The pending queue uses a simple empty state when there are no `status=pending` rows; S7 does not add dashboard cards or analytics to explain queue volume.
- Admin report/audit lists use default page size 50 and S7 effective max page size 100. Valid pages beyond the current result set render the same empty table state as any empty result; invalid `page` / `pageSize` values reset to the relevant default view after `VALIDATION_FAILED`.
- Report detail UI stays lean in S7: reporter summary or deleted-user state, target summary or unavailable state, report reason/details rendered as escaped plain text with line breaks preserved, status/timestamps, target moderation state, and two exact counts when available. Detail target summaries may include listing title/year/make/model/status and, for user targets, admin-only `target.role`; the UI uses it to explain/disable admin-target suspend without adding broader staff profile or permissions UI. Reporter/reviewer summaries are live minimal identity summaries or deleted-user state; `ContentReport` stores no phone/name/profile snapshots. `pendingReportsOnTargetCount` counts currently pending reports for the same target, including the current report if still pending. `reportsSubmittedByReporterCount` counts all historical S7 report rows by that reporter across listing/user targets and all statuses, and is omitted after reporter deletion. The API computes both counts live on report detail; the admin UI does not maintain client-side aggregate state. Reason enum labels are mapped locally in the admin UI. No rolling windows, trust scores, severity scores, conversation excerpts, deep reporter/owner history, reporter reputation, cross-report clustering, text classifier output, linkification/rich-preview behavior, or PII scan result ships in the MLP.
- Later reporter suspension or deletion does not invalidate a pending report in the admin UI. Deleted reporters render as deleted-user state; suspended reporters, if surfaced by the API summary, are context only. The UI does not auto-dismiss, hide, or disable report actions based on reporter current state.
- Report detail always allows dismiss for pending reports, even when the target is unavailable or no longer actionable. Ban/suspend actions are shown only when the current target state is actionable; stale action attempts surface the API's `REPORT_TARGET_NOT_ACTIONABLE` conflict and prompt refresh. A still-pending report is not invalidated by an earlier direct ban/unban or suspend/unsuspend cycle, so the UI bases report-backed action availability on current target state only and does not track moderation epochs or staleness locks. If a report-backed action succeeds, only the current supplied report is shown as `actioned`; sibling pending reports on the same target are not optimistically resolved. If a report-backed action returns `REPORT_TARGET_MISMATCH`, the UI treats it as a stale/wrong-link validation error and prompts refresh; no optimistic target state changes are kept.
- The admin UI does not expire, auto-dismiss, auto-close, or hide pending reports by age. Operational SLA misses are handled outside the S7 state machine by humans adding moderation time; productized age filters and escalation are post-MLP dashboard work.
- Listing/user action pages are narrow deep-link surfaces for direct ban/suspend without `reportId`; those direct actions leave any pending reports on the same target pending. The UI does not compute or warn with pending-report counts before direct ban/suspend in S7. Full listing/user admin indexes, search, and browsing are post-MLP dashboard work.
- Direct moderation action controls are hidden or disabled when the current target state makes the action impossible. The UI also hides/disables suspend/unsuspend for `role = admin` targets and for the current admin's own user id; if stale data still submits, it handles HTTP 403 `ADMIN_TARGET_NOT_MODERATABLE` / `SELF_MODERATION_NOT_ALLOWED` by refreshing and showing a policy error. The UI still handles HTTP 409 `MODERATION_TARGET_STATE_CONFLICT` by refreshing target state because another admin or owner action may have changed the target after page load.
- Reports against visible admin accounts may appear in the report queue. The admin UI keeps dismiss available, disables suspend/unsuspend, and does not try to resolve staff-abuse policy inside the report workflow.
- S7 has no admin demotion/deprovision UI and no moderation-based admin suspension. Mistaken or compromised admin access is handled through operator runbook/session revocation until post-MLP admin-account management is shaped.
- Unban/unsuspend discovery in S7 comes from known target id, report-detail links, or audit-log target links. Do not add "banned listings" or "suspended users" queues until the full dashboard filter work is shaped.
- Audit list uses `OffsetPagination`, defaults newest first with deterministic ties (`createdAt DESC, id DESC`), and exposes only `action`, `targetType`, and `targetId` filters in S7. Dismiss-report audit rows filter as `targetType = content_report`; ban/suspend rows filter by the moderated listing/user target. Row fields are `id`, `createdAt`, `action`, `actorSummary`, `targetType`, `targetId`, short target label, and optionally a one-line escaped plain-text reason preview; full `details` JSON is shown only in row expansion or side-panel detail if needed. Deleted/null actors render as "Deleted admin" for ordinary admin actions and "Operator script" for `ADMIN_BOOTSTRAP_PROMOTE`. Missing targets render as "Unavailable target" without breaking the audit list. Invalid audit filters or pagination reset to the default audit view after `VALIDATION_FAILED`. CSV export, retention controls, actor/date-range filter UI, full-text search, and polished before/after diff are post-MLP.
- Admin UI treats API datetime fields as ISO strings from contracts and formats them locally for display. It does not depend on locale-formatted strings from the API.
- Moderation action forms collect one required internal plain-text reason, trimmed before validation/storage, non-empty after trim, capped at 1000 chars after trim, and rendered back to admins as escaped plain text with line breaks preserved. S7 has no admin-reason preset picker, templates, or classifier, and admin reasons are not exposed to reporters, listing owners, suspended users, or public users.
- Admin mutation server actions expect HTTP 200 JSON responses, not `204`. On success, they refresh the current report detail/list or action page from returned target/report state and `auditLogId`; they do not locally rebalance paginated report pages. On conflict or validation failure, they discard optimistic UI state and refresh the report detail or action page. S7 has no idempotency-key UX for double submits.
- Moderation confirmation modals use static action-specific impact copy, not computed aggregate counts: listing ban hides this listing and blocks new contact/messages while keeping existing conversations readable; user suspend blocks future marketplace mutations without auto-banning listings or closing conversations.
- Catalog admin UI is not part of S7. Existing catalog admin APIs are protected by the hardened `AdminGuard`; beta-critical corrections use API/operator tooling unless S8 explicitly shapes a small correction UI.

## Notable decisions

- [ADR-0002](../../docs/adr/0002-stack.md) — Next.js + shadcn/ui
- [ADR-0006](../../docs/adr/0006-auth.md) — Admin OTP + TOTP 2FA
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
- [ADR-0027](../../docs/adr/0027-mlp-beta-scope.md) — Minimal admin first; full dashboard post-MLP
