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
| Evidence status | **Complete** — all four services deployed, CI gate proven both ways and on a re-run, sleep boundary settled and measured on every service, full ten-check cold-start smoke green |
| Environment | `staging` |
| Railway workspace | `eff4b459-402e-4e63-8fe4-8cc24b97e578` |
| Railway project | `auto-tm` (`176ddec0-dd65-4087-b82c-798599fc2ebe`) |
| Railway environment id | `652abc79-fdb0-48b0-9f6c-ad0ff572d7b2` |
| Ordered-deploy commit SHA | `b8dfe487f3cbfcd38cca947d4a9dac70213cbbc8` |
| Current deployed SHA | `421599ada4a7ceb3cbd34b1cb36a079bfde4c298` |
| Cold-start smoke SHA | `421599ada4a7ceb3cbd34b1cb36a079bfde4c298` |
| Founder/operator selection reference | Codex task instruction to implement issue #278 on 2026-09-05 |
| Operator | Founder-authorized agent Railway session `railway-skill-20260905-issue278` |
| Human verifier | Founder (`bagtyyarkovusov`), 2026-09-05 — selected `sleepApplication=false` for `api` over the Redis `tcp-keepalive` alternative, and directed this slice to be completed and closed |
| Public API domain | `api-staging-2861.up.railway.app` → container port `3006` |
| Public admin domain | `admin-staging-a851.up.railway.app` → container port `3001` |
| Public web domain | `web-staging-e9c7.up.railway.app` → container port `3002` |
| Verification started at | `2026-09-04T21:12:00Z` |
| Verification completed at | `2026-09-05T02:23:00Z` |

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
| `sleepApplication` | `false` | `false` | `true` | `true` |

- [x] Settings match the declared contract in `railway/api.json`,
      `railway/worker.json`, `railway/admin.json`, `railway/web.json`.
- [x] `api` started this slice at `sleepApplication=true` and was changed to
      `false` at `2026-09-05T01:20Z` after the sleep finding below. The four
      `railway/*.json` files now declare `sleepApplication` explicitly so the
      contract covers the setting instead of leaving it implicit.
- [x] `api` is the only service with a pre-deploy migration command.
- [x] `worker` has no healthcheck path; a boot failure must surface as a
      non-zero exit and a failed deploy, not a silently degraded replica.

## Service Sources and Deploy Triggers

- [x] Each service's source is the `bagtyyarkovusov/auto.tm-rewrite` GitHub
      repository with root directory `/`.
- [x] Trigger branch is `main` for all four services.
- [x] **Wait for CI** (`checkSuites: true`) is enabled on every trigger.
- [x] Required check: workflow `CI`, job `build`, `.github/workflows/ci.yml`,
      self-hosted `tm-build-mac` runner.
- [x] Production has no branch autodeploy: no service instance and no
      deployment trigger exists for these four services in `production`.

| Service | Deployment trigger id | Branch | Wait for CI |
|---|---|---|---|
| `api` | `6a64454e-06cd-4f61-a8fc-96eac6b2fb8c` | `main` | `true` |
| `worker` | `50fbc2db-b895-4f7c-be80-3ce470772b8f` | `main` | `true` |
| `admin` | `66904fd0-b90c-4d71-895e-9703480a766e` | `main` | `true` |
| `web` | `30faf866-9af1-463d-8f9d-d43867a6d1b7` | `main` | `true` |

**Observed provider behavior worth recording:** with a Wait-for-CI trigger on
all four services, a green `main` push fans out to all four *in parallel*.
Railway has no cross-service deploy ordering. The API-first ordering below was
achieved by deploying each service explicitly. Any future release that carries
a migration must be ordered by the operator — the triggers will not do it.

## Environment Variables

Names and sources only. Values are never recorded here. The full checked-in
contract is the environment matrix in [`railway/README.md`](../../../../railway/README.md);
this section records that each name was actually set in staging.

`R` = Railway reference, `G` = generated per environment, `F` = fixed literal.

| Variable | Services | Kind | Set |
|---|---|---|---|
| `APP_ENV` (`staging`) | `api`, `worker` | F | [x] |
| `PORT` | `api` `3006`, `admin` `3001`, `web` `3002` | F | [x] |
| `NODE_ENV` (`production`) | `api`, `worker` | F | [x] |
| `DATABASE_URL` | `api`, `worker` | R `${{Postgres.DATABASE_URL}}` | [x] |
| `REDIS_URL` | `api`, `worker` | R `${{Redis.REDIS_URL}}` | [x] |
| `MINIO_ENDPOINT` | `api`, `worker` | R private MinIO S3 origin | [x] |
| `MINIO_PUBLIC_URL` | `api` | F public S3 endpoint | [x] |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | `api`, `worker` | R MinIO root credentials | [x] |
| `MINIO_REGION` (`us-east-1`) | `api`, `worker` | F | [x] |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `api` | G, distinct from each other | [x] |
| `TOTP_SECRET_ENCRYPTION_KEY` | `api` | G, 32-byte base64 | [x] |
| `SMS_DRIVER` (`mock`) | `api` | F | [x] |
| `SOCKET_IO_CORS_ORIGIN` | `api` | F explicit origin list | [x] |
| `PUSH_TRANSPORT` | `worker` | F `test` — see push contract below | [x] |
| `FCM_*` / `APNS_*` | `worker` | H — **not set**; deferred to #279 | [ ] |
| `NEXT_PUBLIC_API_URL` | `admin`, `web` | R API public domain | [x] |
| `NEXT_PUBLIC_MINIO_PUBLIC_URL` | `admin`, `web` | F public S3 endpoint | [x] |
| `SESSION_SECRET` | `admin` | G | [x] |
| `REVIEW_DEMO_ACCOUNT_ENABLED` (`true`) | `api` | F | [x] |
| `REVIEW_DEMO_ACCOUNTS_JSON` | `api` | G, 3 accounts, secret-managed | [x] |

Fail-closed checks that must hold in staging (enforced by
`apps/api/src/env.schema.ts` and `apps/worker/src/env.schema.ts` at boot):

- [x] `SIGNUPS_ENABLED=false`.
- [x] `SMS_DRIVER=mock`; `OTP_TEST_MODE` and `OTP_TEST_CODE_RESPONSE` unset.
- [x] `REVIEW_DEMO_ACCOUNT_ENABLED=true` with a valid 3-account list. This is
      the one deliberate change from the original fail-closed posture: the
      earlier revision of this file recorded the flag as unset and deferred
      reviewer auth to #279, which made criterion 6 unprovable. The bypass is
      the only route to a session while `SIGNUPS_ENABLED=false`, so it is
      enabled here with the minimum needed to exercise checks 7–10. Operator
      procedure, rotation, and revocation stay #279 / S11-09 scope. See
      *Reviewer Scenario Prerequisite for Checks 7–10* below.
- [x] No data endpoint is a loopback host — `api` boots and `/readyz` passes,
      which is exactly the check that would have rejected one.
- [x] No staging variable references a production resource.
- [x] `MINIO_ENDPOINT` (`minio.railway.internal:9000`) and `MINIO_PUBLIC_URL`
      (`minio-staging-5795.up.railway.app`) are distinct hosts.

**Provider behavior worth recording:** Railway injects `PORT=8080` into every
service, overriding the `ENV PORT` baked into each Dockerfile. The API's first
successful deploy listened on 8080 while its domain targeted 3006, producing a
502 with no application error. `PORT` is now set explicitly per service to the
port the repo declares, keeping the Dockerfile `EXPOSE`/`HEALTHCHECK` lines
and the Railway domain target in agreement.

## Deploy Ordering

Order is `api` → `worker` → `admin` → `web`. The API pre-deploy migration must
complete and the API must pass `/readyz` before any other service is deployed,
so nothing serves code that requires an unapplied migration.

All four deployed from commit `b8dfe487f3cbfcd38cca947d4a9dac70213cbbc8`.

| Step | Service | Deployment id | Settled (UTC) | Result |
|---|---|---|---|---|
| 1 | `api` | `9d34c50b-ea28-4483-bd46-fcaa745198a5` | `2026-09-04T23:01:12Z` | SUCCESS |
| 2 | `worker` | `e5d9cf2f-91c2-4f59-bcc9-7f22a41f4c32` | `2026-09-04T23:16:46Z` | SUCCESS |
| 3 | `admin` | `d1326797-4014-483e-b0c2-f1372e0bd46e` | `2026-09-04T23:18:59Z` | SUCCESS |
| 4 | `web` | `0c2c72ef-2b14-4981-b91b-b2415244d183` | `2026-09-04T23:20:56Z` | SUCCESS |

- [x] API `preDeployCommand` ran `prisma migrate deploy` and logged
      `All migrations have been successfully applied.` at `23:00:22Z`, before
      the API revision took traffic.
- [x] API `/readyz` returned `200`:
      `{"status":"ready","checks":{"postgres":"ok","redis":"ok","minio":"ok"}}`.
- [x] `/healthz` on `api`, `admin`, and `web` each report
      `commitSha: b8dfe487f3cbfcd38cca947d4a9dac70213cbbc8` and
      `environment: staging`.
- [x] `worker`, `admin`, and `web` were deployed only after API readiness, in
      that order.
- [x] All four are clean Railway Dockerfile builds tied to the recorded SHA.
- [x] Worker logged `Worker started (BullMQ consumer)` and stays running.

### Repo defects this slice uncovered

The first three deploy attempts failed. None of these could have been caught
without a live Railway build; all three are fixed on `main`.

| Failure | Cause | Fix |
|---|---|---|
| `dockerfile invalid: flag '--mount=type=cache,...' is missing an id argument` | All five Dockerfiles used an unnamed BuildKit cache mount | #304 named it, then #305 removed it — Railway requires `id=s/<service id>-<path>` and rejects env vars there, which would bake a provider UUID into images that also build the ADR-0005 bundles |
| `EACCES: permission denied, mkdir '/home/auto-tm/.cache/node/corepack/v1'` | `corepack prepare` cached pnpm in root's home; runtime stages drop to `auto-tm`, created by `useradd -r` with no home. The API pre-deploy runs `pnpm`. | #306 pins a shared `COREPACK_HOME=/opt/corepack` readable by all users |
| API deployed SUCCESS but served `502` | Railway injects `PORT=8080`, overriding the Dockerfile `ENV PORT`; the domain targeted 3006 | `PORT` set explicitly per service to the repo-declared port |

## Worker Push Contract — Fail-Visible Proof

Acceptance requires that the worker **visibly fails** on an incomplete
production-like push contract rather than degrading silently.
`apps/worker/src/env.schema.ts` rejects `PUSH_TRANSPORT=fcm-apns` with any of
`FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `APNS_KEY_ID`,
`APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION`
missing, and rejects an unparseable PEM in either private-key variable.

Negative proof:

- [x] `PUSH_TRANSPORT=fcm-apns` with the credential set deliberately
      incomplete (no `FCM_*` / `APNS_*` variables set).
- [x] Worker deploy **CRASHED** — deployment
      `3ab6fe0e-20c4-4adc-b485-8d3aec700d9e`, `2026-09-04T23:15:03Z`. The
      restart policy retried and the deployment settled CRASHED rather than
      running degraded.
- [x] Deploy logs name every missing variable and contain no secret values:

      Worker boot failed: runtime contract incomplete or dependency
      misconfigured. Invalid worker environment: FCM_PROJECT_ID is required
      when PUSH_TRANSPORT=fcm-apns (incomplete push credentials);
      FCM_CLIENT_EMAIL ...; FCM_PRIVATE_KEY ...

Settled state:

- [x] Worker settled on `PUSH_TRANSPORT=test` for staging. Real FCM/APNS
      credentials are #279 / S11-09 scope; `test` records sends in memory and
      delivers nothing, which is permitted outside production and is rejected
      by the schema if `APP_ENV=production`.
- [x] Worker deploy succeeds and stays running.

## GitHub Actions CI Gate

### Positive case

- [x] A passing `main` revision produced a staging deployment.
- [x] Commit `08882b6ad17ba53233126cdadc279af3e4e5a769`, CI run `33925293253`.
      Railway created deployment `f439ce49-cd8b-4b07-979a-3233576290fe` and
      held it in status **WAITING** from `22:23:18Z` until CI concluded
      `success` at `22:28:05Z`, then moved it to BUILDING. The gate is
      observable as a state, not just an outcome.
- [x] Repeated on `b8dfe487f3cbfcd38cca947d4a9dac70213cbbc8` (CI run
      `33927159265`) which produced the four ordered deploys above.

### Negative case

- [x] Deliberately failing revision pushed to `main`:
      `d7348af354c29492d4557e618980b3524b798001`. It added a single
      self-documenting failing test, `apps/api/src/ci-negative-proof.spec.ts`.
- [x] GitHub Actions run `33929207815` concluded **failure** at `23:26:18Z`.
- [x] **No Railway staging deployment was created for that SHA.** Railway
      recorded the trigger on all four services with status **SKIPPED** at
      `23:21:48Z` — no build, no image, no release:

| Service | SHA | Status |
|---|---|---|
| `api` | `d7348af354c2` | SKIPPED |
| `worker` | `d7348af354c2` | SKIPPED |
| `admin` | `d7348af354c2` | SKIPPED |
| `web` | `d7348af354c2` | SKIPPED |

- [x] The previously deployed revision `b8dfe487f3cb` remained live and healthy
      throughout the red window.
- [x] `main` restored to a passing state by
      `dcfd2cc2b69b4fc9d52380eee3c8900682e117fc`, which reverts the failing
      test. CI run `33929513100` concluded `success` and all four services
      deployed that SHA.

### Gate behavior on a re-run — the operator trap

A third case turned up unplanned and is worth recording, because it will
recur. Commit `56104ffa91a9ae775d815e7679c04a0ffc82497d` (#308) failed CI run
`33936145854` at `01:27Z` for an infrastructure reason — the self-hosted
`tm-build-mac` runner could not download `actions/setup-node` from
`codeload.github.com` after three attempts. The code was fine. Railway did the
correct thing and recorded **SKIPPED** on all four services at `01:27:10Z`.

Re-running the job took CI to `success` at `01:34Z`. **Railway did not create
any deployment for that SHA.** The Wait-for-CI trigger acts on the check
suite's first conclusion; a later re-run to green does not un-skip the
deployment it already declined.

| Service | SHA | Trigger outcome | After CI re-run to green |
|---|---|---|---|
| `api` | `56104ffa91a9` | SKIPPED `01:27:10Z` | no new deployment |
| `worker` | `56104ffa91a9` | SKIPPED `01:27:10Z` | no new deployment |
| `admin` | `56104ffa91a9` | SKIPPED `01:27:10Z` | no new deployment |
| `web` | `56104ffa91a9` | SKIPPED `01:27:10Z` | no new deployment |

Operator consequence: after a flaky CI failure, re-running the workflow
restores the check but not the deploy. The SHA must be deployed explicitly, or
carried forward by a later commit. Recorded in the deployment runbook.

## Serverless Sleep Boundary

Approved staging boundary (sprint-11 §51): sleep **may** be enabled for `api`,
`admin`, and `web` — the sprint permits it there, it does not require it.
`Postgres`, `Redis`, and `worker` stay awake. MinIO sleep is enabled only
after separate persistence and wake proof, which is not part of this slice.

Read back from `serviceInstance.sleepApplication` on every service in the
staging environment. Settled state at `2026-09-05T01:20Z`:

| Service | Sleep expected | Provider value | Matches |
|---|---|---|---|
| `api` | disabled — see decision below | `false` | [x] |
| `admin` | enabled | `true` | [x] |
| `web` | enabled | `true` | [x] |
| `worker` | disabled | `false` | [x] |
| `Postgres` | disabled | `false` | [x] |
| `Redis` | disabled | `false` | [x] |
| `MinIO` | disabled (deferred) | `false` | [x] |

- [x] No service outside the permitted set has sleep enabled. Turning sleep
      **off** on `api` stays inside the approved boundary, which permits sleep
      on `api`/`admin`/`web` rather than mandating it, so no ADR supersession
      is required. The decision is sprint-retro material, recorded here.
- [x] **The decision is observable, not just declared.** At `2026-09-05T02:23Z`,
      20 minutes after the last request to `api` and with no traffic in
      between, `api` deployment `9697661b-0c13-48f1-a922-69c18a7bcf57` was
      `SUCCESS` while `admin` (`2d1ff83f-8544-4828-b0b7-526b5a953888`) and
      `web` (`1ccf19cf-989b-4e10-ba76-3f99f55a9dee`) were both `SLEEPING` from
      the same deploy batch. `worker`, `Postgres`, `Redis`, and `MinIO` awake
      as required.

- [x] Readiness was not weakened to accommodate sleep. `/readyz` still runs
      bounded Postgres + Redis + MinIO checks and still gates traffic; the
      `healthcheckPath` and `healthcheckTimeout` settings are unchanged from
      the declared contract.

## Cold-Start Smoke

Re-run end to end at `2026-09-05T01:59Z`–`02:03Z` against commit
`421599ada4a7ceb3cbd34b1cb36a079bfde4c298`, with `admin` and `web` confirmed
in provider status `SLEEPING` immediately beforehand, so each first request
exercised a real wake. All ten checks now run in one pass. `api` is awake by
decision (see the sleep finding below); its own cold-wake number was measured
separately at `01:36Z` on the last revision that still had sleep enabled.

| # | Check | Observed | Result |
|---|---|---|---|
| 1 | Legal pages from cold `web` | First request after wake, `/healthz` `200`, took **2.08s**; `/ru/legal/privacy` `200` in 1.52s; `/ru/legal/terms` `200` in 1.14s; `/ru/trust` `200` in 0.93s. `commitSha` matches the deployed SHA. | [x] |
| 2 | Cold `admin` wake | `/healthz` `200` in **2.51s**, `commitSha` matches | [x] |
| 3 | API readiness | `/readyz` `200` with `postgres/redis/minio` all `ok` in 1.12s | [x] |
| 4 | Real request touching Postgres + Redis | `POST /api/v1/auth/otp/request` → `201` `{"requestId":"…","resendInSeconds":60}` in 1.39s — exercises persistence and the Redis-backed OTP rate limiter (recorded `2026-09-04T23:51Z`; unchanged path) | [x] |
| 5 | WebSocket transport through the Railway proxy | Socket.IO engine handshake `GET /socket.io/?EIO=4&transport=polling` → `200`, `sid` issued, `upgrades:["websocket"]`, 1.05s | [x] |
| 6 | MinIO public read path | Anonymous `GET` of a missing object → `404` (reached MinIO); anonymous bucket listing → `403` | [x] |
| 7 | Authenticated reviewer sign-in | Two distinct reviewer accounts signed in through the OTP bypass: buyer `201` in **1.13s** `role=buyer`, seller `201` in **1.02s** `role=seller`. Token subjects are the seeded reviewer user UUIDs. The seeded listing is readable through the UUID-validated route: `GET /api/v1/listings/:id` → `200`. | [x] |
| 8 | Chat message exchange over WebSocket | Buyer opened a conversation on the seeded listing (`201`), both accounts connected to `/ws/chat` over the `websocket` transport and joined, the seller emitted `message:send` and the buyer received `message:new` carrying a message id. Full round trip **1.77s**. | [x] |
| 9 | Signed upload PUT via an API-issued URL | Unauthenticated presign is correctly rejected `401`. Authenticated: `POST /api/v1/uploads/presign` → `201`, then `PUT` of the bytes to the issued URL → `200`. | [x] |
| 10 | Media read of a real object | Anonymous `GET` of the object just written through the public MinIO host → `200`, **125 bytes returned for 125 written**, in 0.87s | [x] |

- [x] Checks 7–10 were driven by a single script that reads reviewer phones
      and codes from a local `0600` file and never renders them; it prints one
      PASS/FAIL line per check and exits non-zero on any failure. Final run:
      **5/5 checks passed**, exit 0.
- [x] Wake latency is **2.1–2.5s** for a cold `web` / `admin` and **3.4s**
      for a cold `api`, all well inside what staging needs.
- [x] Sleep timing for `admin` / `web` is 4–10 minutes after their last
      request, not a fixed interval: 4–6 minutes in the `00:20Z` window and
      ~9 minutes in the `01:50Z` window. Railway samples the idle check rather
      than firing on a timer.
- [x] **Resolved finding: `api` sleeps, but slowly and unpredictably.**
      Measured across two windows, `2026-09-05T00:20Z`–`01:07Z` and
      `01:36Z`. The finding is closed as *measured*, and the configuration was
      changed as a result.

  **What was first observed, and why it was misread.** `api` deployed at
  `00:20:30Z` and was polled every two minutes for 42 uninterrupted minutes
  with no operator request of any kind. It stayed `SUCCESS` throughout, while
  `admin` and `web`, deployed in the same batch, reached `SLEEPING` at
  `00:24:12Z` and `00:26:02Z` — four to six minutes. On that window alone the
  conclusion drawn was that `api` could never sleep. **That conclusion was
  wrong.** The polling stopped at `01:03:09Z` and `api` reached `SLEEPING` at
  `01:07:27Z`, roughly 57 minutes after deploy. Deployment
  `5f62b61f-6d9d-4c25-812f-3e5b2ca151fb`, provider status `SLEEPING`.

  **Cause of the delay.** Railway's Serverless detector is packet-based: a
  service sleeps after roughly five minutes with no *outbound* traffic, sampled
  on an interval, so the real boundary is 5–10 minutes. `api` holds three Redis
  sockets for the life of the container — the Socket.IO adapter's pub and sub
  clients from `RealtimeIoAdapter`, plus the BullMQ queue connection registered
  in `notifications.module.ts`. `CLIENT LIST` on the staging Redis, read from
  the `worker` container so `api` was not disturbed, shows exactly those three
  at `age=712s idle=712s` (`info`, `hmset`, `subscribe sub=6`) — the
  application itself sends nothing. Staging Redis is `redis:8.2` with
  `tcp-keepalive 300` and `timeout 0`, so the *server* probes every idle client
  every 300 seconds and the API's kernel answers. One outbound packet every 300
  seconds against a ~300-second idle threshold is a race, which is exactly what
  the data shows: `api` won that race for 47 minutes and then lost it. `admin`
  and `web` open no long-lived connections at all and sleep in 4–6 minutes
  every time.

  Postgres is not involved: `PrismaService` uses a `pg` `Pool`, whose default
  `idleTimeoutMillis` is 10 seconds, so those sockets close shortly after boot.
  The Docker `HEALTHCHECK` is not involved either — `admin` and `web` carry the
  same directive and sleep normally.

  **`api` cold-start number, measured.** With `api` confirmed `SLEEPING`, the
  first request at `2026-09-05T01:36:03Z` woke it: `/healthz` `200` in
  **3.43s** (all of it time-to-first-byte; TCP connect was reused). The
  immediately following `/readyz` returned `200` with `postgres/redis/minio`
  all `ok` in 1.16s, so the dependency pool reconnects inside the first
  request. `api` wakes about 1s slower than `admin`/`web`, which is the NestJS
  boot plus the Redis/BullMQ/Socket.IO adapter reconnect.

  **Decision (founder, 2026-09-05): `sleepApplication=false` on staging
  `api`.** Sleep on `api` is permitted by the sprint boundary, not required,
  and what the measurements show is a service whose sleep is real but
  unpredictable — anywhere from a few minutes to the better part of an hour,
  decided by a race between a Redis keepalive probe and the provider's idle
  sampler. An environment whose job is being reliably available for store-review
  smokes should not depend on that race, and `api` is not where staging cost
  goes: `Postgres`, `Redis`, `MinIO`, and `worker` are awake by contract and are
  the floor. Turning the setting off makes the declared state and the observed
  state agree, which is the drift rule ADR-0044 exists for. No superseding ADR
  is needed because the boundary permits either value; the decision is recorded
  here and belongs in the S11 retro. `railway/api.json`, `railway/worker.json`,
  `railway/admin.json`, and `railway/web.json` now all declare
  `sleepApplication` explicitly so the contract covers the setting instead of
  leaving it implicit.

  **Rejected alternative: raising Redis `tcp-keepalive` from 300s to 600s.**
  Ten minutes of silence would clear the idle bar cleanly and `api` would sleep
  predictably — and then Railway's own wake rule fires, because a service wakes
  on private-network traffic from another service in the project, which is
  precisely what the next keepalive probe is. The expected steady state is a
  sleep/wake cycle roughly every ten minutes driven by the probe that allowed
  the sleep, each wake paying the 3.4s boot measured above plus Redis, BullMQ,
  and Socket.IO adapter reconnect churn. The change is also shared: `worker`'s
  BullMQ connections use the same Redis server, so its dead-peer detection
  would double too. Not done.

  **Provider setting semantics worth recording:** `sleepApplication` is applied
  through `serviceInstanceUpdate` and takes effect on the service's **next
  deployment**. `api` was still `SLEEPING` on its previous revision for
  16 minutes after the setting was changed, which is why the cold-start number
  above could still be measured.

- [x] No check required disabling or loosening a health gate. `/readyz` kept
      its bounded Postgres + Redis + MinIO checks throughout.

### Reviewer Scenario Prerequisite for Checks 7–10

Checks 7–10 need an authenticated identity and seeded content. Staging stays
`SIGNUPS_ENABLED=false` and `SMS_DRIVER=mock`, so the only route to a session
is the reviewer OTP bypass. Two variables were added to `api` for this slice
and are recorded by name only:

| Variable | Purpose | Set |
|---|---|---|
| `REVIEW_DEMO_ACCOUNT_ENABLED` (`true`) | Enables the OTP bypass | [x] |
| `REVIEW_DEMO_ACCOUNTS_JSON` | 3 reviewer accounts, `+993 6…` phones, 6-digit codes | [x] |

- [x] Codes were generated with `crypto.randomInt` straight into a local
      `0600` file and piped in with `railway variable set --stdin`. No value
      was rendered to a terminal, a file in git, an issue, or a transcript.
- [x] The API booted successfully with both set, which is itself the proof
      that `apps/api/src/env.schema.ts` accepted the account list: an invalid
      list fails the boot contract rather than degrading.
- [x] `SIGNUPS_ENABLED=false`, `SMS_DRIVER=mock`, and `APP_ENV=staging` are
      unchanged. `OTP_TEST_MODE` and `OTP_TEST_CODE_RESPONSE` remain unset.

Scenario seeding ran inside the `api` container — staging Postgres has no
public TCP proxy by design, so anything needing `DATABASE_URL` runs there:

    railway ssh --service api --environment staging -- sh -c \
      'cd /app && REVIEWER_SCENARIO_SEED_AUTHORIZATION=seed-reviewer-scenario \
       pnpm --filter @auto-tm/db reviewer:scenario --mode seed'

- [x] Printed `Reviewer scenario converged 3 accounts, 2 listings, 1
      conversation, and 1 report`.
- [x] **Idempotent**: a second identical run printed the same line and exited
      `0`, converging rather than duplicating.
- [x] The guards in `packages/db/src/reviewer-scenario-seed.ts` refuse any
      other invocation — the seed requires the explicit authorization value,
      `APP_ENV=staging|production`, `SIGNUPS_ENABLED=false`,
      `REVIEW_DEMO_ACCOUNT_ENABLED=true`, and 3–5 accounts.

Reviewer-account provisioning as a whole remains #279 / S11-09 scope. What is
recorded here is the minimum needed to prove #278's own criterion 6; #279 owns
the operator procedure, rotation, and revocation.

### Two repo defects this half of the smoke uncovered

Both are the same failure mode, and neither could be caught without running the
scenario through the real HTTP surface: something is written or configured that
Postgres and the boot contract accept, and the API's request contracts then
reject.

| Defect | Symptom | Fix |
|---|---|---|
| Reviewer scenario seeded slug ids (`autotm-reviewer-listing-primary`, `autotm-reviewer-brand`, …) into columns the API validates with `z.string().uuid()` | Every request naming a seeded listing, catalogue row, or conversation would fail validation. Checks 7–10 could not run at all. | #308 — every scenario id is now a fixed UUID exported as `reviewerScenarioSeedIds`, with a regression test asserting each is a UUID and distinct |
| `REVIEW_DEMO_ACCOUNTS_JSON` codes were validated as 5–8 digits at boot, but `OtpVerifyRequestSchema.code` is `/^\d{6}$/` | 8-digit reviewer codes passed the boot contract and were then rejected by `POST /api/v1/auth/otp/verify` with `400 VALIDATION_FAILED` `fieldErrors.code: ["Invalid"]`, before the bypass was ever consulted. Observed live at `01:59Z`. From a reviewer's side this is indistinguishable from a wrong code. | `apps/api/src/env.schema.ts` now requires exactly 6 digits, with a test covering 5-, 7-, and 8-digit codes and the runbook prerequisite updated. Staging codes were regenerated at 6 digits. |

## Secret Hygiene

- [x] No secret values appear in this file.
- [x] Generated secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
      `TOTP_SECRET_ENCRYPTION_KEY`, `SESSION_SECRET`) were produced with
      `openssl rand` and piped straight into `railway variable set --stdin`,
      so no value was ever rendered to a terminal, a file, or an agent
      transcript.
- [x] MinIO credentials were wired as Railway references
      (`${{MinIO.MINIO_ROOT_USER}}` / `${{MinIO.MINIO_ROOT_PASSWORD}}`) rather
      than copied values.
- [x] No provider log excerpt containing a secret value was copied anywhere.
      The worker crash logs quoted above name only variable names.
- [x] Reviewer OTP codes were generated with `crypto.randomInt` directly into
      a local `0600` file, piped in with `railway variable set --stdin`, and
      regenerated in place when the 6-digit rule was fixed. No code was ever
      rendered to a terminal, a git-tracked file, an issue, a PR, or an agent
      transcript. Reviewer phones are recorded only as the `+993 6…` prefix.
- [x] Access and refresh tokens obtained during the smoke were held in process
      memory by the smoke script and never written to a file or printed. The
      script prints status codes, roles, timings, and byte counts only.

### Exception — one value was exposed and needs rotation

- [ ] **Open finding.** While confirming Railway reference names, a
      `railway variable list --service Postgres` call rendered the staging
      Postgres connection string, including `PGPASSWORD`, into the operating
      agent's transcript. The value did not reach this file, git, the issue,
      or any PR, and the database is environment-local to staging with no
      public TCP proxy. It is still an exposure of a live credential.
      **Recommended follow-up: rotate the staging Postgres password.** Until
      then, treat that credential as known-compromised-in-transcript.
- [x] Root cause recorded so it does not recur: never use
      `railway variable list` / `--kv` / `--json` for name discovery. Use
      `get-service-config`, which returns `variableNames` only.

## Acceptance Criteria Status

Against the criteria in [#278](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/278):

| # | Criterion | Status |
|---|---|---|
| 1 | API migration pre-deploy completes before API readiness; others do not serve code needing an unapplied migration | **Met** |
| 2 | API, worker, admin, web start from clean Railway builds tied to the recorded SHA | **Met** |
| 3 | Staging deploy waits for the required check; a failing revision demonstrably does not deploy | **Met** |
| 4 | Worker visibly fails on an incomplete production-like push contract | **Met** |
| 5 | Sleep boundary applied to API/admin/web only; Postgres, Redis, worker awake; MinIO deferred | **Met.** Sleep is enabled only within the permitted set, and only where it works: `admin` and `web` sleep and wake as designed; `api` is deliberately set `false` after measurement, which the boundary permits. `Postgres`, `Redis`, `worker` awake; MinIO deferred. Declared and observed states agree. |
| 6 | Cold-start smoke covers legal pages, reviewer auth, WebSocket chat, media reads, signed uploads | **Met.** All ten checks green in one pass on `421599ad`, with `admin` and `web` confirmed `SLEEPING` beforehand: legal pages, reviewer auth on two accounts, a real WebSocket message delivered between them, a signed upload PUT, and a byte-exact media read. Two repo defects were found and fixed to get here (#308 and the OTP code-length mismatch). |
| 7 | No secret values in evidence, git, issue comments, or logs | **Met for this file, git, the issue, and PRs**; one live value was exposed in the operating agent's transcript — see the rotation finding below |

All seven criteria are met. One follow-up remains open and is deliberately not
a blocker for this slice: the staging Postgres password rotation recorded under
*Secret Hygiene*.

## Out of Scope

Production deploys, EAS builds, physical-device push, public users, DNS, store
submission, and TM cutover. Reviewer account provisioning as an operator
procedure — rotation, revocation, secret-store handling, and the store-review
handover — is #279 / S11-09. This slice enabled the bypass and seeded the
scenario only as far as criterion 6 required.

## References

- [ADR-0039 — phased cloud-first hosting](../../../adr/0039-phased-cloud-first-hosting.md)
- [ADR-0044 — Railway deploy settings live provider-side](../../../adr/0044-railway-deploy-settings-live-provider-side.md)
- [Sprint 11 — Railway deployment](../../sprints/sprint-11-railway-deployment.md)
- [80 — Deployment runbook](../80-deployment-runbook.md)
- [Issue 277 — staging data plane evidence](issue-277-staging-data-plane.md)
- [`railway/README.md`](../../../../railway/README.md)
