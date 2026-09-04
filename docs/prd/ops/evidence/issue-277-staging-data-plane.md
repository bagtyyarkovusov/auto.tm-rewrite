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
| Evidence status | Pending human provider verification |
| Environment | `staging` |
| Tested commit SHA | `<fill with git SHA>` |
| Railway workspace | `<workspace name or id>` |
| Railway project | `<project name or id>` |
| Railway environment id | `<staging environment id>` |
| Founder/operator selection reference | `<issue comment / chat / approval reference>` |
| Selected target confirmed before mutation at | `<UTC timestamp>` |
| Operator | `<human operator>` |
| Verification started at | `<UTC timestamp>` |
| Verification completed at | `<UTC timestamp>` |

## Prerequisites

- [x] Issue #271 is closed: deployable runtime and migration contract exists.
- [x] Issue #272 is closed: MinIO bootstrap, access, backup, and restore
  contract exists.
- [x] Codex preflight checked current Railway docs through Context7:
  `/railwayapp/docs`.
- [ ] Founder/operator explicitly selected issue #277 for provider-side
  provisioning before any mutation.
- [ ] Railway project is the ADR-0039 project with exactly `staging` and
  `production` environments.
- [ ] Local/provider context points at the intended project before any
  mutation.

## Provider Resources

Record provider identifiers only. Do not record URLs that embed credentials.

| Resource | Expected shape | Provider evidence |
|---|---|---|
| Postgres | Environment-local staging database; kept awake | `<service id/name>` |
| Redis | Environment-local staging Redis; kept awake | `<service id/name>` |
| MinIO | One staging service; S3 API on `9000`; console on `9001` private-only | `<service id/name>` |
| MinIO volume | Exactly one persistent volume mounted at `/data` | `<volume id/name>` |

## Variable References

Confirm variables exist as Railway references or secret-store values without
printing values.

| Variable | Services | Expected source | Verified |
|---|---|---|---|
| `DATABASE_URL` | `api`, `worker` | Railway Postgres reference variable | [ ] |
| `REDIS_URL` | `api`, `worker` | Railway Redis reference variable | [ ] |
| `MINIO_ENDPOINT` | `api`, `worker` | Private MinIO S3 API origin | [ ] |
| `MINIO_PUBLIC_URL` | `api`, `worker`, `admin`, `web` | Public S3 API origin for anonymous reads and signed PUT URLs | [ ] |
| `MINIO_ACCESS_KEY` | `api`, `worker` | Secret-store value | [ ] |
| `MINIO_SECRET_KEY` | `api`, `worker` | Secret-store value | [ ] |
| `MINIO_REGION` | `api`, `worker` | `us-east-1` unless provider behavior requires another signing region | [ ] |

## MinIO Exposure Boundary

- [ ] MinIO console/admin UI is not exposed publicly.
- [ ] Administrative or unsigned write surface is not public.
- [ ] Private endpoint is used for server-side S3 operations.
- [ ] Public endpoint is used only for anonymous media GET and API-signed
  direct client PUT URLs.
- [ ] `MINIO_ENDPOINT` and `MINIO_PUBLIC_URL` are distinct hosts in staging.

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
| First bootstrap creates or converges buckets | `<pass/fail + timestamp>` |
| Second bootstrap is idempotent | `<pass/fail + timestamp>` |
| Anonymous bucket policy grants `s3:GetObject` only | `<pass/fail + timestamp>` |
| Anonymous `PutObject` is not granted | `<pass/fail + timestamp>` |

## Persistence And Access Smoke

Use non-sensitive throwaway objects only. Object keys may be recorded; object
contents must not contain secrets or user data.

| Check | Result |
|---|---|
| Upload throwaway object through signed PUT | `<pass/fail + object key>` |
| Read throwaway object anonymously through public URL | `<pass/fail>` |
| Restart or redeploy MinIO service | `<deployment id + timestamp>` |
| Read same object after restart/redeploy | `<pass/fail>` |
| Delete throwaway object after proof | `<pass/fail>` |

## Acceptance Criteria Mapping

- [ ] Staging has environment-local Postgres and Redis kept awake.
- [ ] Staging MinIO has exactly one persistent volume at `/data`.
- [ ] MinIO has separate private server and public signing/read endpoints.
- [ ] MinIO console/admin and unsigned writes are not public.
- [ ] Anonymous media GET works through the approved boundary.
- [ ] Signed client PUT works through the approved boundary.
- [ ] Bucket bootstrap succeeds idempotently.
- [ ] Persistence survives a restart/redeploy check.
- [ ] Secret values and connection strings are absent from git, issue comments,
  screenshots, logs, and this file.
- [ ] Evidence records environment, service identifiers, timestamp, and tested
  commit without secrets.

## Follow-on Inputs For Issue 278

After this checklist is complete, issue #278 can deploy staging applications
against this data plane. Pass only these secret-free references forward:

- Staging project/environment identifiers.
- Staging service identifiers for Postgres, Redis, and MinIO.
- Public MinIO host name, if it contains no credentials.
- The tested commit SHA.
- The completed checklist result.
