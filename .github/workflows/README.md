# `.github/workflows/`

GitHub Actions workflows.

## Active workflows

| Workflow | Trigger | Runner | Purpose |
|---|---|---|---|
| `ci.yml` | Push to `main` | self-hosted (`tm-proxy`) | install → db generate → lint → typecheck → `pnpm test` → `pnpm build` |
| `pr-checks.yml` | Pull request to `main` | self-hosted (`tm-proxy`) | install → db generate → lint → typecheck → `pnpm test` |
| `bundle.yml` | Tag push `v*` | self-hosted (`tm-proxy`) | `make bundle TAG=<tag>`, uploads `images/auto-tm-<tag>.tar.gz` as a workflow artifact (90-day retention) |

## Self-hosted runner

One runner is registered: **`tm-build-mac`** (labels `self-hosted, macOS, ARM64, tm-proxy`), the developer's Mac, registered repo-scoped. ADR-0005 designates the dev Mac as the backup build box; it is currently the only one.

It runs as a **launchd service**, installed via `~/actions-runner/svc.sh install` — it survives logout and reboot. Manage it with:

```bash
cd ~/actions-runner
./svc.sh status   # also: start / stop / uninstall
launchctl list | grep actions.runner
```

Logs: `~/Library/Logs/actions.runner.bagtyyarkovusov-auto.tm-rewrite.tm-build-mac/{stdout,stderr}.log`.

### Env hook (load-bearing, local modification)

`~/actions-runner/runsvc.sh` sources `~/actions-runner/.env` before launching the listener (`set -a; . ./.env; set +a`). Neither `run.sh` nor the stock `runsvc.sh` loads `.env` by themselves — without this hook the listener has no env and every e2e suite fails at collection (first symptom: `Error: Region is missing` from the MinIO/S3 client). **Re-apply the hook after every `svc.sh install`** — install copies a fresh `runsvc.sh` from `bin/runsvc.sh`.

## CI env contract (12 variables)

Test processes require these variables, supplied by the runner-root `.env`:

| Variable | Why |
|---|---|
| `DATABASE_URL` | Prisma — e2e suites hit the dev Postgres directly |
| `REDIS_URL` | cache/queue clients |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | token minting in identity tests |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_REGION` / `MINIO_PUBLIC_URL` | S3-compatible media storage clients |
| `TOTP_SECRET_ENCRYPTION_KEY` | AES-256-GCM cipher for admin TOTP secrets |
| `REPORT_ENTRY_ENABLED` / `ADMIN_MODERATION_ACTIONS_ENABLED` | feature flags under test |

All values are the **public dev placeholders** from `apps/api/.env.template`, pointing at the local dev stack (`infra/compose/docker-compose.dev.yml` — Postgres 5432, Redis 6379, MinIO 9000, started with `docker compose up`). E2e suites wipe tables in these databases; do not point the runner `.env` at anything you care about.

**NO production env vars in CI** — production values live on the TM servers in `.env` files, never in CI (ADR-0005).

### Turbo strict env mode (load-bearing)

`turbo.json` runs in strict env mode: any variable not listed in `globalPassThroughEnv` is **stripped from task processes on any runner**. Adding a new CI-required variable means changing two places together:

1. the runner `.env` (value), and
2. `globalPassThroughEnv` in `turbo.json` (name).

Missing (2) was the root cause of the PR-#257 CI failure (fixed in `1a64d4e`).

## Recreating the runner from scratch

```bash
# 1. registration token (expires in 1h)
gh api -X POST repos/bagtyyarkovusov/auto.tm-rewrite/actions/runners/registration-token --jq .token

# 2. configure (in ~/actions-runner)
./config.sh --url https://github.com/bagtyyarkovusov/auto.tm-rewrite \
  --token <token> --name tm-build-mac --labels tm-proxy --unattended

# 3. .env with the 12 variables above (dev placeholders), then the runsvc.sh env hook

# 4. service
./svc.sh install && ./svc.sh start
```

Verify: `gh api repos/bagtyyarkovusov/auto.tm-rewrite/actions/runners` shows `tm-build-mac` online, and `ps eww <listener-pid>` shows the 12 variables in the listener environment.

## Release secrets

Stored in GitHub Actions repository secrets when needed:

- `RELEASE_SIGNING_KEY` — signing release tarballs
- `ANDROID_KEYSTORE_PASSWORD` — signing phone-agent APK
- `DOCKER_REGISTRY_PUSH_TOKEN` — if we ever push to a private registry

## See also

- [ADR-0003 — Monorepo](../../docs/adr/0003-monorepo.md)
- [ADR-0005 — Hosting](../../docs/adr/0005-hosting.md)
- [ADR-0010 — Testing + observability](../../docs/adr/0010-testing-obs.md)
- [Deployment runbook](../../docs/prd/ops/80-deployment-runbook.md)
