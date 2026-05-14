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
