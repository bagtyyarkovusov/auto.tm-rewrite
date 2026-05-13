# Sprint 2 — Identity (OTP end-to-end)

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | M2 — I can log in |
| **Demo audience** | Tiny internal group |
| **Estimated time** | ~1 week |

## Goal

Make phone-OTP login work end-to-end on mobile and public web. Issue JWTs, rotate refresh tokens, expose `DELETE /api/v1/me` (Apple App Store requirement).

## User capability (the demo line)

> "I open the app, type my TM phone number, get a code (mocked in dev, real-phone in staging), type it in, and I'm logged in. I can log out. I can delete my account."

## Bounded contexts touched

- **Primary**: `identity/` — full four-layer flow (`domain` + `application` + `infrastructure` + `presentation`)
- **Supporting**: `apps/sms-gateway` (mock driver wired to API); `apps/mobile/(auth)/otp.tsx`; `apps/web/[locale]/login`

## Acceptance criteria (DoD)

- [ ] `POST /api/v1/auth/otp/request` accepts TM phones (`+993[6-7]XXXXXXX`), rejects others with `VALIDATION_FAILED`
- [ ] Rate limits enforced: 5/phone/day + 10/IP/hour with exponential backoff (charter §16)
- [ ] `POST /api/v1/auth/otp/verify` returns access + refresh tokens; refresh hashed in `User.refreshTokenHash` (bcrypt)
- [ ] `POST /api/v1/auth/refresh` rotates refresh token (old one invalidated); both new tokens returned
- [ ] `POST /api/v1/auth/logout` invalidates refresh token + session row
- [ ] `DELETE /api/v1/me` wipes per-user state (sessions, refresh tokens, owned vehicles, blocked-users, favorites, saved searches, notifications, conversations as buyer)
- [ ] Mobile flow: phone screen → OTP screen → tab nav (logged in); resend timer respected; wrong-code error inline
- [ ] Web flow: same shape, with the route `/{locale}/login`
- [ ] `OTP_TEST_MODE=true` returns the code in the API response (CI + dev only)
- [ ] `SMS_DRIVER=mock` succeeds silently; `SMS_DRIVER=gateway` calls the SMS gateway (only used in staging once phones are sourced)
- [ ] `identity/CONTEXT.md` reflects what now exists (use-cases + ports)
- [ ] Domain + application layers have unit tests; presentation has one e2e covering the happy path
- [ ] At least one chaos test: code expires after TTL; reusing a code fails; 6 wrong attempts locks for the day
- [ ] `docs/prd/03-roadmap.md` updated (S2 🟢, S3 🟡)

## Tests required (TDD mandatory)

- **Domain** (no Prisma): `OtpCodeValueObject` (length, charset), `Phone` (E.164 + TM mobile prefix), `RefreshTokenRotation` rules, `OtpAttemptLedger` rate-limit logic
- **Application** (no HTTP): `RequestOtp`, `VerifyOtp`, `RefreshSession`, `Logout`, `DeleteMe` — one test class per use-case, dependencies injected as fakes
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
apps/web/src/app/[locale]/login/page.tsx
apps/sms-gateway/src/adapters/OtpSenderMock.ts   (already scaffolded in S1; verified working)
```

## References

- **PRD feature**: [`../features/30-identity.md`](../features/30-identity.md)
- **End-to-end flow**: [`../flows/60-first-time-user.md`](../flows/60-first-time-user.md)
- **Charter sections**: §6 (Authentication), §16 (API conventions — rate limits, error shape), §17 (Phone validation)
- **ADRs**: 0006 (Auth), 0001 (Architecture — port pattern)

## Previous-sprint dependencies

- S1 — scaffold (api skeleton, sms-gateway mock driver, JWT module wired, db migration including `users`, `sessions`, `otp_requests`)

## Open questions / risks

- **Refresh-token rotation race**: if two clients refresh simultaneously, only one wins. Spec says: invalidate-then-issue under a transaction. Verify the Testcontainers integration test exercises this.
- **DELETE /api/v1/me data scope**: Apple's bar is "delete the account and associated data." Decision: hard-delete all per-user rows except `audit_log` (kept for legal). Document this on the endpoint.
- **OTP phone availability**: dev runs the `mock` driver. Staging needs at least 1 real OTP phone with TM SIM (charter §19 item 4).
