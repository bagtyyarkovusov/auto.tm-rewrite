# 80 — Deployment runbook

The end-to-end procedure for shipping a new version of AutoTM to production. **Air-gapped — no managed CD.**

## Pre-flight checklist

Before kicking off a release:

- [ ] Migrations: every new schema change has a Prisma migration file
- [ ] Tests pass on the self-hosted CI runner
- [ ] No `console.log` in API code (or it's intentional and on `LOG_LEVEL=debug`)
- [ ] `CHANGELOG.md` (or release notes) updated
- [ ] Verify the date-time + version tag in `package.json` matches what's intended
- [ ] Backup TM database BEFORE deploying (safety net for migration failures)

## Step 1 — Build the bundle (on self-hosted runner)

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

## Step 2 — Transfer to TM

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

## Step 3 — Verify checksum on TM side

```bash
ssh tm-server-a
cd /opt/auto-tm/releases
sha256sum -c auto-tm-release-v<version>.tar.gz.sha256
# expect: OK
```

If checksum fails, the transfer corrupted; redo.

## Step 4 — Deploy

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

## Step 5 — Verify

```bash
# On TM Server A:
docker ps                                    # all containers up
curl -s http://localhost:3006/healthz        # api healthy
curl -s http://localhost:3001/healthz        # admin healthy
curl -s http://localhost:3002/healthz        # web healthy

# Check migrations applied
docker exec -it auto-tm-api npx prisma migrate status

# Spot-check a real endpoint
curl -s https://api.auto.tm/api/v1/listings?limit=1 | jq
```

Check Grafana dashboard:
- API error rate < 1%
- DB connections in normal range
- WebSocket connections re-established

## Step 6 — Smoke test (manual)

On your phone:
1. Open mobile app
2. Sign in with phone OTP (verify SMS gateway works)
3. Browse listings (verify feed renders)
4. Tap a listing (verify detail loads)
5. Send a chat message (verify Socket.IO works)
6. Receive a push notification (verify FCM/APNS)

On admin:
1. Open `admin.auto.tm`
2. Sign in (OTP + TOTP)
3. Navigate dashboard (verify data renders)

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

## Post-deploy

- Update `CHANGELOG.md` with the version + summary
- Telegram message to AutoTM channel: "v0.X.Y deployed — <summary>"
- Monitor Grafana for 30 min
- Close any deployment-related GitHub issues

## When NOT to deploy

- Friday afternoons (no on-call coverage over weekend)
- During known TM Telecom outages (your SSH would fail; deploy could partially apply)
- Without backups verified < 6 hours old
- Without testing on staging first (Phase 2 — currently no staging environment)

## References

- [ADR-0004 — Migrations](../../adr/0004-migrations.md)
- [ADR-0005 — Hosting](../../adr/0005-hosting.md)
- `infra/compose/docker-compose.prod.yml`
- `infra/deploy.sh` (lives on TM server, not in repo)
