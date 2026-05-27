# 30 — Identity

## Summary

Phone-OTP based authentication and basic user profiles. The MLP beta uses identity for "who is this person and what can they do?" Dealership memberships and Garage remain target capabilities, but are post-MLP bets per [ADR-0027](../../adr/0027-mlp-beta-scope.md).

## Why it exists

Every gated action (contact seller, sell, later favorite/save search) needs identity. Anonymous browsing is the default; auth is triggered on action with deferred-action replay. TM users are phone-rooted (most don't use email reliably), so phone OTP is the only viable login path. Admin UI exposure requires TOTP on top of OTP per ADR-0006 / ADR-0012.

## What it does (user-visible behavior)

### Sign in flow

1. User taps a gated action (e.g., ♥ on a listing)
2. Bottom sheet uses action-specific copy, for example "Sign in to save listings", plus "Continue with phone"
3. Full-screen auth route `(auth)/phone`: user enters phone number (+993 prefix locked; mobile prefix validated)
4. Phone entry shows implicit legal agreement copy with Terms and Privacy links; no checkbox in S2
5. Backend issues 6-digit OTP, dispatches via SMS gateway
6. Full-screen auth route `(auth)/otp`: 6 visual pin cells backed by one actual input, paste/SMS autofill support, auto-submit on 6th digit
7. Resend after 60s timer
8. On success: JWT issued, user returned to the original action they tapped; if no deferred action exists, route to the tab app

### Admin TOTP enrollment

1. After OTP success, if user has `role='admin'`, the API creates a normal non-elevated Session and returns tokens with `sid`.
2. Admin app calls `GET /api/v1/auth/admin/totp/status` server-side to decide whether enrollment or code entry is needed. The response contains only `enrolled`, `elevated`, and `adminTotpExpiresAt?`; it never returns secret material, QR material, backup codes, or backup-code counts.
3. If not enrolled, `POST /api/v1/auth/admin/totp/enroll` returns QR enrollment material (Google Authenticator-friendly URI) with issuer label `auto.tm Admin`. Verified enrollment cannot be repeated in S7 (`TOTP_ALREADY_ENROLLED`); pending unverified enrollment can be replaced so a lost pre-verify QR does not block setup.
4. User scans, enters 6-digit TOTP code.
5. `POST /api/v1/auth/admin/totp/verify` verifies the code, completes enrollment, returns `adminTotpExpiresAt` plus 10 backup codes exactly once, and sets `Session.adminTotpExpiresAt`. TOTP verification accepts the current 30-second step plus one adjacent step for small clock skew.
6. Backup codes are shown in a screen-only panel with copy-to-clipboard; user must check "I saved them" before continuing. From now on, admin-only APIs require OTP + current TOTP elevation.
7. On later admin logins, the same verify endpoint accepts either a TOTP code or one backup code for elevation and returns `adminTotpExpiresAt` only, never backup codes again.

### Profile screens

- View own profile: avatar, name, phone (masked), tenure, listings count
- Edit profile: name, avatar upload, language preference, theme preference (system / light / dark)
- View other user: avatar, name, tenure, public listings
- Block user from a chat → recorded in `BlockedUser` table

Post-MLP profile additions: notification preferences, public Garage entries, blog posts, richer trust stats.

### Dealership (post-MLP bet)

- A user can apply to create a Dealership (form: name, city, logo upload, description, working hours)
- Admin reviews and verifies → sets `verifiedAt` → PRO badge appears
- Dealership owner can invite other users as members (role: `sales`)
- A dealership has a public showroom page (see Feature 38)

### Account deletion (App Store hard requirement)

Apple App Store policy requires every app with account creation to offer in-app account deletion. This is non-negotiable.

- Profile → Settings → "Delete my account" (with a warning screen)
- Confirmation step: re-enter phone number to confirm
- Soft-delete: `User.deletedAt` set; all listings → `archived`; conversations → closed system message; refresh tokens revoked
- 30-day grace period: user can recover by logging back in (clears `deletedAt`)
- After 30 days: hard-delete personally identifiable data; preserve listings, messages, moderation reports, and audit rows as "Deleted user" / historical attribution for audit trail
- API endpoint: `DELETE /api/v1/me`
- Admin can see deletion requests in the audit log; cannot reverse them after the 30-day window
- S8 deletion must preserve S7 moderation history: `ContentReport` rows survive reporter/reviewer deletion with nullable user references, no reporter/reviewer PII snapshots are stored on reports in the MLP, and reporter deletion or suspension does not invalidate existing reports.

MLP beta decision: keep the 30-day grace period. The S2 hard-delete endpoint is not the final legal/account-deletion behavior; S8 must align implementation and support docs with this section before private beta.

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Phone entry | Empty | Default — phone field focused, +993 prefix shown |
| Phone entry | Invalid format | Inline error: "Введите номер в формате +993 6X XXX XX XX" |
| Phone entry | Rate-limited | Error: "Too many attempts. Try again in 10 minutes." |
| OTP entry | Empty | Auto-focus on first pin |
| OTP entry | Wrong code | Shake animation + clear, "Wrong code, try again" |
| OTP entry | Expired | "Code expired. Request a new one." |
| OTP entry | Dev test mode | Non-production only: show "Dev code: 123456" if API returns `testCode` |
| OTP entry | Locked | Inline countdown / request-new-code state; no separate error route |
| Profile (own) | New user | Prompt to add avatar + name |
| Profile (own) | Suspended | Banner: "Your account is suspended. Contact support." Auth/session/account-deletion still work; marketplace mutations are blocked. |
| Profile (other) | Default | Show public info only |
| Profile (other) | Blocked | "You blocked this user. Unblock?" |

## Data references

- `apps/api/src/modules/identity/CONTEXT.md`
- Entities: `User`, `Session`, `OtpRequest`, `Dealership`, `DealershipMember`, `OwnedVehicle`, `BlockedUser`, `TotpEnrollment`

## Decisions

- [ADR-0006](../../adr/0006-auth.md) — Phone OTP + custom SMS gateway + TOTP for admins
- Mobile S2 auth routes are `(auth)/phone` and `(auth)/otp`. Historical `login` / `login/otp` route names are superseded for the mobile implementation.
- Legal agreement in S2 is implicit copy under the phone CTA: "By continuing, you agree to the Terms and Privacy Policy." Add a checkbox only if legal review requires explicit recorded acceptance. Legal pages remain canonical on web.
- OTP login does not ask for native notification permission. Notification prompts are tied to later user actions that need notifications.
- OTP SMS bodies must be formatted for iOS and Android autofill. The API/SMS gateway owns formatting; the phone-agent sends the body unchanged.
- `apps/api` remains bearer-token only for the MLP. Admin web cookies are owned by `apps/admin`; its server actions / route handlers forward bearer tokens to the API.
- Admin token cookies are HTTP-only, `Secure`, `SameSite=Lax`, `Path=/`, max-age aligned to token/session lifetimes, and use production names `__Host-auto_tm_admin_access` and `__Host-auto_tm_admin_refresh` with no `Domain` when admin runs on its own host. Local dev may drop the prefix only when `__Host-` constraints cannot be satisfied. Browser client code never receives admin tokens and does not call `apps/api` directly.
- Admin server actions / route handlers refresh once on API 401, rotate cookies on success, retry the original API call once, and clear cookies + redirect to login if refresh fails. Refresh preserves but never extends `adminTotpExpiresAt`.
- S7 does not add a separate CSRF-token system for admin auth because admin mutations stay behind same-site server actions / route handlers. Any browser-posted public route handler must validate `Origin` against the configured admin origin, with no `Referer` fallback.
- Admin logout attempts API logout server-side with the refresh token but clears both admin cookies locally even if API logout fails; logout-all attempts the bearer-protected API logout-all endpoint and clears local cookies even if revoke fails.
- Admin `returnTo` after TOTP re-verification accepts only relative internal admin paths; absolute URLs, protocol-relative URLs, and cross-host redirects are rejected. S7 has no multi-tab heartbeat; tabs discover expired TOTP on their next protected action/load.
- If OTP succeeds on the admin host for a non-admin user, `apps/admin` clears admin cookies and shows generic "Admin access required" copy without exposing normal-user account details.
- Admin OTP verification uses the normal Session path. TOTP enrollment/verification upgrades the same Session by setting `adminTotpExpiresAt`; no temporary challenge-token system ships in the MLP.
- Normal OTP/refresh response contracts stay unchanged. Admin TOTP status/enroll/verify use separate authenticated endpoints under `/api/v1/auth/admin/totp/*`.
- TOTP enrollment/verification routes are authenticated identity routes, not `AdminGuard` routes. They require `role = admin`, valid `sid`, and ownership of the current Session.
- First admin bootstrap uses the S7 operator path in `docs/prd/ops/86-admin-bootstrap-runbook.md` plus `packages/db/scripts/promote-admin.ts`. The script requires `--phone` and `--reason`, supports optional `--dry-run`, promotes an existing OTP-verified user by phone to `role = admin`, exits non-zero with no audit row if no user matches, and exits zero as a no-op if the user is already `admin`; it must not create users, create TOTP enrollment, set `adminTotpExpiresAt`, mint tokens, or bypass `AdminGuard`. Its audit row is `ADMIN_BOOTSTRAP_PROMOTE` with `actorId = null`, `targetType = "user"`, `targetId = promotedUserId`, required operator reason, and role before/after in details; no phone snapshot is stored.
- `role = admin` before TOTP verification is treated as a pending admin assignment, not usable admin access. Existing S2 OTP/Session/refresh behavior stays; S7 adds `sid`, `adminTotpExpiresAt`, and `TotpEnrollment`.
- `TotpEnrollment` stores the TOTP shared secret encrypted and recoverable with `TOTP_SECRET_ENCRYPTION_KEY`; TOTP verification needs the original secret, so it is not hashed.
- `TOTP_SECRET_ENCRYPTION_KEY` must be a 32-byte base64 value validated at API startup. Missing/invalid key fails startup; there is no silent fallback and no runtime key rotation in the MLP. Rotation is post-MLP operator work because existing `TotpEnrollment` rows must be decrypted and re-encrypted.
- Admin TOTP elevation is enforced at the `AdminGuard` boundary for every admin-only API. Access JWTs carry `sid`; `AdminGuard` loads the Session and requires `adminTotpExpiresAt > now`. A plain bearer token for a `role = admin` user is not enough to mutate admin surfaces.
- Expired TOTP elevation returns HTTP 403 from `AdminGuard`; the admin app sends the admin back to TOTP verification and preserves the intended destination.
- Admin TOTP elevation lasts 12 hours per session. Refresh-token rotation preserves the same Session id and existing `adminTotpExpiresAt`; it never extends admin elevation.
- `GET /auth/admin/totp/status` returns only `enrolled`, `elevated`, and `adminTotpExpiresAt?`. `POST /auth/admin/totp/enroll` returns only QR/enrollment material; verified enrollment returns `TOTP_ALREADY_ENROLLED`, while pending unverified enrollment may be replaced. `POST /auth/admin/totp/verify` completes enrollment, stores one-way hashed backup codes, returns `adminTotpExpiresAt` plus 10 backup codes exactly once, and elevates the current Session. After enrollment, the same verify endpoint accepts either a TOTP code or one backup code for elevation and returns `adminTotpExpiresAt` only; backup codes are not returned on later logins.
- TOTP/backup-code verification uses explicit attempt throttling in addition to the global API throttler: max 5 failed attempts per admin user/session per 10 minutes. Wrong TOTP and wrong backup code return the same generic failure; throttled attempts return the standard rate-limit error. Successful verification resets the failure counter.
- Backup-code consumption is atomic: mark a backup code used only after a successful match. Failed TOTP/backup-code attempts go to structured API security logs, not moderation `AuditLog`; no permanent lockout, account suspension, or self-service recovery ships in S7.
- TOTP enrollment QR / otpauth URI uses issuer label `auto.tm Admin`.
- Admin backup codes are displayed once after successful TOTP verification and handled through manual operator recovery if both TOTP device and backup codes are lost or backup codes are exhausted. No printable PDF, download flow, regeneration UI, self-service recovery, admin demotion/deprovision UI, or moderation-based admin suspension ships in the MLP.
- Future admin account management belongs jointly to Identity and Admin, not to the S7 report queue. Deprovision, role hierarchy, read-only support accounts, emergency lockout, and admin session review require a shaped post-MLP admin-account-management bet with explicit operator recovery and audit rules.
- S7 user suspension is simple current state on `User`: `identity/` owns `suspendedAt`, `suspendedById?`, and internal `suspensionReason?` behind `IdentityAdminPort.suspendUser` / `unsuspendUser`; `admin/` orchestrates report resolution and audit around that port. Suspend sets those fields from the normalized internal admin action reason, and unsuspend clears them. S7 suspension is not admin account management: `role = admin` targets and self-targets are rejected before mutation, report resolution, or audit. AuditLog carries full history. Suspended users may still log in, browse, log out, view the generic suspension state, and delete their account, but cannot create/edit/publish listings, contact/message sellers, submit reports, or perform other authenticated marketplace mutations. Blocked authenticated mutations return HTTP 403 `FORBIDDEN` with `details.reason = "USER_SUSPENDED"` and generic client copy. Pending reports do not block account deletion in S7; if a reported user is deleted before review, the report remains visible to admins with target unavailable and report-backed suspend is no longer actionable. Suspended users can still be report targets only while they remain reachable through a public surface; visible admin users can also be reported without public staff-role leakage, though report-backed suspend stays forbidden; missing, deleted, or hidden users return `NOT_FOUND`. User suspension does not auto-ban, hide, archive, or delete the user's listings; listing visibility remains governed by listing status/admin bans. Existing conversations remain readable, but new contact/messages are blocked when either participant is suspended. Successful state changes may emit internal `UserSuspended` / `UserUnsuspended` events after commit, but S7 ships no user-facing consumers, notifications, system messages, or worker jobs from those events. No suspension duration, automatic expiry, warning ladder, public admin-reason exposure, target lock, legal hold, admin suspension via moderation, or separate suspension-history table ships in the MLP.
- Account deletion keeps a 30-day grace period before PII purge. This is required for the MLP beta legal posture unless legal review explicitly supersedes it.

## Phase

**Phase 1 MLP beta for phone OTP and basic profile.** Dealership membership, Garage, notification preferences, and rich public profile surfaces are post-MLP bets.

## Out of scope

- Email-based password recovery (no passwords in MVP)
- Social login (Google / Apple)
- Biometric (Face ID / Touch ID) — could add in Phase 1.5 as a session-unlock convenience
- Device management UI for revoking a specific other device — multi-device sessions are allowed per ADR-0012
- Email verification
- OTP "Having trouble?" support/help link — revisit after real delivery data; S2 keeps the flow minimal
- Printable backup-code PDF / download, backup-code regeneration UI, and self-service admin recovery
- Admin deprovision, role hierarchy, read-only support accounts, and emergency admin lockout UI

## Open questions

- (none for MLP identity scope)
