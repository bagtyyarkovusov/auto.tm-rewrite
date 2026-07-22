# Sprint 11 — Railway deployment + store-review readiness

| | |
|---|---|
| **Status** | ⚪ Approved 2026-07-22, not started — batch grill complete; pending issue creation; mutable until roadmap → 🟡 |
| **Phase** | Pre-launch deployment track (ADR-0039) |
| **Milestone** | M10 — Store-reviewable cloud production |
| **Demo audience** | Founder, internal operators, and App Store / Google Play reviewers using seeded demo accounts |
| **Appetite** | One deployment sprint; slice vertically and stop at a repeatable reviewer-ready production proof |
| **Issues** | Approved 13-slice dependency map below; GitHub issues not yet created |

> **Why this sprint exists.** S10 closed the remote product loop, but the product is not reachable by store reviewers and production native push is still a shell. [ADR-0039](../../adr/0039-phased-cloud-first-hosting.md) moves the first deployment to Railway so store verification can proceed without waiting for TM presence or hardware. S11 makes that temporary cloud phase operable and reviewable. It does not open the marketplace to real users.

## Goal

Deploy staging and reviewer-only production on Railway, prove the complete store-review path against seeded demo data, and leave a repeatable promotion, rollback, backup/restore, and mobile-build procedure for Sprint 12's human-led submissions.

## User capability (the demo line)

> “From an installable production-smoke mobile build that is not submitted to either store, a reviewer can sign in with one of the reserved demo accounts, browse and create seeded listings, exchange rich chat between distinct buyer/seller accounts, receive a native direct-message push, report/block content, and see the report handled in the live admin — while an operator can identify the deployed commit, migrate safely, restore data, roll back, and repeat the deployment.”

## Locked inputs

- [ADR-0039](../../adr/0039-phased-cloud-first-hosting.md) owns the hosting sequence: Railway staging + production until both stores approve, then the ADR-0005 TM cutover.
- CI stays on the `tm-build-mac` GitHub Actions runner. Railway builds/deploys only after CI is green.
- One Railway project has `staging` and `production`. Staging deploys `main` after CI; production is manual only.
- Each environment has `api`, `worker`, `admin`, `web`, Postgres, Redis, and MinIO. `sms-gateway` and `phone-agent` are excluded.
- `SMS_DRIVER=mock`; `OTP_TEST_MODE` and response-embedded test codes are forbidden outside CI.
- Production is reviewer-only: 3–5 reserved, unissueable `+993` demo accounts; no real users or real SMS before TM cutover.
- Railway-generated domains are acceptable for staging and internal `production-smoke` builds. A stable AutoTM-owned API domain is a human-owned hard gate before the `production` store profile is built or submitted in Sprint 12.
- The store-era app has no `updates.url`; self-hosted OTA remains TM-era work.

## Scope

### 1. Deployable service contract

- Make the monorepo build and start each Railway service reproducibly from the repository.
- Add versioned Railway configuration where it removes dashboard-only drift; document any settings that must remain provider-side.
- Use Railway private networking for service-to-service Postgres, Redis, and MinIO traffic. Expose MinIO's S3 origin only for anonymous media reads and signed direct client PUTs; administrative and unsigned writes remain private, and the console is never public.
- Give API a liveness-only `/healthz` and a bounded `/readyz` that checks Postgres, Redis, and MinIO. Web/admin get dependency-free deploy health endpoints; the worker validates Postgres, Redis/queue, and complete production push credentials at boot rather than exposing a public route.
- API is the sole `prisma migrate deploy` authority through its Railway pre-deploy command. Worker/admin/web reference API readiness and deploy only after migration + readiness succeed. Never run `migrate dev`, `db push`, or reverse migrations; roll back application code only against expand/contract-compatible forward migrations.
- Record commit SHA and environment in deploy evidence so production can be tied to the exact `main` revision proven in staging, even if Railway rebuilds it.

### 2. Safe environment and promotion model

- Produce a checked-in, secret-free environment matrix for every service and environment, with generated values/references separated from human-supplied credentials.
- Staging auto-deploys from `main` only after GitHub Actions succeeds with Railway “Wait for CI.”
- Production has no branch autodeploy. An operator manually deploys the exact SHA that passed staging smoke and records approval/evidence.
- Define fail-closed reviewer-era flags: no public signup, no real SMS, no CI OTP response mode, no production test push transport, and no accidental cross-environment database/storage URLs.
- Prove a rollback and a Postgres + media backup/restore drill on non-production data before production is declared ready.
- Railway Serverless sleep may be enabled for staging API, admin, and web. Trial it for staging MinIO only after volume persistence, wake, media-read, and signed-upload proof. The worker and environment-local Postgres/Redis remain awake; all production services remain awake during store review. Cold-start smoke must cover legal pages, auth, WebSocket chat, media reads, and signed uploads.

### 3. Reviewer identity and seeded scenario

- Implement the ADR-0030 bypass as amended by ADR-0039 for 3–5 reserved accounts.
- Reserved-number and fixed-code comparisons are constant-time; the bypass is flag-gated, rate-limit exempt, audited, and can never create/elevate an admin.
- Seed at least a buyer + seller pair plus enough normal buyer/seller identities to exercise concurrent review; credentials stay out of git and appear only in store-review/operator secret stores.
- Seed deterministic listings, a conversation starting point, and reportable content. The seed is idempotent and refuses unsafe environments unless explicitly authorized.
- Verify the reviewer path while general signup is disabled.

### 4. Production native push

- Replace the worker's permanent-failure `FcmApnsPushTransport` shell with real FCM/APNS delivery behind `PushPort`.
- Keep credentials out of git; parse multiline private keys safely; preserve invalid-token invalidation, retryable/permanent classification, and history updates.
- Prove one offline direct-message delivery and deep link on physical Android and iOS `production-smoke` builds, or record a platform-specific external credential gate without claiming that platform ready.

### 5. Mobile build profiles and public URLs

- Add `apps/mobile/eas.json` with shared, `staging` internal-distribution, `production-smoke` internal-distribution, and `production` store-distribution profiles. Environment selection is explicit; API URLs are supplied by the build environment, not committed values.
- `EXPO_PUBLIC_API_URL` is build-time public configuration. Staging and `production-smoke` may use their environment's Railway-generated host. The `production` store profile fails before bundling unless its HTTPS/WSS hosts match the approved stable AutoTM-owned domains; localhost, IP literals, and Railway-generated hosts are forbidden there.
- Store credentials and signing material remain in EAS/store credential management, not repository files.
- No EAS Update/self-hosted update URL is configured in this phase. Native and JS/assets ship together in each binary.
- Produce installable Android and iOS staging and `production-smoke` builds for integrated smoke and production confirmation. Validate the `production` profile without submitting it; production store build/submission remains Sprint 12.

### 6. Operations and proof

- Reconcile the deployment and launch runbooks with the two-phase ADR-0039 sequence.
- Document first deploy, repeat deploy, manual production promotion, migration, smoke, rollback, backup/restore, secret rotation, and teardown-at-cutover procedures.
- Run the confirmation pass on Railway production: reviewer auth, listing create/read, rich chat, report → moderation → public enforcement, media, and FCM/APNS delivery.
- Capture timestamps, commit SHA, environment, build identifiers, migration status, smoke result, rollback result, and restore result without copying secrets into git or CI logs.

## Acceptance criteria (DoD)

- [ ] Railway staging and production contain exactly the ADR-0039 service set and use environment-local data services.
- [ ] API, worker, admin, and web build/start from clean Railway builds using checked-in commands/configuration.
- [ ] Required health/readiness gates prevent a bad release from taking traffic; worker boot failure is externally visible in deploy status/logs.
- [ ] `prisma migrate deploy` has one documented release authority and succeeds before code requiring the migration serves traffic.
- [ ] MinIO has one persistent volume, separate private server/public signing endpoints, anonymous GET plus signed PUT only, explicit idempotent bucket bootstrap, routine backups, and checksum-backed restore proof.
- [ ] Staging Serverless sleep follows the approved service boundary and cold-start smoke covers legal pages, auth, WebSocket chat, media reads, and signed uploads; production store-review services remain awake.
- [ ] Staging deploy from `main` waits for the required GitHub Actions check to pass.
- [ ] A deliberately failing CI revision does not deploy to staging.
- [ ] Production cannot autodeploy from a branch; manual procedure deploys the exact staging-proven SHA and records it.
- [ ] Environment matrix is complete and contains names/references only—no credential values.
- [ ] Production has `SMS_DRIVER=mock`, public signup disabled, reviewer bypass enabled, CI OTP response mode disabled, and real `PUSH_TRANSPORT=fcm-apns`.
- [ ] Three to five reserved demo accounts exist with buyer/seller privileges only; at least two distinct accounts complete the rich-chat/report/block scenario.
- [ ] Reviewer bypass tests cover disabled flag, non-reserved numbers, wrong codes, constant-time comparison seam, rate-limit exemption, audit emission, and privilege constraints.
- [ ] Demo seed is idempotent, environment-guarded, and provides deterministic review content without committing credentials.
- [ ] FCM and APNS adapters classify success, invalid token, retryable failure, and permanent failure; worker/history behavior remains tested.
- [ ] Offline direct-message push and conversation deep link are proven on physical Android and iOS `production-smoke` builds, or the blocked platform remains explicitly not-ready.
- [ ] `apps/mobile/eas.json` validates shared, `staging`, `production-smoke`, and `production` profiles; internal builds receive the intended `EXPO_PUBLIC_API_URL` without committed environment values, and the store profile enforces stable approved hosts.
- [ ] No `updates.url` or EAS Update channel is introduced.
- [ ] Android and iOS staging and `production-smoke` binaries install and complete their integrated reviewer smokes; no store submission occurs in S11.
- [ ] Railway production passes reviewer auth → listing → rich chat → report/moderation/enforcement → push confirmation.
- [ ] Rollback restores the prior application revision without an unsafe migration reversal.
- [ ] A non-production Postgres + media restore drill passes and is recorded.
- [ ] Deployment and launch runbooks describe both Railway era and later TM cutover without contradicting ADR-0039.
- [ ] Relevant `CONTEXT.md` files change in the same implementation PRs as routes, env contracts, ports, domain invariants, or package structure.
- [ ] Repository typecheck, lint, tests, runtime-import checks, Expo dependency check, platform exports/builds, and targeted deployment smokes pass as applicable.

## Approved child issue map

The 2026-07-22 batch grill approved this dependency-ordered slicing. GitHub-returned issue numbers replace these local IDs during issue creation.

| ID | Slice | Depends on | Execution mode |
|---|---|---|---|
| S11-01 | Deployable runtime contract: clean images, environment validation, health, and API-owned migration authority | — | AFK |
| S11-02 | MinIO dual-endpoint contract, explicit bootstrap, signed upload, backup tooling | — | AFK |
| S11-03 | Reviewer authentication bypass and durable audit | — | AFK |
| S11-04 | Idempotent reviewer scenario seed, rotation, and revocation | S11-03 | AFK, blocked |
| S11-05 | Real FCM/APNS transport and token-history hygiene | — | AFK |
| S11-06 | EAS profiles, URL gate, Firebase file secret, and OTA-negative proof | — | AFK |
| S11-07 | Staging Postgres, Redis, and persistent MinIO data plane | S11-01, S11-02 | HITL, blocked |
| S11-08 | Staging applications, deploy ordering, Wait-for-CI negative proof, and cold-start smoke | S11-01, S11-07 | HITL, blocked |
| S11-09 | Staging reviewer flow, installable builds, and physical Android/iOS push proof | S11-04, S11-05, S11-06, S11-08 | HITL, blocked |
| S11-10 | Isolated Postgres + media backup/restore drill | S11-02, S11-08 | HITL, blocked |
| S11-11 | Isolated reviewer-production foundation and confirmation gates | S11-08, S11-09, S11-10 | HITL, blocked |
| S11-12 | Exact-SHA production promotion, previous-SHA rollback, and production-smoke confirmation | S11-11 | HITL, blocked |
| S11-13 | Runbook reconciliation, evidence manifest, and sprint closeout proof | S11-09, S11-10, S11-12 | HITL, blocked |

The initial unblocked queue is S11-01, S11-02, S11-03, S11-05, and S11-06. Provisioning, credentials, physical devices, production promotion, domain/DNS work, and store actions remain human gates. Issue creation does not authorize any of them.

## Files likely created / touched

```text
.github/workflows/*
railway/*.json
infra/docker/*
apps/api/src/common/*health*
apps/api/src/env.schema.ts
apps/api/.env.template
apps/api/src/modules/identity/*
apps/api/src/modules/identity/CONTEXT.md
apps/api/CONTEXT.md
apps/worker/src/env.schema.ts
apps/worker/src/push/*
apps/worker/.env.template
apps/worker/CONTEXT.md
apps/admin/src/app/healthz/*
apps/admin/.env.template
apps/admin/CONTEXT.md
apps/web/src/app/healthz/*
apps/web/.env.template
apps/web/CONTEXT.md
apps/mobile/eas.json
apps/mobile/app.json
apps/mobile/.env.template
apps/mobile/CONTEXT.md
packages/db/src/seed* or scripts/reviewer-demo*
packages/db/CONTEXT.md
docs/prd/ops/80-deployment-runbook.md
docs/prd/ops/84-launch-plan.md
docs/prd/sprints/sprint-11-railway-deployment.md
docs/prd/03-roadmap.md (only when the approved sprint starts)
```

## Risks and rabbit holes

- **Migration race:** independently deploying API and worker against a changing schema can start new code too early. Use one release authority and expand/contract-safe migrations; do not hide the race behind retries.
- **Monorepo build context:** Railway service root directories can omit shared workspaces/config. Prefer an explicit root build context and service-specific commands/config paths proven from clean builds.
- **MinIO durability/public URL:** object bytes need persistent storage, a private server endpoint, a public signing/read endpoint, anonymous GET plus signed PUT only, backup, and restore proof; container health alone is insufficient.
- **Build-time URL drift:** `EXPO_PUBLIC_*` values are embedded in binaries. A wrong production API host requires another binary and store review.
- **Reviewer bypass exposure:** multiple accounts enlarge a permanent auth bypass. Keep the account set narrow, unissueable, audited, flag-gated, non-admin, and secret-managed.
- **Push credential asymmetry:** Android may pass before APNS credentials exist (or vice versa). Do not call the sprint ready while one required platform is unproven.
- **Dashboard-only drift:** Railway settings changed manually can diverge from docs. Version what the provider supports and capture the irreducible manual settings in a verification checklist.
- **False rollback confidence:** application rollback does not reverse forward-only migrations. Drill compatible rollback and restore separately.

## No-gos

- No real users, public signup, real TM SMS, `sms-gateway`, or `phone-agent` in Railway.
- No store submission, public launch, store-account purchasing, domain purchasing, or DNS mutation without explicit founder action.
- No self-hosted OTA, EAS Update rollout, `updates.url`, or TM-era update server.
- No TM hardware deployment, Railway production teardown, or DNS cutover to TM.
- No new marketplace feature bet, S9b concierge execution, or issue #262 scope.
- No CI migration to Railway; GitHub Actions remains the gate.
- No secrets, reviewer credentials, private keys, tokens, or provider-generated connection strings in git, issue bodies, screenshots, or handoffs.
- No aspirational `CONTEXT.md` edits before implementation ships.

## System-design review

**Approved design score: 9/10.** The batch grill resolved migration authority, per-service repository-root Railway configuration, health/readiness, MinIO durability and dual endpoints, service-specific secrets, reviewer auth/audit, real FCM/APNS delivery, EAS profiles, exact-SHA promotion, rollback, and dependency slicing. It reaches 10/10 only after live staging/production evidence measures cold starts and restore/rollback behavior, proves physical Android + iOS push, and validates stable production domains and credentials.

## References

- [ADR-0039 — phased cloud-first hosting](../../adr/0039-phased-cloud-first-hosting.md)
- [ADR-0030 — reviewer demo-account OTP bypass](../../adr/0030-reviewer-demo-account-otp-bypass.md), amended in account-count scope by ADR-0039
- [ADR-0004 — migrations](../../adr/0004-migrations.md)
- [ADR-0005 — TM hosting](../../adr/0005-hosting.md), the later cutover target
- [ADR-0019 — CONTEXT describes current state](../../adr/0019-context-md-describes-current-state.md)
- [ADR-0020 — document hierarchy and mutability](../../adr/0020-document-hierarchy-and-mutability.md)
- [Deployment runbook](../ops/80-deployment-runbook.md)
- [Launch plan](../ops/84-launch-plan.md)
- [Roadmap](../03-roadmap.md)
- [CONTEXT map](../../../CONTEXT-MAP.md)
- [Library-documentation workflow](../../agents/documentation-lookups.md)
