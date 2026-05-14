# ADR-0012: Multi-device sessions with per-session refresh tokens

- **Status**: Accepted
- **Date**: 2026-05-14
- **Deciders**: bagtyyar + Claude (Sprint 2 grilling session, post-S1 retro)
- **Supersedes**: ADR-0006 §"Refresh token storage" (the rest of ADR-0006 stands)

## Context

ADR-0006 (Phone OTP + SMS gateway, accepted 2026-05-13) locked the auth model as:

> Bcrypt-hashed in `User.refreshTokenHash`.
> Never stored plaintext.
> One active refresh token per user at a time (rotation invalidates the old one).

S1's Prisma schema (PR #21) shipped *both* a `User.refreshTokenHash` column (matching the ADR) *and* a `Session` model with a plaintext `refreshToken @unique` column (contradicting the ADR — and CLAUDE.md's "NEVER store plaintext refresh tokens" rule). The contradiction surfaced in the S1 retrospective.

Before S2 implements `VerifyOtp`, `RefreshSession`, `Logout`, and `DeleteMe`, we must pick one model and align the schema. Two coherent paths existed:

- **Stay single-device** (drop `Session.refreshToken`; keep `User.refreshTokenHash`; the `Session` model becomes vestigial or audit-only).
- **Move to multi-device** (drop `User.refreshTokenHash`; refresh tokens live on `Session`, hashed; supports the natural "phone + tablet + web" user case).

Turkmenistan is mobile-first but a meaningful slice of users browse on web (auto.tm public site) while they have the mobile app installed. Forcing the silent-revoke pattern (single-device) means every "I checked the website at lunch" interaction invalidates the user's mobile login — bad UX that compounds with our slow re-OTP loop (SMS over physical phones, 5-min OTP TTL, 5/phone/day rate limit).

## Decision

Auth is **multi-device**. Each successful `VerifyOtp` or `RefreshSession` corresponds to one `Session` row. Concretely:

### Session model (final shape)

```prisma
model Session {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokenHash  String    @unique         // bcrypt; never plaintext
  deviceLabel       String?                   // client-supplied: "Bagtyyar's iPhone", "Chrome on Mac"
  userAgent         String?                   // captured at session create
  expiresAt         DateTime                  // = lastSeenAt + 30 days (sliding)
  createdAt         DateTime  @default(now()) // immutable — set once at session create
  lastSeenAt        DateTime  @default(now()) // bumped on every refresh

  @@index([userId])
  @@map("sessions")
}
```

- `refreshTokenHash`: bcrypt of the random refresh token (32 bytes, hex-encoded). The plaintext token is returned to the client exactly once at `VerifyOtp` / `RefreshSession`, never persisted.
- `deviceLabel`: optional, client-supplied at login. Mobile sends e.g. `${platform} ${deviceModelName}`; web parses the user-agent. Free-form string for the eventual "manage your devices" UI.
- `userAgent`: captured server-side at session creation from the request headers. Not updated on refresh.
- `createdAt`: when this session row was first created. Never updated, even on refresh. Used as the FIFO eviction sort key.
- `lastSeenAt`: updated to `now()` on every successful refresh. `expiresAt` is recomputed as `lastSeenAt + 30 days` (sliding expiry).

### Refresh semantics

Refresh is **update-in-place on the same Session row**:
- `refreshTokenHash` overwritten with the bcrypt of a new random refresh token
- `lastSeenAt = now()`
- `expiresAt = lastSeenAt + 30 days`
- `createdAt` unchanged

The new refresh token is returned to the client; the old plaintext token is immediately unusable (its hash is gone). If a request arrives with a refresh token whose bcrypt no longer matches any session, return 401 — never silently issue a new session for an unknown token.

### Concurrent-session cap

Maximum **10 concurrent sessions per user**. On the 11th successful login:

1. Delete any of the user's sessions where `expiresAt < now()` (lazy cleanup).
2. If session count is still ≥ 10, delete the session with the smallest `createdAt` (FIFO eviction).
3. Insert the new session.

This bounds storage per user and limits the blast radius of a compromised user.

### Logout endpoints

Two endpoints, both delete rows (no soft-delete):

- `POST /api/v1/auth/logout` — body: `{ refreshToken }`. Server locates the session by `bcrypt.compare`, deletes that single row. Returns 204.
- `POST /api/v1/auth/logout-all` — requires authenticated request (bearer access token). Deletes all `Session` rows for `req.user.id`. Returns 204. The caller's own session is included in the delete; the access token continues to work until its 15-min expiry but no refresh is possible.

### Refresh-token rotation property (preserved from ADR-0006)

"Rotation on every refresh" is preserved: each refresh issues a new random token, hashes it, overwrites the column. The window where the old token is still valid is the duration of the refresh transaction (effectively zero from the client's perspective).

### TotpEnrollment deferral

ADR-0006 mandates TOTP for the `admin` role. `User.role = 'admin'` is not exercised by any code path until Sprint 9 (admin dashboard). To keep S2 scope tight, `TotpEnrollment` (table + flow) ships in **S9**, not S2. The ADR-0006 invariant "admin role cannot be granted without TOTP" is preserved as policy — the first admin grant must happen on or after S9 ships.

## Consequences

### Positive

- **Mobile + web concurrent sessions just work.** Most realistic user case for AutoTM (browsing on web during the day, app at night) is supported without dropping sessions.
- **`DELETE /api/v1/me` is one query** (`DELETE FROM sessions WHERE userId = ?` thanks to `onDelete: Cascade`).
- **"Sign out from your other devices" is a free feature** — `POST /auth/logout-all` is ~5 lines of code. Adds real security value the moment a user reports a lost phone.
- **CLAUDE.md "no plaintext refresh tokens" rule is honored cleanly.** No more `Session.refreshToken String @unique`.
- **Sliding expiry matches mobile-app norms.** A user who opens the app once every few weeks stays logged in; a user who's been inactive for 30 days re-authenticates.

### Negative / accepted costs

- **Migration to apply.** S2's foundations PR will:
  1. Drop `User.refreshTokenHash` column.
  2. Drop `Session.refreshToken` column (the plaintext one).
  3. Add `Session.refreshTokenHash @unique`.
  4. Add `Session.deviceLabel`, `Session.userAgent`, `Session.lastSeenAt`.
  5. Ensure `onDelete: Cascade` on `Session.userId → User.id` (so `DELETE /me` cascades cleanly).
  The migration is trivial (greenfield — no data).
- **Concurrent-session enforcement is application-level**, not a DB constraint. A bug in `VerifyOtp` could allow >10 sessions. Mitigation: the integration test for `VerifyOtp` includes a chaos case ("11th login evicts oldest"); use-case is the only writer of `Session` rows.
- **No revoke-by-token-id API** in S2. If a user wants to log out a specific other device without seeing the list, they have to use `logout-all` and re-login on the device they want to keep. A future S6/S9 enhancement could add "manage devices" UI.

### Neutral

- **`deviceLabel` is free-form, client-supplied**, never validated. A malicious client could send junk. The cost is cosmetic (the "manage devices" UI would render garbage); no security impact. Acceptable for Phase 1.
- **No IP address capture.** Could be added later if abuse patterns emerge. Phase-1 air-gapped TM deployment has limited adversary model.
- **Absolute session lifetime is unbounded** as long as the user keeps refreshing. A session that's actively used could in theory live for years. If this becomes an audit concern (e.g., post-Phase-2 inspection-report sensitive data), add `maxAbsoluteAge` (e.g., 180 days) and force re-login. Out of scope for Phase 1.

## Alternatives considered

- **Stay single-device (ADR-0006 as-written).** Rejected: harms the realistic mobile-and-web user case for Phase 1, and ADR-0006's "one refresh per user" predates our seeing real usage patterns.
- **Single-device but with a richer `Session` audit log.** Rejected: introduces a `Session` table that's audit-only — a contradictory model that's neither truly single-device nor multi-device. Cleaner to commit to multi-device.
- **JWT-only refresh (no DB row at all).** Rejected: revocation becomes impossible (can't kill a stolen refresh token before it expires), `logout` becomes a no-op, blast radius of a leak is the full refresh TTL.
- **Soft-delete sessions (`revokedAt` instead of row deletion).** Rejected: adds a query predicate everywhere (`WHERE revokedAt IS NULL`), serves no Phase-1 purpose. Reconsider in Phase 2 if we ever need refresh-history audit.

## Migration plan (S2 foundations PR)

```sql
-- Conceptual; actual SQL emitted by `prisma migrate dev --name multi-device-sessions`
ALTER TABLE users DROP COLUMN refresh_token_hash;

ALTER TABLE sessions
  DROP COLUMN refresh_token,
  ADD COLUMN refresh_token_hash TEXT UNIQUE NOT NULL,
  ADD COLUMN device_label TEXT,
  ADD COLUMN user_agent TEXT,
  ADD COLUMN last_seen_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE sessions
  DROP CONSTRAINT sessions_user_id_fkey,
  ADD CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
```

Greenfield (no data) → no backfill needed.

## References

- Charter [§6 Authentication](../../GRILL-OUTCOME.md#6-authentication)
- [ADR-0006](0006-auth.md) — Phone OTP + custom Android SMS gateway (supersedes §"Refresh token storage" only; rest stands)
- [CLAUDE.md](../../CLAUDE.md) — "NEVER store plaintext refresh tokens"
- Sprint plan [sprint-02-identity.md](../prd/sprints/sprint-02-identity.md) — the use-cases that consume this model
- Sprint retro [sprint-01-scaffold-retro.md](../prd/sprints/sprint-01-scaffold-retro.md) §4.3 — drift that surfaced the issue
