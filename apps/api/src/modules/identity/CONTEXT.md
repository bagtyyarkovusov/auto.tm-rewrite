# identity — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in [`docs/prd/features/30-identity.md`](../../../../../docs/prd/features/30-identity.md) and the relevant sprint files under [`docs/prd/sprints/`](../../../../../docs/prd/sprints/).

## Purpose

User identity, authentication, sessions, dealerships, and personal garage. The single source of "who is this person and what are they allowed to do."

## Owns (entities + tables)

- `User` — id, phone (unique), displayName?, avatarUrl?, locale (default "ru"), role (`UserRole` enum: buyer | seller | moderator | admin; default buyer), createdAt, updatedAt, suspendedAt?, suspendedById?, suspensionReason?, deletionScheduledAt?
- `OtpRequest` — id, phone, codeHash, expiresAt, verifiedAt?, attempts, userId?, ip, createdAt, updatedAt
- `Session` — id, userId, refreshTokenHash (unique, bcrypt), deviceLabel?, userAgent?, expiresAt, createdAt, lastSeenAt, adminTotpExpiresAt?. `onDelete: Cascade` on userId → User.id.
- `TotpEnrollment` — id, userId (unique), encryptedSecret (AES-256-GCM), verifiedAt?, createdAt, updatedAt. `onDelete: Cascade` on userId → User.id.
- `TotpBackupCode` — id, totpEnrollmentId, codeHash (SHA-256), usedAt?. `onDelete: Cascade` on totpEnrollmentId → TotpEnrollment.id.
- `Dealership` — id, slug (unique), name, logoUrl?, cityId?, createdAt, updatedAt
- `DealershipMember` — id, dealershipId, userId (unique — at most one dealership per user), role (`DealershipMemberRole` enum: owner | sales), createdAt
- `OwnedVehicle` (Garage entry) — id, userId, dealershipId?, brand (String), model (String), year?, createdAt, updatedAt
- `BlockedUser` — id, blockerId, blockedId, createdAt; unique on `(blockerId, blockedId)`. One-way relationship: a block by A on B does not imply a block by B on A.

## Invariants

- A `User` has exactly one phone (unique). Email is optional and not used for login.
- `User.role` values: `buyer` (default), `seller`, `moderator`, `admin`. Marketplace identity only — dealership membership role is separate (`DealershipMember.role`). Per ADR-0013.
- A `User` can belong to **at most one** `Dealership` (enforced via `@@unique([userId])` on `DealershipMember`).
- `Session.refreshTokenHash` is bcrypt-hashed; plaintext is never stored. Per ADR-0012.
- **Multi-device sessions** — up to 10 concurrent sessions per user. 11th login evicts oldest active session (application-level invariant, enforced in `VerifyOtp`). Per ADR-0012.
- Refresh rotates in-place on the same Session row: `refreshTokenHash` overwritten, `lastSeenAt` bumped, `expiresAt = lastSeenAt + 30 days` sliding. Per ADR-0012.
- **Admin TOTP elevation** — `Session.adminTotpExpiresAt` stores a 12-hour elevation window created by successful admin TOTP verification. Refresh preserves but does not extend `adminTotpExpiresAt`. Per ADR-0006.
- **TOTP secret encryption** — `TotpEnrollment.encryptedSecret` is encrypted with AES-256-GCM via `TOTP_SECRET_ENCRYPTION_KEY` (32-byte base64). Backup codes are stored one-way hashed with SHA-256, separately. Per ADR-0006.
- **TOTP verification** — accepts the current 30-second step plus one adjacent step for small clock skew (`epochTolerance = period`). Backup codes are 16-character hex strings; 10 generated exactly once on first successful enrollment verify. First enrollment completion (mark verified + backup-code insert + session elevation) is one Prisma transaction. Backup-code consumption and session elevation are also one transaction, with atomic `usedAt: null` consumption. Post-enrollment verify accepts either a TOTP code or one unused backup code.
- **TOTP throttling** — max 5 failed TOTP/backup-code attempts per admin user/session per 10 minutes. Wrong TOTP and wrong backup code return the same generic failure. Throttled attempts return rate-limit error. Successful verification resets the counter.
- `OtpRequest.codeHash` is SHA-256; plaintext never stored.
- `OtpRequest` expires after 5 minutes; max 5 attempts before invalidation (application-level).
- Rate limits: 5 OTP requests per phone per 24h; 10 per IP per hour. Exponential backoff: `60 × 2^N` seconds where N is the count of prior requests.
- `SMS_DRIVER=mock` (default) logs the OTP code; `SMS_DRIVER=gateway` sends via SMS gateway. `OTP_TEST_MODE=true` returns the plaintext code in the API response.
- `BlockedUser` is one-way (block by A on B). If both want, both must block. Self-blocking is rejected at the application layer (`BlockUser`) and the domain entity (`BlockedUser`).
- **S7 user suspension enforcement** — `User.suspendedAt` blocks authenticated marketplace mutations across `listings/` (create/edit/publish/media/state), `conversations/` (new contact/send when either participant is suspended), and `admin/` (report creation). Suspended users may still authenticate, log out, browse public surfaces, view their generic suspension state, and delete their account. Enforcement is synchronous via `IdentityCheckPort.isSuspended` (no event side effects). `IdentityAdminPort` owns the suspension field writes and participates in the caller's transaction for S7 admin moderation.

## Ports exposed (consumed by other contexts)

```ts
interface IdentityCheckPort {
  isAdmin(userId): Promise<boolean>
  isInDealership(userId, dealershipId): Promise<boolean>
  isSuspended(userId): Promise<boolean>
}
```

- `IdentityCheckPort` is implemented by `PrismaIdentityCheckAdapter` and exported from `IdentityModule` under DI token `IDENTITY_TOKENS.IdentityCheckPort`.
- `IdentityReadPort` (`IDENTITY_READ_PORT`) is implemented by `PrismaIdentityReadAdapter` and exported from `IdentityModule`. It exposes `findUserById`, `findUsersByIds`, and `isUserBlockedBy(blockerId, blockedId)`; user summaries include the stored `locale` so cross-context user-directed copy can be localized. `isUserBlockedBy` is consumed by `conversations/` (S10) to enforce block checks before new contact or message sends, while `notifications/` `EvaluateDirectMessagePush` reads the recipient locale for direct-message push copy as part of eligibility.
- `IdentityAdminPort` (`IDENTITY_ADMIN_PORT`) is implemented by `PrismaIdentityAdminRepository` and exported from `IdentityModule`. It exposes `suspendUser(userId, adminUserId, reason, tx?)`, `unsuspendUser(userId, tx?)`, and `isSuspended(userId)`. `suspendUser` and `unsuspendUser` participate in the caller's transaction (transaction-scoped) for S7 admin moderation; `isSuspended` is a standalone read.
- `AdminGuard` (`apps/api/src/common/admin.guard.ts`) composes on top of `JwtAuthGuard` and requires: authenticated user, `role = admin`, `sid` owned by the JWT subject, an unexpired session row (`expiresAt > now`), and current TOTP elevation (`adminTotpExpiresAt > now`) loaded via that session.

## Internal ports (within identity context)

```ts
ClockPort                  // injectable clock for time-based tests
OtpRequestRepository       // persisted OTP request storage
OtpSenderPort              // abstracts SMS driver (mock / gateway)
PasswordHasherPort         // bcrypt hash + compare for refresh tokens
SessionRepository          // Session persistence (create, count, deleteExpired, deleteOldest, findById, updateAdminTotpExpiresAt)
UserRepository             // User persistence (findByPhone, create)
TotpSecretCipherPort       // AES-256-GCM encrypt/decrypt for TOTP secrets
TotpVerifierPort           // TOTP secret generation, otpauth URI generation, code verification with skew
TotpEnrollmentRepository   // TotpEnrollment persistence (findByUserId, createPending, markVerified, addBackupCodes, findBackupCodes, consumeBackupCode, completeFirstVerification transaction, consumeBackupCodeAndElevate transaction, deleteByUserId)
TotpThrottlePort           // failed-attempt counting per user/session with window expiry
SecurityLoggerPort         // structured security logging for TOTP failures
BlockedUserRepository      // one-way block/unblock persistence and check
```

## Ports consumed (from other contexts)

- (none today — `SmsPort` is consumed indirectly via the in-context `OtpSenderPort` abstraction)

## Shipped use-cases

- `RequestOtp` — validates TM phone, enforces rate limits, generates + sends OTP code, stores hashed record. Exposed as `POST /api/v1/auth/otp/request` (public).
- `VerifyOtp` — validates OTP code against stored hash, creates or loads User, creates a multi-device Session with bcrypt-hashed refresh token, enforces 10-session cap with expired cleanup + FIFO eviction, issues JWT access token (15 min, includes `sid` = Session.id) and random refresh token (30-day sliding expiry). Emits `UserRegistered` on first login. If the existing user is in a deletion grace period (`deletionScheduledAt` set), auto-recovers the account via `RecoverAccount` before continuing. Respects `SIGNUPS_ENABLED=false` by blocking new-user creation with `FEATURE_DISABLED` while preserving existing-user login and recovery. Exposed as `POST /api/v1/auth/otp/verify` (public).
- `RefreshSession` — locates a session by bcrypt-scanning all session rows against the provided refresh token, validates expiry, rotates the refresh token hash in-place with optimistic locking (old-hash match via `updateMany`), bumps `lastSeenAt`, extends `expiresAt` to `now + 30 days`, preserves existing `adminTotpExpiresAt` without extending it, and issues a fresh JWT access token (includes `sid`). Rejects unknown, expired, and already-used tokens with 401. Exposed as `POST /api/v1/auth/refresh` (public).
- `Logout` — locates the session matching the supplied refresh token via bcrypt comparison and deletes that single session row. Returns 204 on success; throws 401 when no match. Idempotent. Exposed as `POST /api/v1/auth/logout` (public).
- `LogoutAll` — deletes every session for the authenticated user (identified by bearer JWT). Returns 204. Exposed as `POST /api/v1/auth/logout-all` (requires bearer auth).
- `GetMe` — returns the contract user shape (id, phone, displayName, role, avatarUrl, locale, createdAt, deletionScheduledAt) for the authenticated user. Throws 404 if the user row was deleted after JWT issuance. Exposed as `GET /api/v1/me` (requires bearer auth).
- `DeleteMe` — starts a 30-day deletion grace period: sets `User.deletionScheduledAt = now + 30d`, revokes all sessions, and archives active listings tagged `archivedByDeletion`. Returns 204. Does NOT delete the User row. Exposed as `DELETE /api/v1/me` (requires bearer auth).
- `RecoverAccount` — clears `User.deletionScheduledAt` and republishes `archivedByDeletion` listings to active status. Invoked automatically by `VerifyOtp` when an existing user in grace period logs in. Survives `SIGNUPS_ENABLED=false`.
- `IsAdmin` (query) — thin wrapper over `IdentityCheckPort.isAdmin`. Used by `AdminGuard`.
- `GetAdminTotpStatus` — returns `enrolled`, `elevated`, and optional `adminTotpExpiresAt` for the current admin session. No secret/backup material. Exposed as `GET /api/v1/auth/admin/totp/status` (requires bearer auth + `role = admin` + valid `sid` + session ownership; not behind `AdminGuard`).
- `EnrollAdminTotp` — generates a new TOTP secret, encrypts it, creates a pending `TotpEnrollment`, and returns QR URI + plaintext secret. Verified re-enroll returns HTTP 409 `TOTP_ALREADY_ENROLLED`; pending unverified enrollment is idempotent and returns the same encrypted secret/QR across calls and sessions for the same user so a scanned authenticator entry remains usable until first verification. The plaintext secret is decrypted server-side for this response (and again for verification); the tradeoff is recorded in ADR-0038. Concurrent `enroll` calls race on `TotpEnrollment.userId @@unique`; the loser returns the existing pending row instead of throwing. Exposed as `POST /api/v1/auth/admin/totp/enroll` (requires bearer auth + `role = admin` + valid `sid` + session ownership; not behind `AdminGuard`).
- `VerifyAdminTotp` — verifies a TOTP code (first enrollment) or TOTP code/backup code (post-enrollment). On first success, marks enrollment verified, generates 10 backup codes (SHA-256 hashed, stored), sets `Session.adminTotpExpiresAt = now + 12h`, and returns `adminTotpExpiresAt` + plaintext backup codes exactly once; first-enrollment persistence is atomic so a partial backup-code/enrollment failure cannot leave an elevated unverified session. Post-enrollment returns `adminTotpExpiresAt` only. Implements 5-failure/10-min throttle, adjacent-step skew, atomic backup-code consumption + elevation, and structured security logging on failure. Exposed as `POST /api/v1/auth/admin/totp/verify` (requires bearer auth + `role = admin` + valid `sid` + session ownership; not behind `AdminGuard`).
- `BlockUser` — creates or confirms a one-way `BlockedUser` relationship from the authenticated user to the target user. Rejects self-blocking with `FORBIDDEN`. Idempotent. Exposed as `POST /api/v1/me/blocked-users` (requires bearer auth).
- `UnblockUser` — removes the one-way `BlockedUser` relationship from the authenticated user to the target user. Idempotent no-op when no relationship exists. Exposed as `DELETE /api/v1/me/blocked-users/:userId` (requires bearer auth).
- `IsBlocked` — returns `{ blocked: boolean }` indicating whether the authenticated user has blocked the target user. Exposed as `GET /api/v1/me/blocked-users/:userId` (requires bearer auth).

### Account deletion scope (S8 — 30-day grace + tombstone purge)

`DELETE /api/v1/me` starts a **30-day grace period** rather than hard-deleting:
1. Sets `User.deletionScheduledAt = now + 30d`.
2. Revokes all sessions (`sessionRepo.deleteAllByUserId`).
3. Archives active listings tagged `archivedByDeletion = true` via `AccountDeletionListingsPort`.

**Recovery during grace** — OTP login while `deletionScheduledAt` is set auto-invokes `RecoverAccount`, which:
- Clears `deletionScheduledAt`.
- Republishes `archivedByDeletion` listings to `active`.
- Proceeds with normal session creation.
- Unaffected by `SIGNUPS_ENABLED=false`.

**Day-30 purge** (`apps/worker` BullMQ repeatable job) — finds `deletionScheduledAt <= now` and:
- **Tombstones PII**: `phone → deleted:<id>`, `displayName → null`, `avatarUrl → null`, clears `deletionScheduledAt`.
- **Prunes private rows**: `Session`, `TotpEnrollment` (+ backup codes), `FcmDevice`, `NotificationHistory`, `NotificationPreference`, `SavedSearch`, `Favorite`, `OwnedVehicle`, `BlockedUser` (both directions), `DealershipMember`, `ListingDraft`.
- **Retains content**: `Listing` (left archived), `Conversation` + `Message`, `ContentReport` actor references (`reporterUserId` / `reviewedById` nullable via `SetNull`), `AuditLog` (`actorId` nullable via `SetNull`).

The existing `onDelete: Cascade` relations remain as a safety net for a future admin true-erasure path; they do not fire during normal user-initiated deletion because the User row is never deleted.

### Session lookup detail

Refresh-token lookup scans all `Session` rows and bcrypt-compares the plaintext token against each `refreshTokenHash`. O(sessions) per refresh — acceptable at MVP scale.

### Refresh concurrency

`rotateRefreshToken` uses `updateMany` with `WHERE id = ? AND refreshTokenHash = ?`. If two concurrent refreshes locate the same session, only one matches — the second returns `count = 0` and throws "Token already used" (401). No row-level lock needed.

## Test layering

- **Domain** (no Prisma, pure TS): `OtpCode.spec.ts`, `Phone.spec.ts`, `OtpAttemptLedger.spec.ts`.
- **Application** (no HTTP, fakes for repos / clock / hasher): `RequestOtp.spec.ts`, `VerifyOtp.spec.ts`, `RefreshSession.spec.ts`, `Logout.spec.ts`, `LogoutAll.spec.ts`, `GetMe.spec.ts`, `DeleteMe.spec.ts`, `RecoverAccount.spec.ts`, `GetAdminTotpStatus.spec.ts`, `EnrollAdminTotp.spec.ts`, `VerifyAdminTotp.spec.ts`. All chaos scenarios live here.
- **Presentation** (e2e Supertest against running compose Postgres): `AuthController.e2e.spec.ts` covers happy-path OTP request + verify, phone rate-limit response shape, logout / logout-all / GET me / DELETE me (grace period), signup kill switch, and account recovery during grace. `AdminAuthController.e2e.spec.ts` covers admin TOTP pending-enrollment idempotency and later-session verification with the same enrolled authenticator secret.
- **Infrastructure layer** — `AesGcmTotpSecretCipher.spec.ts`, `OtplibTotpVerifier.spec.ts`, `InMemoryTotpThrottleAdapter.spec.ts`. Testcontainers tests for `PrismaOtpRequestRepository` and `PrismaSessionRepository` were planned for S2 but deferred. Rationale: thin pass-throughs over `prisma.<model>.{create, findUnique, update, deleteMany}` indirectly exercised by `AuthController.e2e.spec.ts`. Add if a future bug surfaces inside an adapter.

## Events emitted

- `UserRegistered` — first successful OTP verification creates a User. Emitted via `eventBus.emit("UserRegistered", ...)` in `VerifyOtp`.

## Events consumed

- (none today)

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are NOT in this CONTEXT.md as if they exist today. Authoritative spec for each lives in the named sprint file.

- **Post-MLP Garage** — `OwnedVehicle` gets `vin`, `mileage`, `nickname`, `status`, `photoUrl`, `isPublic`, `linkedListingId` columns (currently a thin schema with just brand/model/year strings). See `docs/prd/features/37-garage.md` and [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md).
- **Post-MLP admin/dealership hardening** —
  - `Dealership.verifiedAt` column for the dealership-verification flow used by listings + admin UI is post-MLP with showroom/dealer work.
  - `DealershipVerified` is post-MLP with dealership verification.

## Notable decisions

- [ADR-0006](../../../../../docs/adr/0006-auth.md) — Phone OTP + TOTP for admins (refresh subsection superseded by ADR-0012).
- [ADR-0012](../../../../../docs/adr/0012-multi-device-sessions.md) — Multi-device sessions, per-session refresh tokens (bcrypt), 10-session cap, sliding 30-day expiry.
- [ADR-0013](../../../../../docs/adr/0013-user-role-split.md) — `User.role` split from `DealershipMember.role`.
- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Bounded context architecture.
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state.
- [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) — Garage and dealership work deferred out of MLP beta.
