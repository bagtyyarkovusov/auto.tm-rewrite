# identity — CONTEXT

## Purpose

User identity, authentication, sessions, dealerships, and personal garage. The single source of "who is this person and what are they allowed to do."

## Owns (entities + tables)

- `User` — id, phone, displayName?, avatarUrl?, locale, role (`buyer` | `seller` | `moderator` | `admin`), createdAt, updatedAt
- `Dealership` — id, slug, name, logoUrl?, cityId?, createdAt, updatedAt
- `DealershipMember` — id, dealershipId, userId (unique — at most one dealership per user), role (`owner` | `sales`), createdAt
- `OtpRequest` — id, phone, codeHash, expiresAt, verifiedAt?, attempts, userId?, createdAt, updatedAt
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
- `OtpRequest.code` is hashed; plaintext never stored.
- `OtpRequest` expires after 5 minutes; max 5 attempts before invalidation.
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
SmsPort       // from apps/sms-gateway — sends OTPs
MailPort      // for admin password reset (future)
```

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
