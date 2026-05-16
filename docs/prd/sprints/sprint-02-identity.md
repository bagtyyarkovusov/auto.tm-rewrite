# Sprint 2 — Identity (OTP end-to-end)

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | M2 — I can log in |
| **Demo audience** | Tiny internal group |
| **Estimated time** | ~1 week |

## Goal

Make phone-OTP login work end-to-end on mobile. Issue JWTs, rotate per-session refresh tokens, expose logout / logout-all, and expose `DELETE /api/v1/me` (Apple App Store requirement). Public web stays anonymous-only per `apps/web/CONTEXT.md`.

## User capability (the demo line)

> "I open the app, type my TM phone number, get a code (mocked in dev, real-phone in staging), type it in, and I'm logged in. I can log out. I can delete my account."

## Bounded contexts touched

- **Primary**: `identity/` — full four-layer flow (`domain` + `application` + `infrastructure` + `presentation`)
- **Supporting**: `packages/db` + `packages/contracts` (S1 schema/contract drift fixed in foundations); `apps/sms-gateway` (mock driver wired to API); `apps/mobile/(auth)/otp.tsx`

## Acceptance criteria (DoD)

- [ ] `POST /api/v1/auth/otp/request` accepts TM phones (`+993[6-7]XXXXXXX`), rejects others with `VALIDATION_FAILED`
- [ ] Rate limits enforced: 5/phone/day + 10/IP/hour with exponential backoff (charter §16)
- [ ] `POST /api/v1/auth/otp/verify` returns access + refresh tokens; refresh hash is stored on `Session.refreshTokenHash` (bcrypt), never on `User`
- [ ] `POST /api/v1/auth/refresh` rotates refresh token in-place on the same `Session` row; old token is invalidated; both new tokens returned
- [ ] Multi-device sessions follow ADR-0012: max 10 concurrent sessions per user, 11th login evicts oldest after expired-session cleanup, sliding 30-day refresh expiry
- [ ] `POST /api/v1/auth/logout` deletes the single session matching the supplied refresh token
- [ ] `POST /api/v1/auth/logout-all` deletes all sessions for the authenticated user
- [ ] `DELETE /api/v1/me` wipes per-user state (sessions, owned vehicles, blocked-users, favorites, saved searches, notifications, conversations as buyer)
- [ ] Mobile flow: phone screen → OTP screen → tab nav (logged in); resend timer respected; wrong-code error inline
- [ ] `OTP_TEST_MODE=true` returns the code in the API response (CI + dev only)
- [ ] `SMS_DRIVER=mock` succeeds silently; `SMS_DRIVER=gateway` calls the SMS gateway (only used in staging once phones are sourced)
- [ ] `identity/CONTEXT.md` reflects what now exists (use-cases + ports)
- [ ] Domain + application layers have unit tests; presentation has one e2e covering the happy path
- [ ] At least one chaos test: code expires after TTL; reusing a code fails; 6 wrong attempts locks for the day
- [ ] `docs/prd/03-roadmap.md` updated (S2 🟢, Current Sprint S3 ⚪ Pending)

## Tests required (TDD mandatory)

- **Domain** (no Prisma): `OtpCodeValueObject` (length, charset), `Phone` (E.164 + TM mobile prefix), `RefreshTokenRotation` rules, `OtpAttemptLedger` rate-limit logic
- **Application** (no HTTP): `RequestOtp`, `VerifyOtp`, `RefreshSession`, `Logout`, `LogoutAll`, `DeleteMe` — one test class per use-case, dependencies injected as fakes
- **Infrastructure** (Testcontainers): `OtpRequestRepository`, `SessionRepository` against real Postgres
- **Presentation** (e2e Supertest): happy-path login; rate-limit response shape

## Files this sprint creates / touches

```
apps/api/src/modules/identity/
├── domain/
│   ├── Phone.ts              Value object (E.164 + TM mobile validation)
│   ├── OtpCode.ts            VO (6-digit numeric)
│   ├── User.ts               Entity (id, phone, role, etc.)
│   ├── Session.ts            Entity
│   ├── OtpRequest.ts         Entity (with TTL + attempts ledger)
│   └── ports/
│       ├── UserRepository.ts
│       ├── SessionRepository.ts
│       ├── OtpRequestRepository.ts
│       ├── OtpSenderPort.ts        Abstracts the SMS gateway
│       ├── PasswordHasherPort.ts   Bcrypt for refresh hashing
│       └── ClockPort.ts            Injectable clock for time-based tests
├── application/
│   ├── RequestOtp.ts
│   ├── VerifyOtp.ts
│   ├── RefreshSession.ts
│   ├── Logout.ts
│   ├── LogoutAll.ts
│   ├── DeleteMe.ts
│   └── GetMe.ts
├── infrastructure/
│   ├── PrismaUserRepository.ts
│   ├── PrismaSessionRepository.ts
│   ├── PrismaOtpRequestRepository.ts
│   ├── HttpOtpSenderAdapter.ts     Wraps apps/sms-gateway
│   ├── BcryptHasherAdapter.ts
│   └── SystemClockAdapter.ts
├── presentation/
│   ├── AuthController.ts
│   └── MeController.ts
└── identity.module.ts

apps/mobile/app/(auth)/{phone,otp}.tsx
apps/sms-gateway/src/adapters/OtpSenderMock.ts   (already scaffolded in S1; verified working)

packages/db/prisma/schema.prisma + migration for ADR-0012 / ADR-0013
packages/contracts/src/enums.ts + exported contract schemas for identity auth
```

## References

- **PRD feature**: [`../features/30-identity.md`](../features/30-identity.md)
- **End-to-end flow**: [`../flows/60-first-time-user.md`](../flows/60-first-time-user.md)
- **Charter sections**: §6 (Authentication), §16 (API conventions — rate limits, error shape), §17 (Phone validation)
- **ADRs**: 0001 (Architecture — port pattern), 0006 (Auth), 0012 (Multi-device sessions), 0013 (User role / dealership membership split)

## Previous-sprint dependencies

- S1 — scaffold (api skeleton, sms-gateway mock driver, JWT module wired, db migration including `users`, `sessions`, `otp_requests`). S2 foundations must align the shipped schema/contracts with ADR-0012 and ADR-0013 before auth use-cases land.

## Open questions / risks

- **Refresh-token rotation race**: if two requests refresh the same session simultaneously, only one wins. Spec says update-in-place under a transaction. Verify the Testcontainers integration test exercises this and token reuse returns 401.
- **Concurrent-session cap**: ADR-0012 caps sessions at 10 per user. Verify the 11th successful login evicts the oldest active session after expired-session cleanup.
- **DELETE /api/v1/me data scope**: Apple's bar is "delete the account and associated data." Decision: hard-delete all per-user rows except `audit_log` (kept for legal). Document this on the endpoint.
- **OTP phone availability**: dev runs the `mock` driver. Staging needs at least 1 real OTP phone with TM SIM (charter §19 item 4).
