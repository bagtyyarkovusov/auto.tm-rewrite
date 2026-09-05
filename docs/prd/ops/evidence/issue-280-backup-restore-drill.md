# Issue 280 — Isolated Postgres and Media Backup/Restore Drill

Secret-free evidence for GitHub issue
[#280](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/280), the
human-operated resilience proof: back up non-production Postgres and MinIO
data, restore both into isolated temporary targets, verify migration status,
reviewer-scenario integrity, and media checksums, and record recovery evidence
without touching production.

Do not paste connection strings, access keys, root passwords, TCP-proxy
credentials, reviewer codes, JWT/TOTP secrets, or provider logs containing
secret values into this file, GitHub issues, PRs, or chat. Record names,
resource identifiers, variable names, timestamps, command names, counts,
digests, and pass/fail results only.

## Context

| Field | Value |
|---|---|
| Evidence status | **Drill executed; founder verified.** Postgres and media both restored into isolated targets, all integrity and checksum checks green, temporary resources destroyed. The founder verified the recovery evidence and non-destructive scope in the Codex review thread on `2026-09-05T20:12:16Z` |
| Environment exercised | `staging` (source read-only apart from the two throwaway objects recorded below) + isolated temporary targets in the same environment |
| Production touched | **No.** The `production` environment contained zero services before, during, and after the drill |
| Drill commit SHA | `d1471212079ffccb6f9ea4cce66bfb1f7f98acff` |
| Railway workspace | `eff4b459-402e-4e63-8fe4-8cc24b97e578` |
| Railway project | `auto-tm` (`176ddec0-dd65-4087-b82c-798599fc2ebe`) |
| Railway environment id | `652abc79-fdb0-48b0-9f6c-ad0ff572d7b2` (`staging`) |
| Production environment id | `93cb9126-de04-493e-95ec-6296470c4d7d` (verified empty, untouched) |
| Founder/operator selection reference | Founder instruction to implement issue #280 on 2026-09-05 |
| Operator | Founder-authorized agent Railway session `railway-skill-20260905-issue280` |
| Founder authorization | Founder (`bagtyyarkovusov`), 2026-09-05 — approved creating the isolated Railway targets, selected **delete after evidence** as the cleanup decision, and approved widening the media half with throwaway objects |
| Human verifier | Founder (`bagtyyarkovusov`), verified in the Codex review thread on `2026-09-05T20:12:16Z` |
| Procedure version | `docs/prd/ops/80-deployment-runbook.md` "Restore drill" as of this commit; corrections from this drill are folded into the same PR |
| Drill started at | `2026-09-05T19:32:27Z` |
| Drill execution finished at | `2026-09-05T19:49:00Z` (last recorded action: drill-volume deletion at `19:48Z`) |

## Prerequisites

- [x] Issue #272 is merged: MinIO bootstrap/backup/restore contract exists
      (`infra/minio/*`, `pnpm minio:backup`, `pnpm minio:restore`).
- [x] Issue #278 is closed: live staging applications and data plane exist
      (`docs/prd/ops/evidence/issue-278-staging-applications.md`).
- [x] Current Railway procedures checked through Context7 (`/railwayapp/docs`)
      at execution time: Postgres backup/restore guide, TCP proxy CLI, volume
      backup API, and `railway postgres pitr` commands.
- [x] Founder explicitly selected issue #280 and approved the isolated targets
      before any mutation.

## Isolation Model

The drill restores into **separate database and object-storage instances with
their own volumes**, created for this drill and destroyed afterwards. They live
in the `staging` environment because Railway private networking is
environment-scoped, and the backup path needs private-network reachability from
the restore target to the source. Data isolation is what the drill requires and
it holds: nothing is written back to the source, and the two targets share no
storage with any live service.

| Temporary resource | Provider id | Purpose | Disposition |
|---|---|---|---|
| Postgres restore target `Postgres-gGkQ` | `5b9c2d39-1de7-47c9-adda-a0e14644da5e` | Isolated database restore target | Deleted |
| Its volume (`/var/lib/postgresql/data`) | `10998cbe-110f-43ba-90d4-9b7c7746070d` | Restored database storage | Deleted with the service |
| Its TCP proxy (application port `5432`) | Railway-generated proxy port `31590` | Off-platform reach for `prisma migrate status` / `deploy` | Deleted with the service |
| MinIO restore target `issue-280-minio-drill` | `866be8d6-4bff-4784-b207-a12c21027729` | Isolated media restore target | Deleted |
| Its volume `issue-280-minio-drill-volume` (`/data`) | `0b5f9fcf-0e61-44e4-b14e-3e572debd951` | Restored media storage | Deleted with the service |
| Its generated domain (target port `9000`) | `issue-280-minio-drill-staging.up.railway.app` | Anonymous GET / unsigned PUT access-behaviour proof | Deleted with the service |
| Local Redis container `issue280-drill-redis` | `redis:7-alpine`, host port `63790` | Dependency for the API boot against restored data; never the staging Redis | Removed |

Railway's `railway add --service <name>` ignores the requested service name, so
the Postgres target kept its generated name `Postgres-gGkQ`. Railway exposes no
rename operation through the CLI, the MCP tools, or the Railway agent, so the
generated name is recorded here rather than corrected.

The restore target read the source database through a Railway **variable
reference** (`SOURCE_DATABASE_URL=${{Postgres.DATABASE_URL}}`) set on the
temporary service only. No connection string was ever printed, copied, or
handled by the operator, and no variable on any live service was changed.

## Non-Destructive Scope

- [x] Source Postgres (`Postgres` / `30dda76c-1a50-457f-a08a-dce846eb9843`) was
      read-only throughout: `pg_dump` plus `SELECT`-only verification queries.
- [x] No migration was reversed. `prisma migrate deploy` on the restored target
      reported **"No pending migrations to apply."**
- [x] Source MinIO (`MinIO` / `af9ecdec-433b-48f0-8457-1a13c5ab1ab7`) was read
      via `ListObjectsV2` / `GetObject` / `GetBucketPolicy`, with the single
      exception of the two throwaway objects recorded below, which were written
      under a dedicated `issue-280-drill/` prefix and deleted afterwards. No
      pre-existing object was overwritten or deleted. `minio:restore` was
      pointed exclusively at the isolated target.
- [x] The two throwaway drill objects written to staging before the backup (see
      below) were deleted afterwards; `issue-280-drill/` is empty in all three
      buckets.
- [x] No production resource was created, mutated, or deleted. The `production`
      environment held zero services at every check.
- [x] No live service's variables, deploy settings, domains, or volumes were
      modified.

### Throwaway objects added to widen the media drill

At the pre-drill survey (`19:32Z`) staging held media in `listing-photos` only —
2 objects, with `listing-videos` and `chat-attachments` empty. Two
deterministic, non-sensitive throwaway objects were therefore written to
`listing-videos` and `chat-attachments` through signed `PutObject` before the
backup (same pattern as issue #277), then deleted after the drill. They contain
HMAC-derived filler bytes, no user data.

By the time the backup ran at `19:38Z`, issue #279's concurrent staging work had
independently populated `chat-attachments` with 7 objects and grown
`listing-photos` to 47, so the throwaway objects were strictly necessary only
for `listing-videos`. They are retained in the record because they were part of
the executed drill and are covered by the checksum verification below.

| Key | Bucket | Size | SHA-256 |
|---|---|---|---|
| `issue-280-drill/throwaway-clip.mp4` | `listing-videos` | 65536 | `1b925b13…a5a969` |
| `issue-280-drill/throwaway-attachment.bin` | `chat-attachments` | 24576 | `3eb6242a…e47fbf` |

Deleted at `2026-09-05T19:45Z`; post-delete listing of prefix `issue-280-drill/`
returned 0 objects in every bucket.

## Postgres Backup And Restore

### Procedure actually executed

Source Postgres has no public TCP proxy, so both halves ran **inside Railway's
private network** from the temporary target's own container. No database bytes
crossed the public internet and no credential was handled by the operator.

```sh
# from the isolated restore target's container
railway ssh --service <restore-target> --environment staging -- sh -lc '
  pg_dump --format=custom --no-owner --no-acl \
    --file=/tmp/drill/issue-280.dump "$SOURCE_DATABASE_URL"
  pg_restore --no-owner --no-acl --exit-on-error \
    --dbname "$DATABASE_URL" /tmp/drill/issue-280.dump
'
```

The target schema was dropped and recreated (`drop schema public cascade`)
immediately before the measured run, so the restore started from an empty
database (`tables=0`) rather than converging onto leftovers.

### Timings and artifact

| Field | Value |
|---|---|
| Target reset confirmed | `tables=0` |
| Backup started | `2026-09-05T19:35:54Z` |
| Backup finished | `2026-09-05T19:35:54Z` (`0 s`) |
| Dump size | `95545` bytes |
| Dump SHA-256 | `ca289cb125f4c365bb9fc9ef4e8946dd0de84cc7d973c49e8c39a45c269cbf9d` |
| Restore started | `2026-09-05T19:35:54Z` |
| Restore finished | `2026-09-05T19:35:55Z` (`1 s`) |
| Postgres recovery time (backup → restored) | **~1 s** for a ~10 MB database (`pg_database_size` 9910 kB; 95 KB compressed dump). Both phases completed inside the 1-second resolution of the recorded timestamps, so this is an upper bound, not a measured duration |
| Server version (source and target) | PostgreSQL 18.6 (`postgres-ssl:18` image on both) |

### Concurrency note

Issue #279 was exercising the same staging environment in parallel, so the
source row counts moved during the drill window. The drill therefore captured
source snapshots **immediately before and immediately after** the dump. Both
snapshots were identical, which pins the dump-time state unambiguously; the
restored target matched that state exactly.

### Migration state on the restored target

| Check | Command | Result |
|---|---|---|
| Migration status | `prisma migrate status` | **Pass** — `14 migrations found`, *"Database schema is up to date!"* |
| Forward-only idempotence | `prisma migrate deploy` | **Pass** — *"No pending migrations to apply."*; no migration reversed |
| Applied / failed rows | `_prisma_migrations` | `14` applied, `0` failed or rolled back |
| Latest migration | — | `20260719010000_align_prisma_schema_with_existing_database` |

### Row-count equality — all 36 tables

Source `T0` (pre-dump), source `T1` (post-dump), and the restored target were
byte-identical across every table:

```text
_prisma_migrations=14 audit_logs=40 blocked_users=0 blog_posts=0 body_types=0
brands=1 cities=1 colors=0 content_reports=4 conversation_participants=12
conversations=6 dealership_members=0 dealerships=0 drive_types=0 engine_types=0
exchange_rates=0 favorites=0 fcm_devices=0 generations=0 inspection_interests=0
listing_drafts=0 listing_media=5 listings=7 messages=16 models=1
notification_history=0 notification_preferences=0 otp_requests=3
owned_vehicles=0 regions=1 saved_searches=0 sessions=28 totp_backup_codes=10
totp_enrollments=1 transmissions=0 users=4
```

| Comparison | Result |
|---|---|
| Source `T0` vs source `T1` | Identical — dump-time state unambiguous |
| Source vs restored target, all 36 tables | **Identical** |

### Schema-structure equality

| Metric | Source | Restored target |
|---|---|---|
| Tables | 36 | 36 |
| Columns | 297 | 297 |
| Primary keys | 36 | 36 |
| Foreign keys | 43 | 43 |
| Indexes | 84 | 84 |
| Enum types | 10 | 10 |
| Column-shape digest (md5 of name/type/nullability across all columns) | `d1976a85cd91e52415c613ecd1929ca7` | `d1976a85cd91e52415c613ecd1929ca7` |

### Reviewer-scenario integrity

Checked against the fixed scenario UUIDs in
`packages/db/src/reviewer-scenario-seed.ts`. Digests are md5 over ordered
non-secret columns; phone numbers are shape-masked (`+NNNNNNNNNNN`) before
hashing so no reviewer phone value is derivable from this file.

| Check | Source | Restored target | Result |
|---|---|---|---|
| Reserved reviewer users present | 3 | 3 | Pass |
| Reviewer roles | `buyer,seller` only (no admin) | `buyer,seller` only | Pass |
| Reviewer listings (primary + reportable) | 2 | 2 | Pass |
| Reviewer conversation | 1 | 1 | Pass |
| Reviewer conversation participants | 2 | 2 | Pass |
| Reviewer messages | 4 | 4 | Pass |
| Reviewer content report | 1 | 1 | Pass |
| Reviewer user digest | `bf2ae353e8343e90f842f93417686015` | same | Pass |
| Reviewer listing digest | `0422a589a729679687c89b2426fd9ebf` | same | Pass |
| Reviewer message digest | `02636e6078282501515443ab471c65ca` | same | Pass |
| Reviewer report digest | `0583797a826844d6295726f38d7b71c8` | same | Pass |
| Referential integrity — conversation ⋈ listing ⋈ buyer ⋈ seller ⋈ participants ⋈ messages | 8 rows | 8 rows | Pass |
| Referential integrity — report ⋈ target listing ⋈ reporter | 1 row | 1 row | Pass |

Only 3 of the 5 reserved reviewer slots were seeded in staging at drill time;
completing the reserved-account set belongs to issue #279. The drill proves
restore fidelity for whatever the source holds, not seed completeness.

### API boot against the restored database

Per the runbook's restore drill, the API was started against the **restored**
database (plus the restored media target and a throwaway local Redis) and read
back reviewer content.

| Check | Result |
|---|---|
| API process start | Pass — Nest boot completed against the restored database |
| `GET /healthz` | `200`, `{"status":"ok"}`, reports drill commit SHA |
| `GET /readyz` | `200 ready` with `postgres=ok redis=ok minio=ok` (see note) |
| `GET /api/v1/listings?limit=3` | `200`, returned the reviewer reportable listing `e2354d2f…` |
| `GET /api/v1/listings/e042b037-…` (reviewer primary listing) | `200` |
| `GET /api/v1/catalog/brands` | `200`, returned the reviewer catalogue brand `autotm-reviewer` |
| Media read through the restored public origin | `200`, bytes matched the manifest checksum |

**`/readyz` latency note (not a defect).** `READINESS_CHECK_TIMEOUT_MS` is
`1500` per check, sized for in-datacenter latency. The API in this drill ran on
an operator laptop reaching Postgres through a Railway TCP proxy and MinIO over
the public internet, so the first probes exceeded the budget and reported
`postgres=failed` / `minio=failed`. Once connections warmed, `/readyz` returned
`200 ready` with all three checks `ok` and stayed there. Deployed API instances
reach these dependencies over private networking and are unaffected. Off-platform
restore verification should expect the first one or two `/readyz` probes to be
false negatives.

Authenticated reviewer flows (login through the reserved-account bypass, chat,
report → moderation) were **not** exercised here: that requires reviewer codes
from the operator secret store and is the subject of issue #279. Reviewer data
integrity in this drill is proven at the data layer (digests, joins) and through
unauthenticated reads of the same records.

## Media Backup And Restore

### Procedure actually executed

```sh
# backup: staging source, read-only, through the public S3 origin with
# server-side credentials injected by Railway (never printed)
railway run --service api --environment staging -- \
  sh -c 'MINIO_ENDPOINT="$MINIO_PUBLIC_URL" node infra/minio/backup.mjs <dir>'

# restore: isolated target only
railway run --service <minio-restore-target> --environment staging -- \
  sh -c 'MINIO_ENDPOINT=<target origin> \
         MINIO_ACCESS_KEY="$MINIO_ROOT_USER" \
         MINIO_SECRET_KEY="$MINIO_ROOT_PASSWORD" \
         MINIO_REGION=us-east-1 node infra/minio/restore.mjs <dir>'
```

The restore target's root credentials were generated with `openssl rand` and
written straight into Railway variables without being printed.

### Timings and manifest

| Field | Value |
|---|---|
| Manifest format | `autotm-minio-backup-v1` |
| Manifest created at | `2026-09-05T19:38:24Z` |
| Backup started / finished | `2026-09-05T19:38:21Z` / `2026-09-05T19:38:40Z` (`19 s`) |
| Restore started / finished | `2026-09-05T19:38:47Z` / `2026-09-05T19:39:26Z` (`39 s`) |
| Media recovery time (backup → restored) | **65 s** end to end for 56 objects across 3 buckets (`19:38:21Z` → `19:39:26Z`): 19 s backup, a 7 s operator gap, 39 s restore |
| Buckets captured | `listing-photos`, `listing-videos`, `chat-attachments` |
| Objects captured | 56 |

### Checksum and access verification on the restored target

Verification was run as an **independent pass** after the restore, re-reading
every object from the target and comparing against the manifest — not merely
trusting the read-back check inside `infra/minio/restore.mjs`.

| Bucket | Manifested objects | Restored objects | Bucket policy on target |
|---|---|---|---|
| `chat-attachments` | 8 | 8 | anonymous `s3:GetObject` only |
| `listing-photos` | 47 | 47 | anonymous `s3:GetObject` only |
| `listing-videos` | 1 | 1 | anonymous `s3:GetObject` only |

| Check | Result |
|---|---|
| Objects re-read and checksummed | 56 of 56 |
| SHA-256 mismatches | **0** |
| Size mismatches | **0** |
| Extra objects on the target beyond the manifest | **0** |
| Restored object-set digest (sha256 over sorted `bucket/key:sha256`) | `8a397c0599d54ab0eed266d60ef73f657f64a91f5de1f2243dced4ec481663b0` |
| Bucket policy assertion (`assertPublicReadOnlyPolicy`) on every bucket | Pass |
| Anonymous GET of a restored object through the target's public origin | `200`, bytes matched the manifest checksum |
| Anonymous (unsigned) PUT to the target | `403` — refused |
| Signed restore write to the target | Pass — the restore itself performed 56 authenticated `PutObject` writes with the target's own credentials, every one of which was read back and checksum-verified. This proves the isolated target accepted authorized restore writes. Direct client presigned PUT was proven on staging in issue #277/#278 and was not re-proven against this deleted restore target |
| Target public origin serves the S3 API, not the console | `/minio/health/live` → `200`; the generated domain targets port `9000` only, `9001` has no domain |

## Acceptance Criteria Mapping

Boxes below record what the drill demonstrated. The founder verified this
evidence in the Codex review thread on `2026-09-05T20:12:16Z`, satisfying the
issue's human-verification completion signal.

- [x] A non-production Postgres backup restores into an isolated target and
      passes migration/status plus reviewer-scenario integrity checks —
      `migrate status` up to date, `migrate deploy` a no-op, all 36 table counts
      equal, schema digest equal, all four reviewer digests equal, both
      referential-integrity joins equal, and the API reads reviewer content back
      from the restored database. **Scope:** reviewer-scenario integrity is
      proven at the data layer plus unauthenticated reads. Authenticated
      reviewer flows (bypass login, chat, report → moderation) need reviewer
      codes from the operator secret store and belong to issue #279.
- [x] MinIO backup restores into an isolated target with checksum equality for
      all manifested objects and correct bucket access behaviour — 56/56 objects
      checksum-equal, 0 extras, anonymous GET `200`, authorized restore writes
      accepted (56 restore writes, all checksum-verified), unsigned PUT `403`,
      anonymous-read-only policy asserted per bucket. Direct client presigned
      PUT was covered by the staging data-plane/application smokes in #277/#278,
      not repeated against this deleted restore target.
- [x] The drill proves recovery without reversing a migration or overwriting
      staging/production source data — no migration reversed, no pre-existing
      source row or object read non-destructively altered, the two additive
      throwaway objects removed afterwards, restore pointed only at isolated
      targets, production untouched.
- [x] Recovery time, commands/procedure version, commit SHA, timestamps, counts,
      and checksums are recorded without secret values.
- [x] Temporary resources are handled according to the approved cleanup
      decision; no production resource is mutated.

### Not covered by this drill

- Authenticated reviewer flows against the restored database (issue #279).
- The reserved reviewer account set is incomplete in staging (3 of 5 slots
  seeded at drill time). That is a property of the source, not a restore
  failure; completing it is issue #279's work.
- Restoring a Railway **volume** snapshot, as opposed to logical Postgres and
  object-level media backups. Railway PITR is disabled, so no volume-level
  restore path was available to exercise.

## Cleanup

Founder-approved cleanup decision: **delete the temporary resources once the
evidence is recorded.** The drill is repeatable from the runbook, so retaining
billable resources adds cost without adding proof.

| Action | Result |
|---|---|
| Delete Postgres restore target `Postgres-gGkQ` (service, with its TCP proxy) | Done, `2026-09-05T19:47Z` |
| Delete MinIO restore target `issue-280-minio-drill` (service, with its generated domain) | Done, `2026-09-05T19:47Z` — the drill domain now returns `404` |
| Delete the two drill volumes | Done, `2026-09-05T19:48Z`. Deleting a service detaches its volume but does **not** delete it; both were deleted explicitly and now report `isPendingDeletion=true` (Railway soft-deletes volumes on a retention window) |
| Delete throwaway drill objects from staging buckets | Done, `2026-09-05T19:45Z` |
| Remove the local throwaway Redis container | Done |
| Confirm `staging` holds only the ADR-0039 service set | Confirmed: `Postgres`, `Redis`, `MinIO`, `api`, `worker`, `admin`, `web` |
| Confirm live volumes untouched | Confirmed: `postgres-volume-tbO8`, `redis-volume-YfzJ`, `minio-volume-mr74` still attached and not pending deletion |
| Confirm staging source media returned to its pre-drill state | Confirmed: `listing-photos=47`, `listing-videos=0`, `chat-attachments=7` |
| Confirm `production` still holds zero services | Confirmed |

Three unrelated detached volumes (`redis-volume`, `minio-volume`,
`postgres-volume`) were already pending deletion before this drill, left over
from the issue #277 credential-rotation remediation. They were not touched.

## Findings Folded Into The Runbook

Where the observed drill diverged from the documented procedure, the correction
went into [`../80-deployment-runbook.md`](../80-deployment-runbook.md) in the
same commit. The divergences, one line each:

1. Railway PITR is disabled, so `railway postgres pitr restore` is not an
   available recovery path.
2. The source database has no public TCP proxy, so the dump cannot be run from
   an operator machine.
3. The documented MinIO drill commands were localhost-only.
4. `/readyz` reports false negatives when the API is run off-platform.
5. Deleting a Railway service detaches but does not delete its volume.
6. `railway add --service <name>` ignores the requested name and Railway offers
   no rename, so drill resources must be identified by id.

## References

- Issue [#280](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/280) —
  this slice; [#279](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/279)
  ran concurrently against the same staging environment.
- [`../80-deployment-runbook.md`](../80-deployment-runbook.md) — restore drill
  procedure, corrected by this drill.
- [`issue-277-staging-data-plane.md`](issue-277-staging-data-plane.md) and
  [`issue-278-staging-applications.md`](issue-278-staging-applications.md) —
  the staging data plane and applications this drill read from.
- [ADR-0039](../../../adr/0039-phased-cloud-first-hosting.md) — phased
  cloud-first hosting; [ADR-0004](../../../adr/0004-migrations.md) — migrations.
- `infra/minio/contract.mjs`, `infra/minio/backup.mjs`, `infra/minio/restore.mjs`
  — the media backup/restore tooling exercised here.
- `packages/db/src/reviewer-scenario-seed.ts` — the fixed reviewer-scenario
  UUIDs the integrity digests are computed over.
