# identity — CONTEXT

## Purpose

User identity, authentication, sessions, dealerships, and personal garage. The single source of "who is this person and what are they allowed to do."

## Owns (entities + tables)

- `User` — id, phone, displayName?, avatarUrl?, locale, role (`buyer` | `seller` | `moderator` | `admin`), createdAt, updatedAt
- `Dealership` — id, slug, name, logoUrl?, cityId?, createdAt, updatedAt
- `DealershipMember` — id, dealershipId, userId (unique — at most one dealership per user), role (`owner` | `sales`), createdAt
- `OtpRequest` — id, phone, codeHash, expiresAt, verifiedAt?, attempts, userId?, ip, createdAt, updatedAt
- `Session` — id, userId, refreshTokenHash (unique, bcrypt), deviceLabel?, userAgent?, expiresAt, createdAt, lastSeenAt. `onDelete: Cascade` on userId → User.id.
- `OwnedVehicle` (Garage) — id, userId, dealershipId?, brand (String), model (String), year?, createdAt, updatedAt. Thin schema — full garage fields (vin, mileage, nickname, status, photoUrl, isPublic, linkedListingId) ship in S6.
- `BlockedUser` — id, blockerId, blockedId, createdAt
- `TotpEnrollment` — **not in schema yet.** Admin TOTP ships in S9 per ADR-0012 deferral. The ADR-0006 invariant "admin role cannot be granted without TOTP" is preserved as policy — first admin grant must happen on or after S9.

## Invariants

- A `User` has exactly one phone (unique). Email is optional and not used for login.
- `User.role` values: `buyer` (default), `seller`, `moderator`, `admin`. Marketplace identity only — dealership membership role is separate (see `DealershipMember.role`). Per ADR-0013.
- A `User` can belong to **at most one** `Dealership` (enforced via `@@unique([userId])` on `DealershipMember`).
- A `Dealership` must have at least one `DealershipMember` with role `owner` (application-level invariant).
- `Session.refreshTokenHash` is bcrypt-hashed; plaintext is never stored. Per ADR-0012.
- **Multi-device sessions** — up to 10 concurrent sessions per user. 11th login evicts oldest active session. Per ADR-0012.
- Refresh rotates in-place on the same Session row: `refreshTokenHash` overwritten, `lastSeenAt` bumped, `expiresAt` = `lastSeenAt + 30 days` sliding. Per ADR-0012.
- `OtpRequest.codeHash` is SHA-256; plaintext never stored.
- `OtpRequest` expires after 5 minutes (TTL = createdAt + 5 min); max 5 attempts before invalidation.
- Rate limits: 5 OTP requests per phone per 24h; 10 per IP per hour. Exponential backoff: `60 × 2^N` seconds where N is the count of prior requests.
- `OtpRequest.ip` captures the requester IP for rate-limit enforcement.
- `SMS_DRIVER=mock` (default) logs the OTP code; `SMS_DRIVER=gateway` sends via SMS gateway. `OTP_TEST_MODE=true` returns the plaintext code in the API response.
- A user CAN be blocked, in which case all writes (POST/PATCH) fail with 403.
- A `BlockedUser` relationship is one-way (block by A on B). If both want, both must block.
- `User.role = 'admin'` MUST have a `TotpEnrollment` (policy — enforced at admin-grant time in S9).

## Ports exposed (consumed by other contexts)

```ts
interface IdentityReadPort {
  getUserSummary(userId): Promise<{ id, name, avatarUrl, dealershipId? } | null>
  getDealershipSummary(dealershipId): Promise<{ id, name, slug, city, verifiedAt? } | null>
  isUserBlockedBy(userId, possibleBlockerId): Promise<boolean>
}

interface IdentityCheckPort {
  isAdmin(userId): Promise<boolean>
  isInDealership(userId, dealershipId): Promise<boolean>
}
```

- `IdentityCheckPort` is implemented by `PrismaIdentityCheckAdapter` and exported from `IdentityModule` under DI token `IDENTITY_TOKENS.IdentityCheckPort`.
- `AdminGuard` (`apps/api/src/common/admin.guard.ts`) composes on top of `JwtAuthGuard` and uses `IdentityCheckPort.isAdmin` to gate controller methods to admin-role users only.

## Ports consumed

```ts
SmsPort       // from apps/sms-gateway — sends OTPs (wired via OtpSenderPort)
MailPort      // for admin password reset (future)
```

## Internal ports (within identity context)

```ts
OtpRequestRepository  // persisted OTP request storage
OtpSenderPort         // abstracts SMS driver (mock / gateway)
ClockPort             // injectable clock for time-based tests
UserRepository        // User persistence (findByPhone, create)
SessionRepository     // Session persistence (create, count, deleteExpired, deleteOldest)
PasswordHasherPort    // bcrypt hash + compare for refresh tokens
```

## Shipped use-cases

- `RequestOtp` — validates TM phone, enforces rate limits, generates + sends OTP code, stores hashed record. Exposed as `POST /api/v1/auth/otp/request` (public).
- `VerifyOtp` — validates OTP code against stored hash, creates or loads User, creates a multi-device Session with bcrypt-hashed refresh token, enforces 10-session cap with expired cleanup + FIFO eviction, issues JWT access token (15 min) and random refresh token (30-day sliding expiry). Emits `UserRegistered` on first login. Exposed as `POST /api/v1/auth/otp/verify` (public).
- `RefreshSession` — locates a session by bcrypt-scanning all session rows against the provided refresh token, validates expiry, rotates the refresh token hash in-place with optimistic locking (old-hash match via `updateMany`), bumps `lastSeenAt` and extends `expiresAt` to `now + 30 days`, and issues a fresh JWT access token. Rejects unknown, expired, and already-used tokens with 401. Exposed as `POST /api/v1/auth/refresh` (public).
- `Logout` — locates the session matching the supplied refresh token via bcrypt comparison, deletes that single session row. Returns 204 on success; throws "Invalid refresh token" (mapped to 401) when no match is found. Idempotent — second call with the same token returns 401. Exposed as `POST /api/v1/auth/logout` (public).
- `LogoutAll` — deletes every session for the authenticated user (identified by bearer JWT). No-op when the user has no sessions. Returns 204. Exposed as `POST /api/v1/auth/logout-all` (requires bearer auth).
- `GetMe` — returns the contract user shape (id, phone, displayName, role, avatarUrl, locale, createdAt) for the authenticated user. Throws "User not found" (mapped to 404) if the user row was deleted after JWT issuance. Exposed as `GET /api/v1/me` (requires bearer auth).
- `DeleteMe` — deletes the authenticated user's account and all per-user data via DB cascades. Requires bearer auth. Returns 204. Cascading delete removes: sessions, owned vehicles, blocked-user relationships, dealership memberships, favorites, saved searches, FCM devices, notification history, notification preferences, conversation participants, buyer-side conversations, seller listings, and blog posts. `audit_log` records are preserved via `onDelete: SetNull` (actorId is nullified). Exposed as `DELETE /api/v1/me` (requires bearer auth).
- `IsAdmin` (query) — thin wrapper over `IdentityCheckPort.isAdmin`. Used by `AdminGuard` and available to other contexts for admin-gating.

### Account deletion scope

Deleting a user via `DELETE /api/v1/me` cascades to:
- `Session` — all sessions for the user (onDelete: Cascade)
- `OwnedVehicle` — all garage entries (onDelete: Cascade)
- `BlockedUser` — both directions (blocker + blocked) (onDelete: Cascade)
- `DealershipMember` — dealership membership (onDelete: Cascade)
- `Favorite` — all favorited listings (onDelete: Cascade)
- `SavedSearch` — all saved searches (onDelete: Cascade)
- `FcmDevice` — all push device registrations (onDelete: Cascade)
- `NotificationHistory` — all notification records (onDelete: Cascade)
- `NotificationPreference` — user preferences (onDelete: Cascade)
- `ConversationParticipant` — participation records (onDelete: Cascade)
- `Conversation` (buyer-side) — conversations where user is buyer (onDelete: Cascade)
- `Listing` — all listings where user is seller (onDelete: Cascade)
- `BlogPost` — all blog posts authored by user (onDelete: Cascade)

Preserved (not deleted):
- `AuditLog` — actorId is set to NULL via onDelete: SetNull. Audit records survive account deletion for legal/audit compliance.
- `Message.senderId` — no FK constraint; messages survive with a dangling senderId.
- `Conversation` (seller-side) — conversations where the user is seller are deleted via the Listing cascade, not directly via the seller FK.
- `OtpRequest` — otp_requests.userId is nullable; OTP records survive for rate-limit audit purposes.

### Session lookup detail

Refresh-token lookup scans all `Session` rows and bcrypt-compares the plaintext token against each `refreshTokenHash`. This is O(sessions) per refresh — acceptable at MVP scale. A non-secret token selector (e.g., a SHA-256-hashed prefix stored in a separate `tokenSelector` column for O(1) lookup) can be added later if refresh latency becomes a concern. The selector would be non-secret because it is only a lookup key; the bcrypt-hashed validator remains the actual credential.

### Refresh concurrency

`rotateRefreshToken` uses `updateMany` with a `WHERE id = ? AND refreshTokenHash = ?` predicate. If two concurrent refreshes both locate the same session, only one `updateMany` matches the old hash — the second returns `count = 0` and the use-case throws `Token already used` (mapped to 401). No row-level lock or `version` column is needed.

## Test layering

- **Domain** (no Prisma, pure TS): `OtpCode.spec.ts`, `Phone.spec.ts`, `OtpAttemptLedger.spec.ts`.
- **Application** (no HTTP, fakes for repos / clock / hasher): `RequestOtp.spec.ts`, `VerifyOtp.spec.ts`, `RefreshSession.spec.ts`, `Logout.spec.ts`, `LogoutAll.spec.ts`, `GetMe.spec.ts`, `DeleteMe.spec.ts`. All chaos scenarios live here: code expiry (`VerifyOtp.spec.ts` — "fails with expired code"), code reuse, six-wrong-attempts ("locks the OTP request after 6 wrong attempts"), refresh-token reuse (`RefreshSession.spec.ts` — "Old token reuse returns 401"), 11th-session eviction (`VerifyOtp.spec.ts` — "evicts oldest session when user has 10 active sessions"), and IP rate-limit logic (`OtpAttemptLedger.spec.ts`).
- **Presentation** (e2e Supertest against the running compose Postgres, not Testcontainers): `AuthController.e2e.spec.ts` covers happy-path OTP request + verify, phone rate-limit response shape, logout / logout-all / GET me / DELETE me. Re-running it requires `pnpm dev` (or at least the `postgres` and `redis` compose services) up locally.
- **Infrastructure layer** — the Sprint 2 plan called for Testcontainers tests of `PrismaOtpRequestRepository` and `PrismaSessionRepository` against an isolated Postgres. **Deferred.** Rationale: these repositories are thin pass-throughs over `prisma.<model>.{create,findUnique,update,deleteMany}` and are exercised indirectly by `AuthController.e2e.spec.ts` against the real compose Postgres. If a future bug ever surfaces inside an adapter, the right move is to add the Testcontainers test then — not to backfill it now.

## Events emitted

- `UserRegistered` — first successful OTP verification creates a User
- `UserSuspended` / `UserUnsuspended`
- `DealershipVerified`
- `SessionRevoked`

## Events consumed

- (none in MVP)

## Notable decisions

- [ADR-0006](../../../../docs/adr/0006-auth.md) — Phone OTP + TOTP for admins. Refresh subsection superseded by ADR-0012.
- [ADR-0012](../../../../docs/adr/0012-multi-device-sessions.md) — Multi-device sessions, per-session refresh tokens (bcrypt), 10-session cap, sliding 30-day expiry.
- [ADR-0013](../../../../docs/adr/0013-user-role-split.md) — `User.role` (marketplace identity) split from `DealershipMember.role` (membership role).
- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Bounded context architecture.
