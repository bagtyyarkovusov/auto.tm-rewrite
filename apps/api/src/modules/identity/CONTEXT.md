# identity — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in [`docs/prd/features/30-identity.md`](../../../../../docs/prd/features/30-identity.md) and the relevant sprint files under [`docs/prd/sprints/`](../../../../../docs/prd/sprints/).

## Purpose

User identity, authentication, sessions, dealerships, and personal garage. The single source of "who is this person and what are they allowed to do."

## Owns (entities + tables)

- `User` — id, phone (unique), displayName?, avatarUrl?, locale (default "ru"), role (`UserRole` enum: buyer | seller | moderator | admin; default buyer), createdAt, updatedAt
- `OtpRequest` — id, phone, codeHash, expiresAt, verifiedAt?, attempts, userId?, ip, createdAt, updatedAt
- `Session` — id, userId, refreshTokenHash (unique, bcrypt), deviceLabel?, userAgent?, expiresAt, createdAt, lastSeenAt. `onDelete: Cascade` on userId → User.id.
- `Dealership` — id, slug (unique), name, logoUrl?, cityId?, createdAt, updatedAt
- `DealershipMember` — id, dealershipId, userId (unique — at most one dealership per user), role (`DealershipMemberRole` enum: owner | sales), createdAt
- `OwnedVehicle` (Garage entry) — id, userId, dealershipId?, brand (String), model (String), year?, createdAt, updatedAt
- `BlockedUser` — id, blockerId, blockedId, createdAt; unique on `(blockerId, blockedId)`

## Invariants

- A `User` has exactly one phone (unique). Email is optional and not used for login.
- `User.role` values: `buyer` (default), `seller`, `moderator`, `admin`. Marketplace identity only — dealership membership role is separate (`DealershipMember.role`). Per ADR-0013.
- A `User` can belong to **at most one** `Dealership` (enforced via `@@unique([userId])` on `DealershipMember`).
- `Session.refreshTokenHash` is bcrypt-hashed; plaintext is never stored. Per ADR-0012.
- **Multi-device sessions** — up to 10 concurrent sessions per user. 11th login evicts oldest active session (application-level invariant, enforced in `VerifyOtp`). Per ADR-0012.
- Refresh rotates in-place on the same Session row: `refreshTokenHash` overwritten, `lastSeenAt` bumped, `expiresAt = lastSeenAt + 30 days` sliding. Per ADR-0012.
- `OtpRequest.codeHash` is SHA-256; plaintext never stored.
- `OtpRequest` expires after 5 minutes; max 5 attempts before invalidation (application-level).
- Rate limits: 5 OTP requests per phone per 24h; 10 per IP per hour. Exponential backoff: `60 × 2^N` seconds where N is the count of prior requests.
- `SMS_DRIVER=mock` (default) logs the OTP code; `SMS_DRIVER=gateway` sends via SMS gateway. `OTP_TEST_MODE=true` returns the plaintext code in the API response.
- `BlockedUser` is one-way (block by A on B). If both want, both must block.

## Ports exposed (consumed by other contexts)

```ts
interface IdentityCheckPort {
  isAdmin(userId): Promise<boolean>
  isInDealership(userId, dealershipId): Promise<boolean>
}
```

- `IdentityCheckPort` is implemented by `PrismaIdentityCheckAdapter` and exported from `IdentityModule` under DI token `IDENTITY_TOKENS.IdentityCheckPort`.
- `AdminGuard` (`apps/api/src/common/admin.guard.ts`) composes on top of `JwtAuthGuard` and uses `IdentityCheckPort.isAdmin` to gate controller methods to admin-role users only.

## Internal ports (within identity context)

```ts
ClockPort             // injectable clock for time-based tests
OtpRequestRepository  // persisted OTP request storage
OtpSenderPort         // abstracts SMS driver (mock / gateway)
PasswordHasherPort    // bcrypt hash + compare for refresh tokens
SessionRepository     // Session persistence (create, count, deleteExpired, deleteOldest)
UserRepository        // User persistence (findByPhone, create)
```

## Ports consumed (from other contexts)

- (none today — `SmsPort` is consumed indirectly via the in-context `OtpSenderPort` abstraction)

## Shipped use-cases

- `RequestOtp` — validates TM phone, enforces rate limits, generates + sends OTP code, stores hashed record. Exposed as `POST /api/v1/auth/otp/request` (public).
- `VerifyOtp` — validates OTP code against stored hash, creates or loads User, creates a multi-device Session with bcrypt-hashed refresh token, enforces 10-session cap with expired cleanup + FIFO eviction, issues JWT access token (15 min) and random refresh token (30-day sliding expiry). Emits `UserRegistered` on first login. Exposed as `POST /api/v1/auth/otp/verify` (public).
- `RefreshSession` — locates a session by bcrypt-scanning all session rows against the provided refresh token, validates expiry, rotates the refresh token hash in-place with optimistic locking (old-hash match via `updateMany`), bumps `lastSeenAt`, extends `expiresAt` to `now + 30 days`, and issues a fresh JWT access token. Rejects unknown, expired, and already-used tokens with 401. Exposed as `POST /api/v1/auth/refresh` (public).
- `Logout` — locates the session matching the supplied refresh token via bcrypt comparison and deletes that single session row. Returns 204 on success; throws 401 when no match. Idempotent. Exposed as `POST /api/v1/auth/logout` (public).
- `LogoutAll` — deletes every session for the authenticated user (identified by bearer JWT). Returns 204. Exposed as `POST /api/v1/auth/logout-all` (requires bearer auth).
- `GetMe` — returns the contract user shape (id, phone, displayName, role, avatarUrl, locale, createdAt) for the authenticated user. Throws 404 if the user row was deleted after JWT issuance. Exposed as `GET /api/v1/me` (requires bearer auth).
- `DeleteMe` — deletes the authenticated user's account and all per-user data via DB cascades. Returns 204. Cascading delete removes: sessions, owned vehicles, blocked-user relationships, dealership memberships, favorites, saved searches, FCM devices, notification history, notification preferences, conversation participants, buyer-side conversations, seller listings, and blog posts. `audit_log` records are preserved via `onDelete: SetNull` (actorId nullified). Exposed as `DELETE /api/v1/me` (requires bearer auth).
- `IsAdmin` (query) — thin wrapper over `IdentityCheckPort.isAdmin`. Used by `AdminGuard`.

### Account deletion scope

Deleting a user via `DELETE /api/v1/me` cascades to:
- `Session`, `OwnedVehicle`, `BlockedUser` (both directions), `DealershipMember`, `Favorite`, `SavedSearch`, `FcmDevice`, `NotificationHistory`, `NotificationPreference`, `ConversationParticipant`, `Conversation` (buyer-side), `Listing` (where user is seller), `BlogPost` (authored by user) — all `onDelete: Cascade`.

Preserved (not deleted):
- `AuditLog` — actorId set to NULL via `onDelete: SetNull`. Survives for legal/audit compliance.
- `Message.senderId` — no FK constraint; messages survive with a dangling senderId.
- `OtpRequest` — userId is nullable; records survive for rate-limit audit purposes.

### Session lookup detail

Refresh-token lookup scans all `Session` rows and bcrypt-compares the plaintext token against each `refreshTokenHash`. O(sessions) per refresh — acceptable at MVP scale.

### Refresh concurrency

`rotateRefreshToken` uses `updateMany` with `WHERE id = ? AND refreshTokenHash = ?`. If two concurrent refreshes locate the same session, only one matches — the second returns `count = 0` and throws "Token already used" (401). No row-level lock needed.

## Test layering

- **Domain** (no Prisma, pure TS): `OtpCode.spec.ts`, `Phone.spec.ts`, `OtpAttemptLedger.spec.ts`.
- **Application** (no HTTP, fakes for repos / clock / hasher): `RequestOtp.spec.ts`, `VerifyOtp.spec.ts`, `RefreshSession.spec.ts`, `Logout.spec.ts`, `LogoutAll.spec.ts`, `GetMe.spec.ts`, `DeleteMe.spec.ts`. All chaos scenarios live here.
- **Presentation** (e2e Supertest against running compose Postgres): `AuthController.e2e.spec.ts` covers happy-path OTP request + verify, phone rate-limit response shape, logout / logout-all / GET me / DELETE me.
- **Infrastructure layer** — Testcontainers tests for `PrismaOtpRequestRepository` and `PrismaSessionRepository` were planned for S2 but deferred. Rationale: thin pass-throughs over `prisma.<model>.{create, findUnique, update, deleteMany}` indirectly exercised by `AuthController.e2e.spec.ts`. Add if a future bug surfaces inside an adapter.

## Events emitted

- `UserRegistered` — first successful OTP verification creates a User. Emitted via `eventBus.emit("UserRegistered", ...)` in `VerifyOtp`.

## Events consumed

- (none today)

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are NOT in this CONTEXT.md as if they exist today. Authoritative spec for each lives in the named sprint file.

- **Post-MLP Garage** — `OwnedVehicle` gets `vin`, `mileage`, `nickname`, `status`, `photoUrl`, `isPublic`, `linkedListingId` columns (currently a thin schema with just brand/model/year strings). See `docs/prd/features/37-garage.md` and [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md).
- **S7 minimal admin auth hardening** —
  - `TotpEnrollment` entity plus minimal admin TOTP enrollment/verification ships with S7 because S7 exercises `User.role = admin`.
  - `TotpEnrollment` stores the TOTP shared secret encrypted and recoverable with `TOTP_SECRET_ENCRYPTION_KEY`; backup codes are stored one-way hashed.
  - `TOTP_SECRET_ENCRYPTION_KEY` is a required 32-byte base64 value validated at API startup. Missing/invalid key fails startup; S7 has no runtime key rotation. Key rotation is post-MLP operator work that decrypts and re-encrypts existing `TotpEnrollment` rows.
  - `User` gains `suspendedAt`, `suspendedById?`, and internal `suspensionReason?`. `identity/` owns these current-state fields behind `IdentityAdminPort.suspendUser` and `IdentityAdminPort.unsuspendUser`; `admin/` orchestrates report resolution and audit around that port instead of writing user rows directly. For S7 moderation writes, `IdentityAdminPort` must participate in the admin-owned transaction or expose a transaction-scoped adapter so user suspension state, report resolution, and audit write commit or roll back together; it must not open an independent write transaction for admin suspend/unsuspend. Suspend sets those fields from the normalized internal admin action reason; unsuspend clears them. S7 user suspension excludes admin account management: `role = admin` targets and self-targets are rejected by policy before mutation/report resolution/audit. Already-suspended suspend attempts and already-unsuspended unsuspend attempts fail as moderation state conflicts without audit rows or state changes. AuditLog owns full suspension history; no separate `UserSuspension` entity, duration, automatic expiry, warning ladder, or public admin-reason exposure in the MLP.
  - Suspended users can still authenticate, log out, browse public surfaces, view their generic suspension state, and delete their account. They cannot create/edit/publish listings, contact/message sellers, submit reports, or perform other authenticated marketplace mutations. Blocked authenticated mutations return HTTP 403 `FORBIDDEN` with `details.reason = "USER_SUSPENDED"` and generic client copy. User suspension does not auto-ban, hide, archive, or delete the user's listings; listing visibility remains governed by listing status/admin bans. Existing conversations remain readable, but new contact/messages are blocked when either participant is suspended. Pending reports do not block account deletion in S7; deleted reported users become target-unavailable in admin report detail and report-backed suspend is no longer actionable. S7 does not expose report metadata to reported users: no report count, reason/details, reporter identity, report status, or admin notes.
  - User report creation uses the public route shape `POST /api/v1/users/{id}/report`, but the controller/use-case belongs to `admin/`. `identity/` validates user report targets through read/check ports: the target must exist, not be deleted, and be reachable through a public surface. Suspended users can still be report targets only while visible/reachable. Visible `role = admin` users are reportable through the public route without leaking staff role; admin-target policy is enforced later only for suspend/unsuspend. `identity/` rejects attempts to report the reporter's own user id, and it does not store reports or emit report-created events.
  - Successful S7 suspension state changes may emit internal `UserSuspended` and `UserUnsuspended` events only after the outer moderation transaction commits. S7 ships no user-facing consumers, notifications, conversation system messages, or worker jobs for these events; enforcement uses synchronous `User.suspendedAt` checks.
  - Access JWTs gain a `sid` claim pointing at the current `Session` row.
  - `Session` gains `adminTotpExpiresAt`; successful admin TOTP verification sets a 12-hour elevation window on the current session.
  - Refresh-token rotation preserves the same `Session.id` and existing `adminTotpExpiresAt`; it must not extend admin TOTP elevation.
  - Admin OTP verification creates the normal non-elevated Session first. TOTP enrollment/verification upgrades that same Session by setting `adminTotpExpiresAt`; no separate temporary challenge-token system.
  - Normal OTP/refresh response contracts stay unchanged; admin TOTP state is exposed through `GET /api/v1/auth/admin/totp/status`, `POST /api/v1/auth/admin/totp/enroll`, and `POST /api/v1/auth/admin/totp/verify`.
  - `GET /api/v1/auth/admin/totp/status` returns only `enrolled`, `elevated`, and `adminTotpExpiresAt?`. It never returns secret material, QR material, backup codes, or backup-code counts.
  - `POST /api/v1/auth/admin/totp/enroll` returns only QR/enrollment material using TOTP issuer label `auto.tm Admin`. Verified enrollment returns HTTP 409 `CONFLICT` with `details.reason = "TOTP_ALREADY_ENROLLED"`; pending unverified enrollment may be replaced so a lost pre-verify QR does not block setup. `POST /api/v1/auth/admin/totp/verify` completes enrollment, hashes and stores backup codes, returns `adminTotpExpiresAt` plus the 10 plaintext backup codes exactly once, and sets `Session.adminTotpExpiresAt`. After enrollment, the same verify endpoint accepts either a TOTP code or one backup code for elevation and returns `adminTotpExpiresAt` only; backup codes are not returned again.
  - TOTP verification accepts the current 30-second step plus one adjacent step for small clock skew.
  - TOTP/backup-code verification has explicit attempt throttling on top of the global API throttler: max 5 failed attempts per admin user/session per 10 minutes. Wrong TOTP and wrong backup code return the same generic failure; throttled attempts return the standard rate-limit error. Successful verification resets the failure counter.
  - Backup-code consumption is atomic: a backup code is marked used only on successful match. Failed TOTP/backup-code attempts emit structured API security logs, not moderation `AuditLog` rows. S7 does not add permanent lockout, account suspension, or self-service recovery for failed admin TOTP attempts.
  - TOTP enrollment/verification routes are normal authenticated identity routes, not `AdminGuard` routes. They require `role = admin`, valid `sid`, and ownership of the current Session.
  - `apps/api` remains bearer-token only. `JwtAuthGuard` does not read cookies; `apps/admin` stores tokens in HTTP-only cookies and forwards `Authorization: Bearer <accessToken>` from server actions / route handlers. Production admin cookie names are `__Host-auto_tm_admin_access` and `__Host-auto_tm_admin_refresh` with no `Domain` when admin runs on its own host; local dev may use unprefixed `auto_tm_admin_access` / `auto_tm_admin_refresh` only when `__Host-` constraints cannot be satisfied. Browser components do not receive tokens or call `apps/api` directly.
  - Admin server actions / route handlers refresh once on API HTTP 401, rotate cookies on success, retry the original API request once, and clear cookies plus redirect to login if refresh fails. Refresh preserves but does not extend `adminTotpExpiresAt`. Logout/logout-all attempts the API revoke path but clears admin cookies locally even if revoke fails.
  - Admin TOTP return destinations are relative internal admin paths only. `apps/admin` rejects absolute URLs, protocol-relative URLs, and cross-host redirects. S7 adds no multi-tab heartbeat; tabs discover expired TOTP on the next protected route/action. Any browser-posted admin route handler validates `Origin` against the configured admin origin, with no `Referer` fallback.
  - If OTP succeeds on the admin host for a non-admin user, `apps/admin` clears admin cookies and shows generic "Admin access required" copy without exposing normal-user account details.
  - `AdminGuard` becomes the single admin policy boundary: authenticated user, `role = admin`, and current TOTP elevation.
  - `AdminGuard` loads the session from `sid` and requires `adminTotpExpiresAt > now` before any AdminGuard-protected route, including existing catalog admin writes under `/api/v1/admin/catalog/*`. Expired TOTP elevation returns HTTP 403; the admin app owns redirecting back to TOTP verification with the intended destination preserved.
  - First admin is provisioned through the S7 operator path: `docs/prd/ops/86-admin-bootstrap-runbook.md` plus `packages/db/scripts/promote-admin.ts`. The script requires `--phone` and `--reason`, supports optional `--dry-run`, promotes an existing OTP-verified user by phone to `role = admin`, writes `ADMIN_BOOTSTRAP_PROMOTE` with `actorId = null`, `targetType = "user"`, `targetId = promotedUserId`, required normalized `details.reason`, and `details.before.role` / `details.after.role`, and does not store phone snapshots in audit details. It does not create users, create TOTP enrollment, set `adminTotpExpiresAt`, mint tokens, or bypass `AdminGuard`. If the user is already `admin`, it exits zero as a no-op without another audit row; if no user matches the phone, it exits non-zero without an audit row. Direct SQL is break-glass only. `role = admin` before TOTP is only a pending admin assignment. No self-service role escalation, admin role hierarchy, staff management, admin deprovision UI, or admin suspension via moderation in the MLP; mistaken or compromised admin access is operator runbook/session revocation work until post-MLP admin-account management is shaped.
  - Existing S2/S3 identity/auth pieces are reused: OTP verify creates Session, refresh rotates on the same Session, and bearer JWTs remain the API boundary. S7 adds `sid`, `adminTotpExpiresAt`, and `TotpEnrollment`.
  - Admin recovery follows ADR-0006: backup codes are generated only after successful TOTP verification; lost phone plus lost or exhausted backup codes is handled by manual operator recovery, not a self-service MLP UI.
	- **S8 account-deletion legal alignment** — Current S2 `DeleteMe` hard-deletes the user through cascades. Before private beta, S8 must align implementation with Feature 30 / Legal: start a 30-day deletion grace period, revoke refresh sessions, archive user listings, allow recovery by login during the grace period, and define the day-30 PII purge path. S8 deletion must preserve moderation/audit history: `AuditLog.actorId` and S7 `ContentReport.reporterUserId` / `reviewedById` use nullable-after-delete semantics, with no denormalized reporter/reviewer PII snapshots in reports. Reporter deletion or suspension does not invalidate existing S7 reports.
	- **S8/private-beta signup kill switch** — `SIGNUPS_ENABLED=false` blocks OTP verification from creating a new `User` while preserving OTP login, refresh, logout, and admin login for existing users. Because S2 uses phone OTP rather than a separate signup endpoint, the check belongs at the "create user from verified OTP" branch inside `VerifyOtp`; existing users with a matching phone continue through the normal session path. Disabled signup attempts return HTTP 403 `FORBIDDEN` with `details.reason = "FEATURE_DISABLED"` and generic client copy; the API does not expose internal flag names.
	- **Post-MLP admin/dealership hardening** —
  - `Dealership.verifiedAt` column for the dealership-verification flow used by listings + admin UI is post-MLP with showroom/dealer work.
  - `IdentityReadPort` interface (`getUserSummary`, `getDealershipSummary`, `isUserBlockedBy`) for other contexts (admin app, listings, conversations) to fetch user/dealership summaries without owning the data.
  - `DealershipVerified` is post-MLP with dealership verification.

## Notable decisions

- [ADR-0006](../../../../../docs/adr/0006-auth.md) — Phone OTP + TOTP for admins (refresh subsection superseded by ADR-0012).
- [ADR-0012](../../../../../docs/adr/0012-multi-device-sessions.md) — Multi-device sessions, per-session refresh tokens (bcrypt), 10-session cap, sliding 30-day expiry.
- [ADR-0013](../../../../../docs/adr/0013-user-role-split.md) — `User.role` split from `DealershipMember.role`.
- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Bounded context architecture.
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state.
- [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) — Garage and dealership work deferred out of MLP beta.
