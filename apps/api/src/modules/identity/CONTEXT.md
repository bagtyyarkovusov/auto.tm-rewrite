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

- **S6 (Garage)** — `OwnedVehicle` gets `vin`, `mileage`, `nickname`, `status`, `photoUrl`, `isPublic`, `linkedListingId` columns (currently a thin schema with just brand/model/year strings). See `docs/prd/sprints/sprint-06-garage-dealership.md`.
- **S9 (Admin dashboard)** —
  - `TotpEnrollment` entity (per ADR-0006 / ADR-0012 deferral) — admin login requires TOTP enrollment. Schema lands in S9.
  - `Dealership.verifiedAt` column for the dealership-verification flow used by listings + admin UI.
  - `IdentityReadPort` interface (`getUserSummary`, `getDealershipSummary`, `isUserBlockedBy`) for other contexts (admin app, listings, conversations) to fetch user/dealership summaries without owning the data.
  - `UserSuspended` / `UserUnsuspended` / `DealershipVerified` / `SessionRevoked` event emissions wired to admin moderation actions.

## Notable decisions

- [ADR-0006](../../../../../docs/adr/0006-auth.md) — Phone OTP + TOTP for admins (refresh subsection superseded by ADR-0012).
- [ADR-0012](../../../../../docs/adr/0012-multi-device-sessions.md) — Multi-device sessions, per-session refresh tokens (bcrypt), 10-session cap, sliding 30-day expiry.
- [ADR-0013](../../../../../docs/adr/0013-user-role-split.md) — `User.role` split from `DealershipMember.role`.
- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Bounded context architecture.
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state.
