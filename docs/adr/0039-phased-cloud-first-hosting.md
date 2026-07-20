# ADR-0039: Phased cloud-first hosting — Railway until store verification, then TM cutover

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: AutoTM founder + AI architect
- **Amends**: ADR-0005 (Railway/cloud exclusion now scoped to TM-serving production only)
- **Supersedes**: ADR-0030 §"Exactly one reserved E.164 number" (scoping only — every other ADR-0030 constraint stands)

## Context

The pre-launch sequence inherited from ADR-0005 made TM presence a hard gate for the first deploy: production was fully-in-TM air-gapped from day one, so nothing could ship until someone was on the ground in Turkmenistan with racked hardware. That blocked App Store / Google Play submission indefinitely — the founder is geo-blocked abroad and the TM-presence timeline is unknown. On 2026-07-20 the founder re-sequenced the strategy: get store-verified first on cloud hosting, then cut over to the ADR-0005 topology once the stores approve and TM presence exists.

Store submission imposes its own constraints that shaped the phase design: store binaries bake `EXPO_PUBLIC_API_URL` at build time (`apps/mobile/src/api/client.ts`), so the production backend URL must be final before the first binary is submitted; store review requires a live public privacy URL (legal pages live at `apps/web/src/app/[locale]/legal/`, RU/TK/EN); and reviewers must be able to authenticate and exercise the full app (ADR-0030).

## Decision

**AutoTM hosts cloud-first on Railway — staging + production — until both stores approve, then cuts over to the ADR-0005 fully-in-TM air-gapped topology. The TM-presence gate moved; it did not vanish — it now gates the cutover instead of the first deploy.**

### Hosting sequence and cutover trigger

- Railway runs staging and production until store verification passes. Cutover to the ADR-0005 TM topology happens when **all four** conditions hold:
  1. Both stores approved.
  2. Confirmation pass on Railway production: demo-account auth, listing create, rich chat, report → moderation, FCM/APNS delivery.
  3. TM presence / trusted helper available.
  4. TM hardware racked.
- Post-cutover, Railway stays as the **permanent staging tier** serving no TM users — it mirrors ADR-0005's accepted "developer machine abroad" tier. Railway production services are torn down at cutover.
- This **amends ADR-0005's Railway/cloud exclusion**: cloud remains ruled out for TM-serving production, but is accepted for the pre-launch phase (no TM users, all data is demo data) and for the permanent staging tier.

### CI/CD split

- CI gates (typecheck, lint, unit, Testcontainers e2e, mobile gates) stay on GitHub Actions via the `tm-build-mac` launchd runner.
- Railway owns build + deploy only, triggered after CI green (Railway "wait for CI").

### Railway shape

- One Railway project, two environments: `staging` (auto-deploy from `main` after CI green) and `production` (manual promote only).
- Services per environment: **api, worker, admin, web, postgres, redis, minio**. Excluded: `sms-gateway`, `phone-agent` (TM-era work).
- `apps/web` is in scope because store review requires a live public privacy URL.
- `prisma migrate deploy` runs as the deploy/release step (ADR-0004 pattern).

### Store-era auth

- No real SMS until TM cutover; no real users until TM, even with store listings live. OTP request/verify UI ships unchanged.
- `SMS_DRIVER=mock` in both Railway environments; the code is readable in Railway logs — acceptable because all pre-TM data is demo data. `SMS_DRIVER=test` / `OTP_TEST_MODE` are never set outside CI.
- The `gateway` driver and SMS-gateway hardware remain TM-era work (gateway is currently a stub in `apps/api/src/modules/identity/infrastructure/HttpOtpSenderAdapter.ts`).
- **Demo accounts: 3–5, not one.** This supersedes ADR-0030's "exactly one" scoping; every other ADR-0030 constraint stands unchanged (reserved unissueable `+993` numbers, fixed OTP, constant-time compare, rate-limit exempt, audited, buyer/seller privileges only — never admin, flag-gated `REVIEW_DEMO_ACCOUNT_ENABLED`, credentials only in store review notes). At least a buyer + seller pair so reviewers can exercise rich chat and report/block between distinct accounts. Seeded demo content required per ADR-0030. ADR-0030 is decided but not implemented — this is Sprint 11 build work.

### Domain

- Domainless for now: Railway `*.up.railway.app` generated domains serve staging/internal testing (stable per service + environment).
- **Hard deadline: register `auto.tm` (or best fallback) before the first store-binary submission.** Store binaries bake `EXPO_PUBLIC_API_URL` at build time, so a binary pointing at a Railway URL would force re-review at cutover. Point `api.` / `admin.` / `media.` / apex at Railway pre-submission; cutover is then a pure DNS flip.
- No universal links today (scheme `autotm://` only). No `eas.json` yet — Sprint 11 creates it with per-profile `EXPO_PUBLIC_API_URL`.

### OTA

- The self-hosted updates server is deferred entirely to the TM era; ADR-0029 is unchanged (it was always TM-shaped). The store-era app ships without `updates.url`; pre-launch iteration happens via TestFlight / Play tracks / direct APK.

## Consequences

### Positive

- Store submission is unblocked without waiting for TM presence or hardware — the former hard gate is removed from the critical path.
- CI stays where it already works (self-hosted runner with Testcontainers e2e and mobile gates); Railway adds a deploy-only surface after tests pass.
- With the domain registered pre-submission, cutover reduces to a DNS flip — no store re-review, no binary rebuild.
- Railway persists post-cutover as a permanent non-TM staging tier, preserving an internet-reachable test environment.
- The 3–5 demo-account pool lets reviewers exercise multi-party flows (rich chat, report/block) that a single account cannot demonstrate.

### Negative / accepted costs

- Temporarily hosts "production" on foreign cloud, contrary to the original air-gap posture. Accepted because no TM users are served pre-cutover and all pre-TM data is demo data.
- Two hosting topologies to document, test, and keep reconciled (Railway era, then TM era) until cutover completes.
- Railway spend during the pre-TM period.
- `SMS_DRIVER=mock` in Railway environments means no real OTP delivery until cutover — no real users can sign up even if the listing is live (intended, but must be operationally remembered).
- The standing demo-account bypass surface grows from one account to 3–5 (mitigated by ADR-0030's unchanged constraints).
- Domain registration becomes a hard gate on the submission critical path.

### Neutral

- `eas.json` enters the repo with per-profile `EXPO_PUBLIC_API_URL`.
- `apps/web` becomes deploy-critical for legal pages even though it is otherwise secondary to mobile.
- Sprint 11 shapes as the Railway deployment sprint; Sprint 12 is the human-led store submission track.

## Alternatives considered

- **Wait for TM presence before any deploy (original sequencing).** Rejected: store verification would be blocked indefinitely; the founder is geo-blocked abroad and TM presence has no committed date.
- **Railway for CI and CD.** Rejected: CI gates stay on the GitHub Actions self-hosted runner where Testcontainers e2e and mobile gates already run; Railway owns everything after tests pass.
- **Deploy only api + data services; skip web and admin.** Rejected: store review requires a live public privacy URL (web legal pages), and the report → moderation confirmation flow requires admin.
- **Point the first store binary at a Railway URL and re-submit at cutover.** Rejected: every re-review is delay and rejection risk; pre-registering the domain makes cutover a pure DNS flip.
- **Keep ADR-0030's single demo account.** Rejected: a reviewer cannot exercise rich chat or report/block between distinct accounts with one login, weakening the Guideline 1.2 demonstration.

## References

- [ADR-0004](0004-migrations.md) — migrations as deploy step
- [ADR-0005](0005-hosting.md) — TM air-gapped topology (cutover target; exclusion amended in scope)
- [ADR-0006](0006-auth.md) — phone OTP + SMS driver model
- [ADR-0029](0029-self-hosted-ota-air-gap-delivery.md) — self-hosted OTA (unchanged; TM-era)
- [ADR-0030](0030-reviewer-demo-account-otp-bypass.md) — reviewer demo-account bypass (scoping superseded to 3–5)
- Charter §9 (infrastructure), §17 (SMS_DRIVER, phone validation)
- Sprint 11 — Railway deployment sprint (to be shaped); Sprint 12 — store submission track
