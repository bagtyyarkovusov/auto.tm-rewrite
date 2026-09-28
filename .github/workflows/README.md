# `.github/workflows/`

GitHub Actions workflows.

## Active workflows

| Workflow | Trigger | Runner | Purpose |
|---|---|---|---|
| `ci.yml` | Push to `main` | self-hosted (`tm-proxy`) | lane choice → disposable test services → install → glossary check → lane tests → db generate and migrate → MinIO buckets → lint → typecheck → `pnpm test` → `pnpm build` → service cleanup. Docs-only pushes stop after the docs checks |
| `pr-checks.yml` | Pull request to `main` | self-hosted (`tm-proxy`) | lane choice → disposable test services → install → glossary check → lane tests → db generate and migrate → MinIO buckets → lint → typecheck → `pnpm test` → service cleanup. Docs-only pull requests stop after the docs checks; a new push cancels the older run |
| `bundle.yml` | Tag push `v*` | self-hosted (`tm-proxy`) | `make bundle TAG=<tag>`, uploads `images/auto-tm-<tag>.tar.gz` as a workflow artifact (90-day retention) |

### Lanes and cancellation

One runner serves every job, so both workflows avoid work that cannot change the result.

- **Cancellation.** PR Checks uses one concurrency group per pull request with `cancel-in-progress`. A new push cancels that pull request's queued or running run; other pull requests are unaffected. `main` has no concurrency group: every push to `main` is checked, in order.
- **Docs-only lane.** `scripts/ci-lane.mjs` lists the changed files and prints `lane=docs` only when every one is Markdown (`*.md`, anywhere) or lives under `docs/`. PR Checks compares the pull request merge commit with its base parent (`fetch-depth: 2`); CI compares the push with the previous `main` commit (`github.event.before`). The docs lane runs install, the glossary check, `pnpm test:agent-docs`, and `pnpm test:glossary`, and skips test services, migrations, MinIO, lint, typecheck, workspace tests, and the build. Renames list both paths, so moving code into `docs/` takes the full lane.
- **Fail-safe.** Every skipped step is guarded by `lane != 'docs'`, so an empty change, an unreadable base commit, or a failed lane step runs the full pipeline. The lane rule is tested by `pnpm test:ci-lane`, which both lanes run.
- **Required check.** Branch protection requires the `pr` job. Do not add a workflow-level `paths` or `paths-ignore` filter to PR Checks: a pull request whose workflow never starts leaves `pr` pending forever, and auto-merge never fires. Skip steps inside the job instead.
- **Cleanup on cancel.** The service cleanup step uses `always()`, which also runs when a newer push cancels the run.

### pnpm store

All three workflows install from `$HOME/Library/pnpm/store`, which survives checkout cleaning and reboots. A shell step writes the path to `$GITHUB_ENV` as both `npm_config_store_dir` (read by pnpm 9 and 10) and `pnpm_config_store_dir` (read by later pnpm), because Actions does not expand `$HOME` in `env:`. The environment overrides the Mac user's pnpm `rc` file, which points at a `/tmp` store that macOS clears. The bundle workflow uses the same local store without a GitHub cache restore/save. Revisit the path if the `tm-proxy` label moves to a non-macOS runner.

Each workflow then reports the Node and pnpm versions, pnpm store path, and free space before `pnpm install`. This diagnostic step is kept on purpose and cannot fail the job. It warns when pnpm resolves a different store or the volume has less than 10 GiB free. Compare its output with pnpm's `reused` and `downloaded` counts when an install is slow. The investigation and baseline timings are in [the runner performance research](../../docs/research/github-actions-self-hosted-performance.md).

This is pnpm's default macOS store location. CI uses its pnpm 9 `v3` directory; pnpm 10 keeps a separate `v10` directory beside it. Local installs and agent worktrees on this Mac will share the CI store once the `store-dir` line is removed from `~/Library/Preferences/pnpm/rc`; until then they use the `/tmp` store. Do not prune a store while any install is using it. The repository is public, and `pull_request` jobs from outside contributors need approval only for first-time contributors. Those jobs can write to this store. Treat the store as no more trusted than the pull requests the runner accepts.

To reclaim space, confirm the runner is idle (`busy: false`), then stop it and make sure no local `pnpm install` is running. Prune with CI's pnpm version, because a global pnpm 10 would prune only the `v10` directory. Keep `--store-dir`, because the `rc` file would otherwise redirect pnpm to `/tmp`.

```bash
gh api repos/bagtyyarkovusov/auto.tm-rewrite/actions/runners --jq '.runners[] | {name, busy}'
cd ~/actions-runner && ./svc.sh stop
npx -y pnpm@9.12.0 store path --store-dir "$HOME/Library/pnpm/store"   # must end in /v3
npx -y pnpm@9.12.0 store prune --store-dir "$HOME/Library/pnpm/store"
./svc.sh start
```

The next install downloads anything a lockfile still needs. Update the pinned version here when the workflows' `pnpm/action-setup` version changes.

## Self-hosted runner

One runner is registered: **`tm-build-mac`** (labels `self-hosted, macOS, ARM64, tm-proxy`), the developer's Mac, registered repo-scoped. ADR-0005 designates the dev Mac as the backup build box; it is currently the only one.

It runs as a **launchd service**, installed via `~/actions-runner/svc.sh install` — it survives logout and reboot. Manage it with:

```bash
cd ~/actions-runner
./svc.sh status   # also: start / stop / uninstall
launchctl list | grep actions.runner
```

Logs: `~/Library/Logs/actions.runner.bagtyyarkovusov-auto.tm-rewrite.tm-build-mac/{stdout,stderr}.log`.

## Disposable CI services

PR Checks and CI each start `infra/compose/docker-compose.ci.yml` through `scripts/ci-services.sh`. The Compose project name includes `GITHUB_RUN_ID` and `GITHUB_RUN_ATTEMPT`, so concurrent runs get separate containers, networks, and volumes. Docker assigns random host ports bound to `127.0.0.1`; the script reads them with `docker compose port` and writes `DATABASE_URL`, `REDIS_URL`, `MINIO_ENDPOINT`, and `MINIO_PUBLIC_URL` to `$GITHUB_ENV` for later steps. The job's initial endpoint values point to unreachable port 1, overriding any development URLs inherited from the runner before services start.

`docker compose up --wait` waits for Postgres, Redis, and MinIO health checks. After `pnpm install` and Prisma client generation, `pnpm db:migrate:deploy` applies this checkout's committed migrations to the empty CI database. `pnpm minio:bootstrap` creates its media buckets before tests. The last step uses `if: always()` and `docker compose down --volumes --remove-orphans`, including when an earlier step fails. A cancelled or killed job may skip that step; see recovery below.

The runner needs Docker Desktop or another reachable Docker Engine with Compose v2 and enough disk for the three existing service images. The current Mac keeps those images cached. Do not prune images or the pnpm store while a job is running. The CI Compose file uses disposable volumes, never the development Compose project's volumes or fixed ports. The development stack can remain running during CI.

All test credentials and flags are public, nonproduction placeholders written by `scripts/ci-services.sh`: the MinIO keys and region, JWT secrets, TOTP key, and report/moderation flags. The `pnpm test` step sets `NODE_ENV` and `APP_ENV` to `test`; the CI build keeps its normal production mode. **No test variable is required in `~/actions-runner/.env`**, and CI no longer needs the local `runsvc.sh` patch that sources it. A pre-existing patch or `.env` may remain on the Mac; the workflow overrides its test endpoints and credentials. Production values never belong in CI (ADR-0005).

To inspect an interrupted run, identify its Compose project as `auto_tm_ci_<run-id>_<run-attempt>`. Run `docker compose -f infra/compose/docker-compose.ci.yml -p <project> ps -a` and inspect logs before cleanup. Once the corresponding Actions job has stopped, remove only that exact project with `docker compose -f infra/compose/docker-compose.ci.yml -p <project> down --volumes --remove-orphans`. Do not run `down` against the development `compose` project. Confirm no `auto_tm_ci_` volumes remain with `docker volume ls` if disk use stays high.

### Turbo strict env mode (load-bearing)

`turbo.json` runs in strict env mode: a variable not listed in `globalEnv` or `globalPassThroughEnv` is **stripped from task processes on any runner**. `globalEnv` also includes the value in task cache hashes; `globalPassThroughEnv` does not. Adding a new CI-required variable means changing two places together:

1. `scripts/ci-services.sh` or the workflow job `env:` (value), and
2. `globalEnv` or `globalPassThroughEnv` in `turbo.json` (name). `APP_ENV` is in `globalEnv` so its value reaches test tasks and changes their cache key.

Missing (2) was the root cause of the PR-#257 CI failure (fixed in `1a64d4e`).

## Recreating the runner from scratch

```bash
# 1. registration token (expires in 1h)
gh api -X POST repos/bagtyyarkovusov/auto.tm-rewrite/actions/runners/registration-token --jq .token

# 2. configure (in ~/actions-runner)
./config.sh --url https://github.com/bagtyyarkovusov/auto.tm-rewrite \
  --token <token> --name tm-build-mac --labels tm-proxy --unattended

# 3. Install and start Docker Desktop; confirm `docker compose version` works

# 4. service
./svc.sh install && ./svc.sh start
```

Verify: `gh api repos/bagtyyarkovusov/auto.tm-rewrite/actions/runners` shows `tm-build-mac` online, then run a PR Check. Its service step should report three healthy containers, migrations should apply to `auto_tm_ci`, and cleanup should remove that run's Compose project.

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
