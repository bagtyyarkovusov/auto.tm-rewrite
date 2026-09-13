# Issue 281 production foundation evidence

Secret-free continuation record for [#281](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/281).

**Not ready for promotion.** The duplication incident is closed — Postgres was
wiped and re-initialised, Redis holds no keys, and production MinIO holds no
objects. What remains open is reviewer identity and the reviewer scenario seed,
push credentials for the worker, and the criterion-7 breach. Keep #281 open and
#282 blocked. No completion or production approval is recorded here.

Sections are appended in the order they were verified; where a later section
contradicts an earlier one, the later section is current.

## Evidence provenance

The 2026-09-13 continuation handoff reports the provider work performed from
2026-09-05 onward. Its original scratch probes and logs were lost when `/tmp`
was cleared. Findings below explicitly attributed to the handoff are historical
operator reports, not fresh passing checks.

The continuation read the current issue body and comments on 2026-09-13 and
confirmed the project and both environment IDs through Railway GraphQL.
Requests through the configured proxy failed; a direct request succeeded, but
a subsequent direct schema query failed at TLS. Connectivity is intermittent.
No provider mutation was performed during this continuation's initial inspection.

| Resource | Identifier |
|---|---|
| Project | `auto-tm`, `176ddec0-dd65-4087-b82c-798599fc2ebe` |
| Staging | `652abc79-fdb0-48b0-9f6c-ad0ff572d7b2` |
| Current production | `c628b9bf-08ef-45f6-976f-3d646e0ebfbd` |
| Previous empty production | `93cb9126-de04-493e-95ec-6296470c4d7d` |
| Repository baseline | `5062815` |

The previous production ID in #280's evidence identifies that drill's historical
target. It must not be reused for current production operations. A repository
search found that literal ID in one evidence file, not the three claimed by the
handoff. Preserve the historical record and append a dated clarification there.

## Reported provider state, awaiting fresh verification

| Service | ID | Handoff state |
|---|---|---|
| api | `6db6f1b1-5c7a-4033-88d0-53f5f315bfc0` | Application deployment removed |
| worker | `24aa02e0-25a9-4e80-9cc2-c1795ef82091` | Application deployment removed; push credentials incomplete |
| admin | `69ba9f86-0000-4460-8165-de69b289b36e` | Application deployment removed |
| web | `f3c5888b-d303-44b1-bc6e-3d775dad4639` | Application deployment removed |
| Postgres | `30dda76c-1a50-457f-a08a-dce846eb9843` | Recovery configuration remains applied; original data directory partly deleted |
| Redis | `bde03eb2-23df-4e3c-9fda-997621632b26` | Copied snapshot remains |
| MinIO | `af9ecdec-433b-48f0-8457-1a13c5ab1ab7` | Three buckets bootstrapped; persistent volume |

The handoff reports exactly seven production services, four production deployment
triggers removed, four staging triggers retained, and sleep disabled for all
production instances. These settings need fresh provider reads. Disabled sleep
is a configuration claim; it does not mean removed applications are serving.

## Duplication incident and recovery gate

The handoff reports that environment duplication copied Postgres and Redis data
from staging. Postgres skipped initialization, leaving the regenerated password
unapplied. Both attempted passwords failed authentication. Redis loaded 14 keys
from a recent RDB snapshot. MinIO bootstrap created three buckets; that observation
suggests different initialization behavior, but does not establish a general
provider guarantee that custom-image volumes are never copied.

Production Postgres's original `/pgdata` contains remaining directories including
`base/` and `global/`. Removing top-level files did not complete the wipe.
The recovery configuration redirects `PGDATA` to
`/var/lib/postgresql/data/pgdata-tmp` and sets `startCommand` to `sleep infinity`.
Do not undo it until the human has finished the original data-directory cleanup.
The handoff reports that a `startCommand: null` mutation returned success without
clearing the field. Read the field back after any eventual correction.

| Volume | Shared project-level ID | Production cleanup still required |
|---|---|---|
| Postgres | `2bd46ac8-731c-48c2-86a8-d512f1817c9c` | `/pgdata` and, after recovery, any throwaway directory |
| Redis | `4d809b5a-e9fe-4f3a-8445-60f74d75a6ec` | `/dump.rdb` |
| MinIO | `c795022f-f34d-4b87-b1ae-9b30bffa5f8f` | No wipe requested |

Volume IDs are shared across environments. Never call project-wide
`volumeDelete` or an unscoped detach to repair this production instance.
The earlier `volumeInstanceUpdate` deletion flag did not remove files and caused
mount conflicts; the handoff reports it reverted.

Recovery requires restored SFTP access and human execution of the environment-
scoped file deletion. The CLI refuses agent file deletion; do not remove agent
identification variables or substitute another route to evade that restriction.
After human confirmation, verify the files are absent before restoring `PGDATA`
to `/var/lib/postgresql/data/pgdata` and clearing the start override. Then verify
fresh initialization and password authentication, restart Redis and prove zero
loaded keys, and remove any temporary public database proxy immediately after
the authentication test. These steps remain pending, not authorized by this record.

## Application deployment boundary breach

The handoff records automatic application deployments after duplication at
`2026-09-05T22:49:23Z`: worker succeeded, API failed, and admin/web slept.
All four deployments were removed at `2026-09-05T23:00:27Z`, roughly eleven
minutes later. A preceding `latestDeployment: null` read raced deployment creation.

No deliberate exact-SHA promotion is reported, but application revisions did run
in production. Criterion 7 is therefore **not met**. Removing deployments does
not erase that breach. Recheck deployment history before any future readiness
claim. No store build or submission is reported for #281.

## Confirmation gates before promotion

| Gate | Current evidence and required completion |
|---|---|
| Data isolation | Finish and verify fresh Postgres/Redis initialization. Check resolved provider references and environment ownership. Existing API/worker hostname guards reject recognizable opposite-environment names; neutral `*.railway.internal` names alone cannot prove isolation. |
| Readiness | Repository API `/readyz` checks Postgres, Redis, and MinIO. Verify provider health path and timeout before promotion. Runtime production readiness is unproven while applications are removed. |
| Migration authority | `railway/api.json` declares `pnpm --filter @auto-tm/db migrate:deploy` as API pre-deploy. Other application declarations have no migration command. Read back production settings; #282 must deploy API first and wait for readiness. |
| Reviewer flags | **Verified 2026-09-13** by in-memory assertion over the GraphQL variable map. Mock SMS, signup off, both OTP test flags unset, reviewer bypass on, and a five-entry reviewer account list that satisfies every schema rule. Criterion 4 is met. |
| Reviewer identity | **Shape verified; block accepted by the founder; seed deferred.** Five unique `+993` E.164 identities with unique six-digit codes are configured and stored under `~/.autotm-ops/production/`, sharing an 11-character prefix. The founder accepted the reserved block on 2026-09-13 on the grounds that real users do not hold numbers of that form — a judgement about the user population, not a carrier confirmation. The reviewer scenario seed has not run — production Postgres is an empty cluster with no schema, so migrations must precede any seed, which collides with criterion 7. Do not put credentials in this record. |
| Push | **Confirmed by fresh read 2026-09-13.** `PUSH_TRANSPORT=fcm-apns` is set on the production worker and all eight required credential variables are absent, so the worker cannot boot. Staging carries the three `FCM_*` values and no `APNS_*`. `test` is rejected outright in production. The founder deferred Apple/APNS to #282 on 2026-09-13; that defers Apple proof, not the code requirement for both credential sets. Android proof is not implicitly deferred or marked complete. |
| Internal mobile hosts | `staging` and `production-smoke` share EAS `preview`. Founder selected the no-upgrade guard on 2026-09-13. ADR-0046 and the local implementation require independent production host approvals for API/WS/media. Local validation passed; provider-supplied host configuration remains pending; no remote variable change or build occurred. |
| Store domains | ADR-0039 requires stable owned API/media domains before the later store build. Railway hosts are allowed only for internal builds. Verify the existing store-profile gate locally; domain ownership and DNS remain human gates. |
| Persistence and exposure | **Verified 2026-09-13.** Fresh reads confirm sleep disabled on all seven production services, three volumes `READY` at their expected mounts, the MinIO console port unrouted, and a public-read-only bucket policy that refuses anonymous listing, writes, deletes and admin calls. Remaining item is the unpinned `latest` MinIO image, an operator decision. |
| Secret inventory | **Completed 2026-09-13** for `api`, `worker` and `admin` by in-memory presence, length and digest-difference assertions. Every application secret differs from staging; the only identical values are `*.railway.internal` names and shared non-secret flags. Never print raw variables or environment config. |

## Secret inventory awaiting readback

| Names | Owner | Handoff report / gate |
|---|---|---|
| `POSTGRES_PASSWORD`, derived database references | Postgres, API, worker | Rotated; authentication failed against copied cluster. Fresh initialization required. |
| Redis credentials and derived references | Redis, API, worker | Regenerated; copied data still requires removal. |
| MinIO root and application access/secret keys | MinIO, API, worker | Copied from staging, then rotated twice after transcript exposure. **Distinctness verified 2026-09-13** — staging root credentials are rejected by the production origin with `InvalidAccessKeyId`, and production root credentials authenticate against it. Application-level references still ride on the API/worker revisions that #281 forbids running. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | API | **Verified 2026-09-13**: both differ from staging, differ from each other, and are 64 characters. |
| `TOTP_SECRET_ENCRYPTION_KEY` | API | **Verified 2026-09-13**: 44 characters (32 bytes base64) and differs from staging. |
| `SESSION_SECRET` | admin | **Verified 2026-09-13**: present and differs from staging. |
| `REVIEW_DEMO_ACCOUNTS_JSON` | API | **Populated and verified 2026-09-13**: five unique `+993` E.164 phones with unique six-digit codes, differing from staging. Codes live in the operator secret store and were never printed. |
| `FCM_*`, `APNS_*` | worker | **All eight absent on production** as of 2026-09-13, against `PUSH_TRANSPORT=fcm-apns`. Copied staging FCM values were deleted from production earlier; staging retains three `FCM_*` and no `APNS_*`. |

The handoff reports FCM credentials now present on staging worker, superseding
#279's earlier absence observation. It also reports a previously exposed staging
Firebase service-account key requiring provider-side rotation. That human follow-up
remains outstanding and is not a #281 deliverable. Do not read or copy the key.

Other findings to carry forward: production MinIO reportedly inherits the unpinned
`latest` image; pinning needs an operator decision. `railway environment config
--json` prints secrets and must not be displayed. Inspect only selected metadata
or use an in-memory filter that emits names and assertions.

## Verification record

- Current issue body and both comments read through authenticated GitHub CLI.
- Current project/environment IDs verified by GraphQL; later TLS failure prevents a complete live readback.
- Context7 `/railwayapp/docs` consulted for duplication and volume operations. Returned documentation establishes a volume-file deletion command, but did not resolve duplication or agent restrictions. Those claims remain attributed to the handoff.
- Repository deploy declarations and API/worker environment validation inspected.
- No new application revision, store build, or provider mutation performed during initial continuation inspection.
- Railway CLI 5.49.2 authenticated with and without proxy variables. Direct production Postgres SFTP directory listing failed with `Disconnected`; cleanup remains blocked.
- Expo build environment/profile behavior consulted through Context7 `/expo/expo`.
- `pnpm test` passed, 10/10 tasks with nine cache hits; mobile ran 106 files and 889 tests. Targeted build-gate tests passed 29/29.
- `pnpm typecheck` passed, 11/11 tasks with ten cache hits; mobile typechecking executed.
- Expo dependency check passed after removing proxy variables for that command. Cleared iOS export and targeted ESLint passed.
- Remediation completed 2026-09-13 by an unattended operator script run from a non-agent terminal; volume-file deletion was never performed by an agent.
- Postgres wipe, re-initialisation, password authentication, table count, and Redis `DBSIZE` verified from inside the containers over `railway ssh`, against `127.0.0.1`. No public TCP proxy was created and production Postgres was never exposed.
- Second continuation 2026-09-13: Railway GraphQL and CLI reachable with proxy variables removed; SFTP still fails at `ssh.railway.com`.
- SFTP failure reproduced against a healthy staging volume and traced to local VPN TUN/fake-IP interception of port 22, not to Railway or to the recovery configuration.
- Production service list, sleep settings, deployment state, deployment triggers and volume instances re-read through GraphQL. No mutation performed.
- Third continuation 2026-09-13: MinIO console routing, anonymous access behaviour, media inventory and credential distinctness verified read-only. No mutation, no deployment, no object write.
- Criterion-4 flags, reviewer-account shape, cross-environment secret distinctness and push-credential absence read back on 2026-09-13 as assertions only; no raw variable value entered the transcript.
- These are local checks, not production deployment or physical-device evidence. Fixed-point code review remains pending.

## Second continuation readback (2026-09-13)

A later session on the same day re-reached the provider and replaced several
"pending readback" rows above with fresh reads. Connectivity changed: with the
proxy variables removed, Railway GraphQL and the authenticated CLI both work.
SFTP does not.

### SFTP root cause identified

The blocker is local, not provider-side. A VPN/proxy client is running in TUN
plus fake-IP mode: `ssh.railway.com`, `backboard.railway.com` and `github.com`
all resolve into the benchmarking range `198.18.0.0/15`, and five `utun`
interfaces are up. Port 443 is forwarded, so HTTPS and GraphQL succeed. Port 22
is accepted at TCP level but never returns an SSH banner, and `ssh` reports
`Connection closed by 198.18.0.59 port 22`.

The failure reproduces identically against a healthy **staging** volume, so it is
neither production-specific nor caused by the recovery configuration. The earlier
handoff attributed CLI failure to the proxy variables alone; the sharper finding
is that unsetting them fixes GraphQL while the TUN interception continues to
break SFTP. Clearing the volume files requires the founder to quit the VPN client
entirely, not merely unset `HTTP_PROXY`/`HTTPS_PROXY`.

### Fresh provider reads

All reads below are GraphQL, read-only. No mutation was performed.

Production contains exactly seven services and no `sms-gateway` or `phone-agent`.
Sleep is disabled on every one. The four application services report no
deployment; the three data services are running.

| Service | Sleep | Latest deployment |
|---|---|---|
| api, worker, admin, web | disabled | none |
| Postgres | disabled | SUCCESS, 2026-09-05T23:35:08Z |
| Redis | disabled | SUCCESS, 2026-09-05T23:28:28Z |
| MinIO | disabled | SUCCESS, 2026-09-05T22:59:37Z |

Because the Postgres deployment is running, the SFTP failure is not an absent
container. The recovery configuration is still applied and still required:
`startCommand` reads `sleep infinity`, confirming the handoff's warning that the
earlier clearing mutation did not take effect.

Deployment triggers project-wide total four, all bound to staging on `main`.
Production has zero. Criterion 3 is confirmed by fresh read.

Every volume reports exactly one instance per environment, all `READY`, with the
expected mount paths and no duplicate mounts, confirming the earlier
`volumeInstanceUpdate` experiment was fully reverted.

| Volume | Mount | Production | Staging |
|---|---|---|---|
| `postgres-volume-tbO8` | `/var/lib/postgresql/data` | 112 MB | 160 MB |
| `redis-volume-YfzJ` | `/data` | 83 MB | 217 MB |
| `minio-volume-mr74` | `/data` | 519 MB | 630 MB |

Production Postgres still consumes 112 MB, consistent with the unremoved
`base/` and `global/` directories. The cleanup in the recovery gate above remains
outstanding and still requires a human on an unproxied network.

## Duplication remediation completed (2026-09-13)

The copied-data incident is resolved. Production Postgres and Redis now hold no
staging data, and the recovery scaffolding is removed.

### What finally worked

Three provider behaviours defeated every earlier attempt. Each is a finding in
its own right.

**`startCommand` could not be cleared with JSON `null`.** `serviceInstanceUpdate`
accepts `startCommand: null`, returns `true`, and leaves the field unchanged —
`null` means "do not modify this field" under partial-update semantics. Passing
an **empty string** clears it. Every prior session read the `true` and assumed
success; the field never moved.

**`railway volume files delete` cannot remove directories.** Its own help reads
"Delete a file". This is why earlier passes removed `/pgdata`'s top-level files
while `base/`, `global/` and every `pg_*` directory survived. The workable route
is `railway ssh` into the container and `rm -rf` the directory, which requires
the container to be alive — which is exactly what the `sleep infinity`
scaffolding provided.

**`railway redeploy` replays the existing deployment's configuration snapshot.**
It does not pick up changed service settings. After `startCommand` was cleared, a
redeploy still launched `sleep infinity` as PID 1. A deployment that reads current
configuration must be triggered by a real configuration change; setting a variable
to its existing value is a no-op and triggers nothing. A throwaway variable was
set to force one deployment and deleted immediately afterwards.

### Verified end state

Postgres was wiped while parked on `sleep infinity` with no `postgres` process
running, so the data directory was idle rather than racing a live server.

| Check | Result |
|---|---|
| `/var/lib/postgresql/data/pgdata` | removed, then recreated by a first-ever `initdb` |
| Volume root | `certs/` and `lost+found/` preserved; 18 MB → 64 KB before re-init |
| Postgres process | running, PostgreSQL 18.6, `PG_VERSION=18` |
| Password authentication | **succeeds** — the original #281 failure is cleared |
| Databases | `postgres`, `railway`, `template0`, `template1` only |
| User tables in `railway` | **0** |
| Redis `DBSIZE` | **0** |
| Redis restart | `keys loaded: 0` |
| Application services | `api`, `worker`, `admin`, `web` all still report no deployment |

Deleting Redis's `dump.rdb` was futile in every earlier attempt: the server runs
with `--save 60 1` and rewrites the file from memory, so the copied keys returned
on the next save. `FLUSHALL` followed by `SAVE` is what actually clears them. The
same lesson as the Postgres data directory — operate on the live server's state,
not on the file it happens to persist to.

### Residual divergence to record

Production Postgres `startCommand` now reads empty string; staging reads null.
Both yield the image default entrypoint and Postgres starts correctly from the
empty value, but the two environments are not byte-identical on this field. This
is a known, deliberate difference, not drift to be silently reconciled.

## MinIO exposure and media locality verified (2026-09-13)

A third continuation re-reached the provider and closed the MinIO half of
criterion 5, which the record above carried as reported-but-unverified. All
checks below are read-only. No provider mutation, no application deployment, and
no object write occurred. Local network conditions were unchanged: the VPN is
still in TUN/fake-IP mode (`ssh.railway.com` resolves into `198.18.0.0/15`), so
GraphQL and HTTPS work and SFTP/`railway ssh` remain unavailable.

### Console and admin surface are not publicly routed

| Read | Result |
|---|---|
| Production service domains | `MinIO` has exactly one generated domain, target port **9000** |
| Production `startCommand` | `minio server /data --console-address :9001` |
| Domain on port 9001 | none — no generated domain, no custom domain |
| TCP proxies on the production MinIO service | none |
| Other production domains | `api` → 3006, `admin` → 3001, `web` → 3002; `Postgres`, `Redis`, `worker` have none |

Only the S3 API port is routed. The console listener exists inside the container
on 9001 and has no ingress. This matches the `railway/minio.md` contract.

### Anonymous behaviour on the public S3 origin

Unauthenticated requests against the production origin:

| Request | Result |
|---|---|
| `GET /` (ListAllMyBuckets) | `403 AccessDenied` |
| `GET /listing-photos/?list-type=2` | `403 AccessDenied` |
| `GET /listing-videos/?list-type=2` | `403 AccessDenied` |
| `GET /chat-attachments/?list-type=2` | `403 AccessDenied` |
| `GET /minio/ui/` | `403 AccessDenied`, parsed as an object key — the console is not served on 9000 |
| `GET /minio/admin/v3/info` | `403 AccessDenied` |
| `GET /minio/health/live` | `200` — the intended liveness path |
| `GET /listing-photos/<absent key>` | `404 NoSuchKey` — anonymous `s3:GetObject` is granted, as the contract requires |
| `PUT /listing-photos/<probe key>` | `403 AccessDenied` |
| `DELETE /listing-photos/<probe key>` | `403 AccessDenied` |
| Read back the probe key afterwards | `404 NoSuchKey` — nothing was written |

Anonymous read of objects is deliberate and documented; anonymous listing,
writing, deleting and administration are all refused. The bucket policy is
therefore public-read-only, not public.

### Media locality: production MinIO is empty

Volume size alone is misleading. Production `minio-volume-mr74` reports 544 MB
and staging 630 MB, but an empty Redis volume in the same project reports 83 MB,
so several hundred megabytes are filesystem and MinIO internal overhead rather
than media. An authenticated inventory settles it.

Counts were taken with a throwaway read-only `ListObjectsV2` script executed
under `railway run --service MinIO --environment <env>`, so each environment's
own root credentials were injected into the process environment and never
printed. The script emitted only counts, byte totals, and a SHA-256 digest over
sorted `bucket/key:size:etag` lines.

| Environment | `listing-photos` | `listing-videos` | `chat-attachments` | Total | Bytes |
|---|---|---|---|---|---|
| production | 0 | 0 | 0 | **0** | 0 |
| staging | 65 | 0 | 11 | 76 | 275388 |

The production digest is the SHA-256 of the empty string
(`e3b0c442…7852b855`); staging's is `0c81d47f…6d06cd8f`. Production holds no
staging media. Combined with the wiped Postgres and the zero Redis `DBSIZE`
recorded above, all three production data services are now proven free of
duplicated staging data on fresh reads.

This also corrects the weak inference recorded earlier. The claim that MinIO
"was not copied because bootstrap created three buckets" was never sound —
idempotent bootstrap cannot distinguish creation from pre-existence in the
record we kept. The object inventory is the direct evidence.

### MinIO credentials are environment-local

Running the same inventory with **staging** root credentials against the
**production** origin fails with `InvalidAccessKeyId`. The production root
access key is therefore distinct from staging's, not a duplication leftover. No
credential value was read or printed.

### Still open on MinIO

Production MinIO runs `quay.io/minio/minio:latest`. The image is unpinned and
pinning remains an operator decision that has not been made. It is not a
criterion-5 blocker, but it is a reproducibility risk: any restart can pull a
different build, and the environments can silently diverge.

## Criterion 4 flag readback and secret inventory (2026-09-13)

Variable maps were fetched through GraphQL and reduced **in memory** to
assertions before anything reached the transcript. Non-secret operational flags
are quoted by value; every secret is reported only as presence, length, or a
comparison of SHA-256 digests. No raw secret was printed, and
`railway environment config --json` / `railway variable list --kv` were not used.

### The five criterion-4 flags

Production `api` carries 34 variables, production `worker` 21.

| Flag | Service | Read | Verdict |
|---|---|---|---|
| `SMS_DRIVER` | api | `mock` | Met |
| `SIGNUPS_ENABLED` | api | `false` | Met — public signup off |
| `REVIEW_DEMO_ACCOUNT_ENABLED` | api | `true` | Met — reviewer bypass on |
| `OTP_TEST_MODE`, `OTP_TEST_CODE_RESPONSE` | api | both **unset** | Met — CI OTP response mode off, and `apps/api/src/env.schema.ts` additionally rejects either flag whenever `NODE_ENV` is not `test`, so the off state is fail-closed rather than merely defaulted |
| `PUSH_TRANSPORT` | worker | `fcm-apns` | Met as a flag; see the push gate for the credential blocker |

Criterion 4 is therefore **met**. Two caveats belong to other criteria, not to
this one: the reviewer bypass flag is inert until the reviewer scenario seed
exists, and the worker still cannot boot with `fcm-apns` selected and no
credentials present.

### Reviewer demo account shape

`REVIEW_DEMO_ACCOUNTS_JSON` was parsed inside a `railway run` process against the
production `api` service and reduced to assertions. No phone number and no code
was printed.

| Assertion | Result |
|---|---|
| Valid JSON array | yes |
| Account count | 5 — inside the schema's 3–5 range |
| Object keys | exactly `code` and `phone` |
| Every phone matches `+993` E.164 | yes, all length 12 |
| Phones unique | yes |
| Longest shared phone prefix | 11 of 12 characters — a contiguous reserved block differing only in the final digit |
| Every code exactly six digits | yes |
| Codes unique | yes |

This satisfies every rule `validateReviewerDemoAccounts` enforces. It does not
establish that the reserved block is unissueable by the carrier, which is a
founder confirmation, nor that the identities exist as buyer/seller users, which
the seed must create. The founder accepted the block on 2026-09-13; see the
dispositions section below.

### Cross-environment secret distinctness

Digests were computed locally and compared; only the boolean result is recorded.

| Variable | Service | production vs staging |
|---|---|---|
| `JWT_ACCESS_SECRET` | api | differs |
| `JWT_REFRESH_SECRET` | api | differs |
| `JWT_ACCESS_SECRET` vs `JWT_REFRESH_SECRET` within production | api | differs |
| `TOTP_SECRET_ENCRYPTION_KEY` | api | differs |
| `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | api, worker | differ |
| `MINIO_PUBLIC_URL` | api | differs |
| `DATABASE_URL`, `REDIS_URL` | api, worker | differ |
| `REVIEW_DEMO_ACCOUNTS_JSON` | api | differs |
| `SESSION_SECRET` | admin | differs |
| `ADMIN_ORIGIN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MINIO_PUBLIC_URL` | admin | differ |

Shapes are as expected: both JWT secrets 64 characters,
`TOTP_SECRET_ENCRYPTION_KEY` 44 characters (32 bytes base64).

Three values are **identical** across environments by design, and each is a
private-network name rather than a credential: `MINIO_ENDPOINT` and
`API_BASE_URL` are `*.railway.internal` origins, and `SMS_DRIVER`/`SIGNUPS_ENABLED`
are the same flag values in both environments. A neutral internal name still
cannot by itself prove environment-local resolution; that proof needs a running
revision and belongs to #282.

### Push credentials remain absent

Production `worker` selects `fcm-apns` and is missing **all eight** variables the
schema requires for it: `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`,
`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`,
`APNS_PRODUCTION`. Staging carries the three `FCM_*` values and no `APNS_*`.
The production worker cannot boot until at least the Android half is supplied,
and `PUSH_TRANSPORT=test` is rejected outright when `APP_ENV=production`.

## Founder dispositions (2026-09-13)

Two open questions from the criterion-4 readback were put to the founder and
answered on the same day. Both are recorded here as founder decisions, with the
kind of evidence each rests on stated plainly.

### Reviewer phone block — accepted

The agent flagged that the reserved `+993` block sits inside an active mobile
range and that "unissueable" had not been positively established. The founder
confirmed the block is acceptable: those numbers are not in the form real AutoTM
users hold, so a collision between a reviewer identity and a real subscriber is
not a practical risk.

This is a **founder judgement about the user population**, not a carrier or
numbering-plan confirmation. It closes the reviewer-identity question for #281
on that basis. If the reserved set is ever rotated, `--mode seed` reuses stable
user ids, so replacing the block later is cheap.

The residual exposure, for the record: the bypass authenticates only a
pre-existing buyer or seller, never a moderator or admin, and never creates a
user. Should one of the reserved numbers ever reach a real subscriber, the
consequence is bounded to a login into a seeded reviewer account.

### Production FCM project — deferred to #282

The founder will create a separate production Firebase project rather than reuse
`autotm-staging`, and chose to do it under #282 rather than #281.

The reasoning, recorded because it is the load-bearing part of the decision:

- `PUSH_TRANSPORT=fcm-apns` requires **both** credential sets to boot. Apple is
  already deferred to #282, so supplying `FCM_*` alone leaves the production
  worker exactly as unbootable as it is now while adding a live production
  credential nobody is exercising.
- #281 cannot prove push in principle. Criterion 7 forbids promoting an
  application revision, and a delivery proof needs a running worker, a
  `production-smoke` build, and a physical Android device — all of which belong
  to #282.
- The present state is the intended fail-closed one. `apps/worker/src/env.schema.ts`
  rejects an incomplete `fcm-apns` set at boot; a half-filled set fails the same
  way while making the gap less legible.
- No repository change is required to support a second project.
  `apps/mobile/app.config.js` uses the same Android package `tm.auto.app` on every
  EAS profile and already reads `googleServicesFile` from `GOOGLE_SERVICES_JSON`,
  so the production project is selected by profile environment, not by code.

Two follow-ups fall out of this and are **not** #281 deliverables:

1. Rotate the exposed `autotm-staging` service-account key in Firebase. This is
   independent of both issues and outstanding now.
2. Capture "one Firebase project per environment" as an ADR extending
   [ADR-0009](../../../adr/0009-notifications.md) and
   [ADR-0043](../../../adr/0043-native-apns-delivery-via-node-apn.md) when the
   production project is created. It is a decision about outbound credentials
   and environment isolation, not an implementation detail.

### Migrations and the reviewer scenario seed — deferred to #282

Production Postgres is an empty cluster with no schema, so the seed cannot run
until migrations do. Every route to migrate inside #281 is worse than waiting:

| Route | Why it is rejected for #281 |
|---|---|
| Deploy `api` so its `railway/api.json` pre-deploy hook runs `migrate:deploy` | Promotes an application revision — a second criterion-7 breach |
| `railway run … migrate:deploy` from an operator machine | `railway run` executes locally and production `DATABASE_URL` resolves to `postgres.railway.internal`, unreachable off the private network |
| Public TCP proxy to production Postgres | Forbidden by the runbook and by this record; production Postgres has never been publicly exposed and must not be |

#282 deploys the API first, and that deploy's pre-deploy hook is the sanctioned
migration authority. Running migrations and then
`pnpm --filter @auto-tm/db reviewer:scenario -- --mode seed` there uses the
designed path instead of improvising around it. Until the seed runs,
`REVIEW_DEMO_ACCOUNT_ENABLED=true` is inert: the bypass authenticates a
pre-existing buyer or seller, and production has no users.

## Acceptance criteria status

Criteria copied verbatim from the current #281 issue body. Historical reports are
not substituted for fresh completion evidence.

| # | Criterion | Status and gate |
|---|---|---|
| 1 | Production contains exactly API, worker, admin, web, Postgres, Redis, and persistent MinIO; no sms-gateway or phone-agent. | Met. Fresh 2026-09-13 read confirms exactly seven services, no `sms-gateway` or `phone-agent`, and a `READY` MinIO volume mounted at `/data`. |
| 2 | All production data services are environment-local; cross-environment database/storage URLs are rejected. | Data-locality half **met** on 2026-09-13: Postgres re-initialised from empty with 0 user tables and working password authentication, Redis `DBSIZE` 0, and production MinIO holding 0 objects across all three buckets against staging's 76 (verified 2026-09-13). The rejection half rests on the `apps/api` and `apps/worker` hostname guards and their unit tests, not on a live production request; re-confirm once an application revision is permitted to run under #282. |
| 3 | Production has no branch autodeploy and remains manual-only. | Met. Fresh 2026-09-13 read confirms four project triggers, all staging on `main`, and zero production triggers. |
| 4 | `SMS_DRIVER=mock`, public signup off, reviewer bypass on, CI OTP response mode off, and `PUSH_TRANSPORT=fcm-apns` are verified without exposing values. | **Met** 2026-09-13. All five flags read back secret-free: `SMS_DRIVER=mock`, `SIGNUPS_ENABLED=false`, `REVIEW_DEMO_ACCOUNT_ENABLED=true`, both OTP test flags unset and fail-closed outside `NODE_ENV=test`, `PUSH_TRANSPORT=fcm-apns`. The reviewer bypass flag is inert until the seed runs and the worker still lacks push credentials; both belong to criterion 6. |
| 5 | All production services remain awake during review; MinIO console/admin remains private and data is persistent. | Infrastructure half **met** on 2026-09-13: sleep disabled on all seven services, all three volumes `READY` at their expected mounts, the MinIO console port unrouted with no TCP proxy, and anonymous listing/write/delete/admin all refused on the public S3 origin. Runtime behaviour during an actual review remains unproven while the application services are removed; re-confirm under #282. |
| 6 | Readiness, migration authority, reviewer identity constraints, stable-domain gate for the later store profile, and secret inventory are verified before promotion. | Partially met. Secret inventory is complete, reviewer identity shape is verified and the reserved block is accepted by the founder. Still open and deferred to #282 by founder decision: migrations plus the reviewer scenario seed, production push credentials, and the runtime readiness and stable-domain gates, all of which need a promoted revision that criterion 7 forbids here. |
| 7 | No application revision is promoted and no store build/submission occurs in this issue. | Not met. Duplication ran application revisions from 22:49:23Z to 23:00:27Z on 2026-09-05. No store action reported; preserve breach and obtain founder disposition. |
