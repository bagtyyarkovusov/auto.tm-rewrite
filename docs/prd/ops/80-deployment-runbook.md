# 80 — Deployment runbook

The end-to-end procedure for shipping a new version of AutoTM. There are two operating eras:

1. **Railway era (ADR-0039):** staging + reviewer-only production until both stores approve and the TM cutover gates are met. GitHub Actions owns CI; Railway builds/deploys after CI.
2. **TM era (ADR-0005):** permanent TM-serving production uses the air-gapped bundle procedure later in this document. Railway remains non-TM staging.

Until Sprint 11 closes, the Railway section is the target operating contract rather than evidence that a live environment exists.

## Pre-flight checklist

Before kicking off a release:

- [ ] Migrations: every new schema change has a Prisma migration file
- [ ] Tests pass on the self-hosted CI runner
- [ ] No `console.log` in API code (or it's intentional and on `LOG_LEVEL=debug`)
- [ ] `CHANGELOG.md` (or release notes) updated
- [ ] Verify the date-time + version tag in `package.json` matches what's intended
- [ ] Back up the target environment database BEFORE deploying (safety net for migration failures)
- [ ] Confirm current beta feature-flag values are recorded before deploy (`SIGNUPS_ENABLED`, `LISTING_PUBLISH_ENABLED`, `LISTING_MUTATIONS_ENABLED`, `CONTACT_ENABLED`, `REPORT_ENTRY_ENABLED`, `ADMIN_MODERATION_ACTIONS_ENABLED`)
- [ ] For schema-changing deploys, confirm the last successful restore drill used a staging/prod-like database + media backup less than 30 days old

## Railway era — staging and reviewer-only production

### Step 1 — CI gate and revision selection

1. Merge to `main` only after the required GitHub Actions check passes on `tm-build-mac`.
2. Railway staging follows `main` with **Wait for CI** enabled. A failed required check must not create a staging deployment.
3. Record the git SHA selected by the staging deployment.
4. Production has no branch autodeploy. Select only the exact SHA that passed the staging smoke and require a human production approval.

Railway owns build + deploy, not the test gate. Preview environments are optional and are not a substitute for permanent staging.

### Step 2 — Build, migrate, and become ready

Each environment has `api`, `worker`, `admin`, `web`, Postgres, Redis, and MinIO. `sms-gateway` and `phone-agent` do not run on Railway.

- Build each application from the monorepo root so shared workspaces and lockfiles remain in the build context.
- Use service-specific start commands and versioned Railway configuration where supported.
- Run `prisma migrate deploy` through the single release authority defined by Sprint 11. Never use `migrate dev` or `db push`.
- Do not route traffic until API dependency-readiness and web/admin health checks pass. A worker queue/bootstrap failure must fail the deployment or page the operator through deploy status/logs.
- Use private Railway networking for Postgres, Redis, and MinIO writes. Public exposure is limited to API, admin, web, and required media reads.

Schema changes must support independently rolling services. A rollback restores the previous application revision; it does not reverse migrations.

### Step 3 — Staging smoke

Against the staging mobile/internal build:

1. Confirm `/healthz` and dependency readiness.
2. Verify migration status and the deployed git SHA.
3. Sign in with two distinct demo identities.
4. Browse/create a seeded listing, upload/read media, exchange rich chat, and verify report → admin action → audit → public enforcement.
5. Put the recipient offline and verify native direct-message push + conversation deep link on both required platforms.
6. Confirm public signup is disabled, `SMS_DRIVER=mock`, response-embedded OTP test mode is disabled, and no service references production data resources.

### Step 4 — Manual production deploy

1. Select the staging-proven SHA; do not deploy an unverified moving branch head.
2. Confirm the stable AutoTM-owned API/media domains when producing a store-candidate binary. Railway generated domains are acceptable only for staging/internal builds.
3. Confirm production-only secret references and feature flags without printing their values.
4. Approve the production deployment manually.
5. Repeat the integrated reviewer smoke against production and record SHA, deployment/build identifiers, migration state, timestamps, and result.

Production remains reviewer-only: 3–5 reserved buyer/seller demo accounts, no real users, no real SMS, and no admin-capable reviewer identity.

### Step 5 — Railway rollback and restore

- **Application rollback:** redeploy the last known-good Railway application revision and repeat health + focused smoke checks.
- **Migration response:** forward-fix is preferred. Never assume application rollback undoes a schema migration.
- **Data restore:** restore Postgres and media into an isolated/non-production target first, run current migrations, and verify auth/listing/chat/report/media reads before declaring the path usable.
- Record restore point, data scope, start/end time, operator, result, and any recovery gap.

### Step 6 — Cutover boundary

Railway production is torn down only after all ADR-0039 cutover conditions pass: both stores approved, Railway-production confirmation pass, trusted TM presence, and racked TM hardware. DNS then moves the stable AutoTM-owned hosts to the ADR-0005 topology. Railway staging remains.

## TM era — air-gapped production

### Step 1 — Build the bundle (on self-hosted runner)

```
# Trigger build via GitHub Actions
# - Either: push to main → workflow runs automatically
# - Or: gh workflow run build.yml --ref main

# What happens:
# 1. Runner (TM Proxy PC or your laptop) checks out main
# 2. pnpm install
# 3. turbo run build  (parallel, cached)
# 4. turbo run test
# 5. docker build for each app (api, admin, web, sms-gateway, worker)
# 6. docker save → auto-tm-release-v<version>.tar.gz
# 7. Upload to GitHub Release as artifact OR write to local path
```

Output: `auto-tm-release-v<version>.tar.gz` (~400-700 MB)

If the build is the first one OR base images changed:
```
make bundle-base   # includes postgres, redis, minio, caddy, observability stack
```
Larger bundle (~1.5-2 GB) — ship once, then app-only bundles after.

### Step 2 — Transfer to TM

Three options depending on what's available:

### Option A — SCP from TM Proxy PC (intra-Telecom, fastest)

If the runner was the TM Proxy PC:
```bash
scp /releases/auto-tm-release-v<version>.tar.gz tm-server-a:/opt/auto-tm/releases/
```

### Option B — SCP from your computer abroad

If you're in China / abroad:
```bash
# From your laptop:
scp ./auto-tm-release-v<version>.tar.gz tm-server-a:/opt/auto-tm/releases/
```

Slower (international link), but works because TM VMs accept inbound SSH.

### Option C — USB drive (offline fallback)

If all else fails: write to encrypted USB, take to AutoTM office, plug into Server A.

### Step 3 — Verify checksum on TM side

```bash
ssh tm-server-a
cd /opt/auto-tm/releases
sha256sum -c auto-tm-release-v<version>.tar.gz.sha256
# expect: OK
```

If checksum fails, the transfer corrupted; redo.

### Step 4 — Deploy

```bash
cd /opt/auto-tm
sudo ./deploy.sh v<version>
```

The `deploy.sh` script:

1. Validates the bundle (integrity, expected files)
2. `tar -xzf releases/auto-tm-release-v<version>.tar.gz -C staging/`
3. `docker load < staging/images.tar`
4. Updates `compose/docker-compose.prod.yml` to reference new image tags
5. `docker compose -f compose/docker-compose.prod.yml up -d`
   - Rolling restart: containers replaced one by one
   - Prisma migrations run at container start (`migrate deploy`)
   - Caddy front-end routes traffic to new containers as they pass health checks
6. Old image tags kept for rollback (last 3 versions retained)
7. Writes deploy entry to `deploy-log.txt`

Expected duration: 2-5 minutes from `deploy.sh` to all green.

### Step 5 — Verify

The local-host `curl` lines below run **on TM Server A** and hit the docker port-mappings published by `compose/docker-compose.prod.yml` (api → 3006, admin → 3001, web → 3002). These are container-port conventions, not dev-machine ports — they match the dev `.env.template` defaults so the same runbook works in both environments. ADR-0018 covers the API port choice.

If you are anywhere other than TM Server A, use the Caddy-fronted external URLs (`https://api.auto.tm/healthz` etc).

```bash
# On TM Server A:
docker ps                                    # all containers up
curl -s http://localhost:3006/healthz        # api healthy (container 3006 → host)
curl -s http://localhost:3001/healthz        # admin healthy (container 3001 → host)
curl -s http://localhost:3002/healthz        # web healthy (container 3002 → host)

# Check migrations applied
docker exec -it auto-tm-api npx prisma migrate status

# Spot-check a real endpoint through Caddy (works from anywhere with network access)
curl -s https://api.auto.tm/api/v1/listings?limit=1 | jq
```

Check Grafana dashboard:
- API error rate < 1%
- DB connections in normal range
- WebSocket connections re-established

For MLP beta, WebSocket/push checks apply only if rich chat or native push has shipped. If S6 is still text-only HTTP contact and notifications are still post-MLP, verify contact-message send/list instead.

### Step 6 — Smoke test (manual)

On your phone:
1. Open mobile app
2. Sign in with phone OTP (verify SMS gateway works)
3. Browse listings (verify feed renders)
4. Tap a listing (verify detail loads)
5. Create or edit a listing if listing mutations are enabled
6. Send a contact/message if contact is enabled
7. Verify disabled-feature copy if any beta kill switch is intentionally off

On admin:
1. Open `admin.auto.tm`
2. Sign in (OTP + TOTP)
3. Load reports and audit
4. If moderation actions are enabled, run the deterministic report -> admin action -> audit -> public enforcement smoke on seeded/staging data

## Rollback

If something is broken:

```bash
cd /opt/auto-tm
sudo ./rollback.sh
```

The `rollback.sh`:
1. Reverts `docker-compose.prod.yml` to previous version's image tags
2. `docker compose up -d` (replaces containers with old images)
3. **Migrations are NOT auto-reverted** — if the broken release had a migration, you must:
   - Hotfix forward (write a new migration that fixes the issue), OR
   - Restore DB from the pre-deploy backup if the migration was destructive

Forward-fix is almost always preferred. Restoring from backup is destructive of any data written between deploy and rollback.

## Restore drill

A restore drill is required before private beta and at least once every 30 days while beta data matters. It runs against staging or a prod-like clone, never directly over production as a test.

Minimum successful drill:

1. Take or select a recent production-like Postgres backup.
2. Restore it into an isolated database.
3. Run migrations to the currently deployed version.
4. Start API against the restored database.
5. Verify health, login with a test user, listing read, contact read/write if enabled, admin TOTP login, report list, audit list, and a sample media object reference.
6. Record backup timestamp, restore start/end time, operator, result, and any data gaps.

If restore fails or takes too long for beta operations, private beta launch is blocked until the backup path is fixed or the risk is explicitly accepted in the S8 closeout.

## Post-deploy

- Update `CHANGELOG.md` with the version + summary
- Telegram message to AutoTM channel: "v0.X.Y deployed — <summary>"
- Monitor Grafana for 30 min
- Close any deployment-related GitHub issues
- Record whether rollback, restore, alert, and feature-flag drills remain current for the launch gate

## When NOT to deploy

- Friday afternoons (no on-call coverage over weekend)
- During known TM Telecom outages (your SSH would fail; deploy could partially apply)
- Without backups verified < 6 hours old
- Without testing the exact revision on Railway staging first

## References

- [ADR-0004 — Migrations](../../adr/0004-migrations.md)
- [ADR-0005 — Hosting](../../adr/0005-hosting.md)
- [ADR-0039 — Phased cloud-first hosting](../../adr/0039-phased-cloud-first-hosting.md)
- [Sprint 11 — Railway deployment](../sprints/sprint-11-railway-deployment.md)
- `infra/compose/docker-compose.prod.yml`
- `infra/deploy.sh` (lives on TM server, not in repo)
