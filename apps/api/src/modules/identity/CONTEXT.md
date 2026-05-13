# identity — CONTEXT

## Purpose

User identity, authentication, sessions, dealerships, and personal garage. The single source of "who is this person and what are they allowed to do."

## Owns (entities + tables)

- `User` — id, phone, email?, name, avatarUrl, role (`admin` / `owner` / `user`), createdAt, suspendedAt?
- `Dealership` — id, slug, name, city, logoUrl, verifiedAt?, responseTimeMinutes?
- `DealershipMember` — { dealershipId, userId, role (`owner` / `sales`) } junction
- `OtpRequest` — id, phone, codeHash, expiresAt, consumedAt?, attempts
- `Session` — id, userId, refreshTokenHash, deviceId, userAgent, createdAt, lastSeenAt, revokedAt?
- `OwnedVehicle` (Garage) — id, userId, brandId, modelId, generationId?, year, color?, vin?, mileage?, nickname?, status (`owned` / `dream` / `sold`), photoUrl?, isPublic, linkedListingId?
- `BlockedUser` — { userId, blockedUserId, createdAt }
- `TotpEnrollment` (admin only) — userId, secret, backupCodes[]

## Invariants

- A `User` has exactly one phone (unique). Email is optional and not used for login.
- A `User` can belong to **at most one** `Dealership` (via `DealershipMember`)
- A `Dealership` must have at least one `DealershipMember` with role `owner`
- A `User.role = 'admin'` MUST have a `TotpEnrollment`
- `Session.refreshTokenHash` is bcrypt-hashed; plaintext is never stored
- Only ONE active `Session` per user — issuing a new refresh token invalidates the old one
- `OtpRequest.code` is hashed; plaintext never stored
- `OtpRequest` expires after 5 minutes; max 5 attempts before invalidation
- A user CAN be blocked, in which case all writes (POST/PATCH) fail with 403
- A `BlockedUser` relationship is one-way (block by A on B). If both want, both must block.

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

- [ADR-0006](../../../../docs/adr/0006-auth.md) — Phone OTP + TOTP for admins
- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Bounded context architecture
