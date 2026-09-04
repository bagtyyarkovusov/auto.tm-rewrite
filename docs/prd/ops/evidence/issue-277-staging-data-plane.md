# Issue 277 — Staging Data Plane Evidence

Secret-free evidence checklist for GitHub issue
[#277](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/277), the
human-operated Railway staging Postgres, Redis, and persistent MinIO data-plane
slice.

Do not paste Railway connection strings, access keys, secret keys, reviewer
codes, dashboard screenshots containing values, or provider logs containing
secret values into this file, GitHub issues, PRs, or chat. Record names,
service identifiers, variable names, timestamps, command names, and pass/fail
results only.

## Context

| Field | Value |
|---|---|
| Evidence status | Complete — provider checks and human verification passed |
| Environment | `staging` |
| Tested commit SHA | `23dd0a98c7cee53f51c4909cccc860f632abd8b1` |
| Railway workspace | `eff4b459-402e-4e63-8fe4-8cc24b97e578` |
| Railway project | `auto-tm` (`176ddec0-dd65-4087-b82c-798599fc2ebe`) |
| Railway environment id | `652abc79-fdb0-48b0-9f6c-ad0ff572d7b2` |
| Founder/operator selection reference | Codex task instruction to complete issue #277 on 2026-09-05 |
| Selected target confirmed before mutation at | `2026-09-04T20:57:02Z` |
| Operator | Founder-authorized Codex Railway session `railway-skill-20260905-issue277` |
| Human verifier | GitHub owner `bagtyyarkovusov`, confirmed in the Codex task on 2026-09-05 |
| Verification started at | `2026-09-04T20:57:02Z` |
| Verification completed at | `2026-09-04T21:05:55Z` |

## Prerequisites

- [x] Issue #271 is closed: deployable runtime and migration contract exists.
- [x] Issue #272 is closed: MinIO bootstrap, access, backup, and restore
  contract exists.
- [x] Codex preflight checked current Railway docs through Context7:
  `/railwayapp/docs`.
- [x] Founder/operator explicitly selected issue #277 for provider-side
  provisioning before any mutation.
- [x] Railway project is the ADR-0039 project with exactly `staging` and
  `production` environments.
- [x] Local/provider context points at the intended project before any
  mutation.

## Provider Resources

Record provider identifiers only. Do not record URLs that embed credentials.

| Resource | Expected shape | Provider evidence |
|---|---|---|
| Postgres | Environment-local staging database; kept awake | `Postgres` / `30dda76c-1a50-457f-a08a-dce846eb9843` |
| Redis | Environment-local staging Redis; kept awake | `Redis` / `bde03eb2-23df-4e3c-9fda-997621632b26` |
| MinIO | One staging service; S3 API on `9000`; console on `9001` private-only | `MinIO` / `af9ecdec-433b-48f0-8457-1a13c5ab1ab7` |
| MinIO volume | Exactly one persistent volume mounted at `/data` | `minio-volume-mr74` / `c795022f-f34d-4b87-b1ae-9b30bffa5f8f` |

## Variable References

Confirm variables exist as Railway references or secret-store values without
printing values.

Application-service wiring happens when issue #278 creates `api`, `worker`,
`admin`, and `web`. This table verifies the names and provider references that
#278 must use; it does not create empty application services early.

| Variable | Services | Expected source | Contract verified |
|---|---|---|---|
| `DATABASE_URL` | `api`, `worker` | `${{Postgres.DATABASE_URL}}` | [x] |
| `REDIS_URL` | `api`, `worker` | `${{Redis.REDIS_URL}}` | [x] |
| `MINIO_ENDPOINT` | `api`, `worker` | Private MinIO S3 API origin | [x] |
| `MINIO_PUBLIC_URL` | `api`, `worker` | `https://minio-staging-5795.up.railway.app` | [x] |
| `NEXT_PUBLIC_MINIO_PUBLIC_URL` | `admin`, `web` | `https://minio-staging-5795.up.railway.app` at build time | [x] |
| `MINIO_ACCESS_KEY` | `api`, `worker` | Reference to the provider-only MinIO root-user value | [x] |
| `MINIO_SECRET_KEY` | `api`, `worker` | Reference to the provider-only MinIO root-password value | [x] |
| `MINIO_REGION` | `api`, `worker` | `us-east-1` | [x] |

## MinIO Exposure Boundary

- [x] MinIO console/admin UI is not exposed publicly. Railway has one MinIO
  domain, and it targets S3 port `9000`; port `9001` has no domain.
- [x] Administrative or unsigned write surface is not public. Anonymous PUT
  returned HTTP `403`.
- [x] Private endpoint is reserved for server-side S3 operations through the
  MinIO service's Railway private-network domain.
- [x] Public endpoint is used only for anonymous media GET and API-signed
  direct client PUT URLs.
- [x] `MINIO_ENDPOINT` and `MINIO_PUBLIC_URL` are distinct hosts in staging:
  Railway private networking versus `minio-staging-5795.up.railway.app`.

## Bucket Bootstrap

Run the bootstrap against staging through the intended private MinIO endpoint
from an approved Railway/operator context:

```sh
pnpm minio:bootstrap
```

Expected buckets:

- `listing-photos`
- `listing-videos`
- `chat-attachments`

Evidence:

| Check | Result |
|---|---|
| First bootstrap creates or converges buckets | Pass, `2026-09-04T21:04Z`; created all three buckets |
| Second bootstrap is idempotent | Pass, `2026-09-04T21:04Z`; verified all three buckets |
| Anonymous bucket policy grants `s3:GetObject` only | Pass, anonymous GET returned HTTP `200` with matching body |
| Anonymous `PutObject` is not granted | Pass, unsigned PUT returned HTTP `403` |

## Persistence And Access Smoke

Use non-sensitive throwaway objects only. Object keys may be recorded; object
contents must not contain secrets or user data.

| Check | Result |
|---|---|
| Upload throwaway object through signed PUT | Pass, `issue-277-persistence-proof.txt`, HTTP `200` |
| Read throwaway object anonymously through public URL | Pass, HTTP `200`, body matched |
| Restart or redeploy MinIO service | `5266a5b3-b7bf-4f68-b17d-2051249d7ec6`, `2026-09-04T21:05:01Z` |
| Read same object after restart/redeploy | Pass, HTTP `200`, body matched |
| Delete throwaway object after proof | Pass |

## Acceptance Criteria Mapping

- [x] Staging has environment-local Postgres and Redis kept awake.
- [x] Staging MinIO has exactly one persistent volume at `/data`.
- [x] MinIO has separate private server and public signing/read endpoints.
- [x] MinIO console/admin and unsigned writes are not public.
- [x] Anonymous media GET works through the approved boundary.
- [x] Signed client PUT works through the approved boundary.
- [x] Bucket bootstrap succeeds idempotently.
- [x] Persistence survives a restart/redeploy check.
- [x] Active secret values and connection strings are absent from git, issue
  comments, screenshots, logs, and this file. The founder accepted the rotated
  initial credential remediation in the Codex task on 2026-09-05.
- [x] Evidence records environment, service identifiers, timestamp, and tested
  commit without secrets.

During initial provisioning, a configuration read printed the first generated
credential set into the private operator transcript. No data had been written.
The operator deleted those three services and their empty volumes, then created
the replacement services identified above with newly generated credentials.
Only the replacement resource IDs and non-secret verification results are
recorded here. The founder accepted deletion and credential rotation as
sufficient remediation in the Codex task on 2026-09-05.

## Follow-on Inputs For Issue 278

After this checklist is complete, issue #278 can deploy staging applications
against this data plane. Pass only these secret-free references forward:

- Staging project/environment identifiers.
- Staging service identifiers for Postgres, Redis, and MinIO.
- Public MinIO host name, if it contains no credentials.
- The tested commit SHA.
- The completed checklist result.
