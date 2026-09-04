# Issue 278 — Staging Applications, Deploy Ordering, CI Gate, and Cold Start

Secret-free evidence for GitHub issue
[#278](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/278), the
human-operated Railway staging application slice: deploy `api`, `worker`,
`admin`, and `web` in the approved order, prove staging waits for the required
GitHub Actions check including a deliberate negative case, and exercise the
approved Serverless sleep / cold-start boundary without weakening readiness.

Do not paste secret values, connection strings, access keys, JWT or TOTP
secrets, reviewer codes, FCM/APNS credentials, dashboard screenshots
containing values, or provider logs containing secret values into this file,
GitHub issues, PRs, or chat. Record names, service identifiers, deployment
identifiers, commit SHAs, variable names, timestamps, command names, and
pass/fail results only.

## Context

| Field | Value |
|---|---|
| Evidence status | **In progress** — service shells and deploy settings applied; sources, variables, deploys, negative-CI, and cold start pending |
| Environment | `staging` |
| Railway workspace | `eff4b459-402e-4e63-8fe4-8cc24b97e578` |
| Railway project | `auto-tm` (`176ddec0-dd65-4087-b82c-798599fc2ebe`) |
| Railway environment id | `652abc79-fdb0-48b0-9f6c-ad0ff572d7b2` |
| Deployed commit SHA | _pending — record the exact `main` SHA each service builds from_ |
| Founder/operator selection reference | Codex task instruction to implement issue #278 on 2026-09-05 |
| Operator | Founder-authorized agent Railway session `railway-skill-20260905-issue278` |
| Human verifier | _pending_ |
| Verification started at | `2026-09-04T21:12:00Z` |
| Verification completed at | _pending_ |

## Prerequisites

- [x] Issue #271 is closed: deployable runtime and migration contract exists.
- [x] Issue #277 is closed: staging data plane exists
      (`docs/prd/ops/evidence/issue-277-staging-data-plane.md`).
- [x] Current Railway docs checked through Context7: `/railwayapp/docs`.
- [x] Founder/operator explicitly selected issue #278 before any mutation.
- [x] Railway project is the ADR-0039 project with exactly `staging` and
      `production` environments.

## Application Services

| Service | Provider id | Role |
|---|---|---|
| `api` | `6db6f1b1-5c7a-4033-88d0-53f5f315bfc0` | HTTP API + WebSocket; sole migration authority |
| `worker` | `24aa02e0-25a9-4e80-9cc2-c1795ef82091` | Background jobs + push delivery |
| `admin` | `69ba9f86-0000-4460-8165-de69b289b36e` | Next.js admin console |
| `web` | `f3c5888b-d303-44b1-bc6e-3d775dad4639` | Next.js public site |

Services were created as empty shells with no source attached, so that
variables and deploy settings could be configured before any build ran.

## Provider-Side Deploy Settings

Railway rejects the repo's `railway/*.json` config-as-code files: the live API
returns *"Config as Code (railway.json / railway.toml) is deprecated. Use
Infrastructure as Code (.railway/railway.ts) instead."* Its replacement covers
neither Dockerfile builds nor pre-deploy commands, so AutoTM applies deploy
settings provider-side and keeps `railway/*.json` as the declared contract.
Locked in [ADR-0044](../../../adr/0044-railway-deploy-settings-live-provider-side.md).

Applied through `serviceInstanceUpdate` and read back with
`get-service-config`. All four confirmed at `2026-09-04T21:20Z`.

| Setting | `api` | `worker` | `admin` | `web` |
|---|---|---|---|---|
| `rootDirectory` | `/` | `/` | `/` | `/` |
| `builder` | `DOCKERFILE` | `DOCKERFILE` | `DOCKERFILE` | `DOCKERFILE` |
| `dockerfilePath` | `infra/docker/api.Dockerfile` | `infra/docker/worker.Dockerfile` | `infra/docker/admin.Dockerfile` | `infra/docker/web.Dockerfile` |
| `preDeployCommand` | `pnpm --filter @auto-tm/db migrate:deploy` | — | — | — |
| `startCommand` | `node dist/src/main.js` | `node dist/main.js` | `node apps/admin/server.js` | `node apps/web/server.js` |
| `healthcheckPath` | `/readyz` | — (no public route) | `/healthz` | `/healthz` |
| `healthcheckTimeout` | `120` | — | `120` | `120` |
| `restartPolicyMaxRetries` | `5` | `5` | `5` | `5` |
| `sleepApplication` | `true` | `false` | `true` | `true` |

- [x] Settings match the declared contract in `railway/api.json`,
      `railway/worker.json`, `railway/admin.json`, `railway/web.json`.
- [x] `api` is the only service with a pre-deploy migration command.
- [x] `worker` has no healthcheck path; a boot failure must surface as a
      non-zero exit and a failed deploy, not a silently degraded replica.

## Service Sources and Deploy Triggers

- [ ] Each service's source is the `bagtyyarkovusov/auto.tm-rewrite` GitHub
      repository with root directory `/`.
- [ ] Trigger branch is `main` for all four services.
- [ ] **Wait for CI** is enabled so a Railway deployment is created only after
      the required GitHub Actions check succeeds.
- [ ] Required check name recorded: _pending_ (workflow `CI`, job `build`,
      `.github/workflows/ci.yml`, self-hosted `tm-proxy` runner).
- [ ] Production has no branch autodeploy (verified unchanged by this slice).

## Environment Variables

Names and sources only. Values are never recorded here. The full checked-in
contract is the environment matrix in [`railway/README.md`](../../../../railway/README.md);
this section records that each name was actually set in staging.

`R` = Railway reference, `G` = generated per environment, `F` = fixed literal.

| Variable | Services | Kind | Set |
|---|---|---|---|
| `APP_ENV` (`staging`) | `api`, `worker` | F | [ ] |
| `NODE_ENV` (`production`) | `api`, `worker` | F | [ ] |
| `DATABASE_URL` | `api`, `worker` | R `${{Postgres.DATABASE_URL}}` | [ ] |
| `REDIS_URL` | `api`, `worker` | R `${{Redis.REDIS_URL}}` | [ ] |
| `MINIO_ENDPOINT` | `api`, `worker` | R private MinIO S3 origin | [ ] |
| `MINIO_PUBLIC_URL` | `api` | F public S3 endpoint | [ ] |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | `api`, `worker` | R MinIO root credentials | [ ] |
| `MINIO_REGION` (`us-east-1`) | `api`, `worker` | F | [ ] |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `api` | G, distinct from each other | [ ] |
| `TOTP_SECRET_ENCRYPTION_KEY` | `api` | G, 32-byte base64 | [ ] |
| `SMS_DRIVER` (`mock`) | `api` | F | [ ] |
| `SOCKET_IO_CORS_ORIGIN` | `api` | F explicit origin list | [ ] |
| `PUSH_TRANSPORT` | `worker` | F — see push contract below | [ ] |
| `FCM_*` / `APNS_*` | `worker` | H — see push contract below | [ ] |
| `NEXT_PUBLIC_API_URL` | `admin`, `web` | R API public domain | [ ] |
| `NEXT_PUBLIC_MINIO_PUBLIC_URL` | `admin`, `web` | F public S3 endpoint | [ ] |
| `SESSION_SECRET` | `admin` | G | [ ] |

Fail-closed checks that must hold in staging (enforced by
`apps/api/src/env.schema.ts` and `apps/worker/src/env.schema.ts` at boot):

- [ ] `SIGNUPS_ENABLED=false`.
- [ ] `SMS_DRIVER=mock`; `OTP_TEST_MODE` and `OTP_TEST_CODE_RESPONSE` unset or
      `false`.
- [ ] `REVIEW_DEMO_ACCOUNT_ENABLED` unset or `false` (reviewer accounts are
      #279 / S11-09 scope, not this slice).
- [ ] No data endpoint is a loopback host.
- [ ] No staging variable references a production resource.
- [ ] `MINIO_ENDPOINT` and `MINIO_PUBLIC_URL` are distinct hosts.

## Deploy Ordering

Order is `api` → `worker` → `admin` → `web`. The API pre-deploy migration must
complete and the API must pass `/readyz` before any other service is deployed,
so nothing serves code that requires an unapplied migration.

| Step | Service | Deployment id | Commit SHA | Started | Settled | Result |
|---|---|---|---|---|---|---|
| 1 | `api` | _pending_ | | | | [ ] |
| 2 | `worker` | _pending_ | | | | [ ] |
| 3 | `admin` | _pending_ | | | | [ ] |
| 4 | `web` | _pending_ | | | | [ ] |

- [ ] API `preDeployCommand` ran `prisma migrate deploy` and exited zero before
      the API revision took traffic.
- [ ] API `/readyz` returned `200` with bounded Postgres + Redis + MinIO checks.
- [ ] `/healthz` on `api`, `admin`, and `web` reports the same `commitSha` as
      the deployed revision and `environment` = `staging`.
- [ ] `worker`, `admin`, and `web` were deployed only after API readiness.
- [ ] All four builds are clean Railway builds tied to the recorded SHA.

## Worker Push Contract — Fail-Visible Proof

Acceptance requires that the worker **visibly fails** on an incomplete
production-like push contract rather than degrading silently.
`apps/worker/src/env.schema.ts` rejects `PUSH_TRANSPORT=fcm-apns` with any of
`FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `APNS_KEY_ID`,
`APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION`
missing, and rejects an unparseable PEM in either private-key variable.

Negative proof:

- [ ] `PUSH_TRANSPORT` set to `fcm-apns` with the credential set deliberately
      incomplete.
- [ ] Worker deploy **fails or crashes** — deployment id: _pending_.
- [ ] Deploy logs name the missing variables and contain no secret values.

Settled state:

- [ ] Worker returned to its intended staging push transport — value recorded
      here once decided.
- [ ] Worker deploy succeeds and stays running.

## GitHub Actions CI Gate

### Positive case

- [ ] A passing `main` revision produced a staging deployment.
- [ ] Commit SHA: _pending_. CI run id: _pending_. Deployment id: _pending_.

### Negative case

A revision on `main` whose required check fails must not produce a staging
deployment.

- [ ] Deliberately failing revision pushed to `main`. Commit SHA: _pending_.
- [ ] GitHub Actions run concluded `failure`. Run id: _pending_.
- [ ] No Railway staging deployment was created for that SHA — verified by
      listing deployments for the environment and confirming the SHA is absent.
- [ ] The previously deployed revision remained live and healthy throughout.
- [ ] `main` restored to a passing state. Restoring commit SHA: _pending_.

## Serverless Sleep Boundary

Approved staging boundary (sprint-11 §51): sleep is allowed for `api`,
`admin`, and `web`. `Postgres`, `Redis`, and `worker` stay awake. MinIO sleep
is enabled only after separate persistence and wake proof, which is not part
of this slice.

| Service | Sleep expected | Applied | Verified |
|---|---|---|---|
| `api` | enabled | `true` | [ ] |
| `admin` | enabled | `true` | [ ] |
| `web` | enabled | `true` | [ ] |
| `worker` | disabled | `false` | [ ] |
| `Postgres` | disabled | — | [ ] |
| `Redis` | disabled | — | [ ] |
| `MinIO` | disabled (deferred) | — | [ ] |

- [ ] Readiness was not weakened to accommodate sleep: `/readyz` still runs
      bounded Postgres + Redis + MinIO checks and still gates traffic.

## Cold-Start Smoke

Run after all services are asleep, so each check exercises a wake.

| # | Check | Observed | Result |
|---|---|---|---|
| 1 | Legal pages served from cold `web` | | [ ] |
| 2 | Reviewer auth against cold `api` | | [ ] |
| 3 | WebSocket chat connect + message exchange | | [ ] |
| 4 | Media read from MinIO public endpoint | | [ ] |
| 5 | Signed upload PUT via API-issued URL | | [ ] |

- [ ] Wake latency recorded per check and judged acceptable for staging.
- [ ] No check required disabling or loosening a health gate.
- [ ] Chat reconnect after an API wake did not drop or duplicate messages.

## Secret Hygiene

- [ ] No secret values appear in this file.
- [ ] No secret values were printed to a terminal, issue comment, PR, or chat.
- [ ] Variable listing commands that render values were avoided; only names
      and reference expressions were recorded.
- [ ] No provider log excerpt containing a secret value was copied anywhere.

## Out of Scope

Production deploys, EAS builds, physical-device push, public users, DNS, store
submission, and TM cutover. Reviewer scenario seeding is #279 / S11-09.

## References

- [ADR-0039 — phased cloud-first hosting](../../../adr/0039-phased-cloud-first-hosting.md)
- [ADR-0044 — Railway deploy settings live provider-side](../../../adr/0044-railway-deploy-settings-live-provider-side.md)
- [Sprint 11 — Railway deployment](../../sprints/sprint-11-railway-deployment.md)
- [80 — Deployment runbook](../80-deployment-runbook.md)
- [Issue 277 — staging data plane evidence](issue-277-staging-data-plane.md)
- [`railway/README.md`](../../../../railway/README.md)
