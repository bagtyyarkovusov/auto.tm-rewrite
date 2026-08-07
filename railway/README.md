# `railway/` — per-service config as code

Versioned Railway configuration for the ADR-0039 cloud phase (Sprint 11).
One JSON file per deployable service; each is valid against
<https://railway.com/railway.schema.json> and overrides the equivalent
dashboard settings for that service.

| File | Service | Build | Start command | Pre-deploy | Health gate |
|---|---|---|---|---|---|
| `api.json` | `api` | `infra/docker/api.Dockerfile` | `node dist/src/main.js` | `pnpm --filter @auto-tm/db migrate:deploy` | `/readyz` (bounded: Postgres + Redis + MinIO) |
| `worker.json` | `worker` | `infra/docker/worker.Dockerfile` | `node dist/main.js` | — | none (no public route; boot failure exits non-zero) |
| `admin.json` | `admin` | `infra/docker/admin.Dockerfile` | `node apps/admin/server.js` | — | `/healthz` (dependency-free) |
| `web.json` | `web` | `infra/docker/web.Dockerfile` | `node apps/web/server.js` | — | `/healthz` (dependency-free) |

## Migration authority

`api` is the **sole** migration authority. Its pre-deploy command runs
`prisma migrate deploy` (via `packages/db/prisma.config.ts`, forward-only per
ADR-0004) in the API image before the new revision takes traffic, and the
`/readyz` health gate keeps a release whose dependencies are unwired from
serving. No other service runs migrations; `migrate dev` and `db push` are
forbidden outside localhost. The worker, admin, and web must only be deployed
after the API pre-deploy + readiness succeed (deploy ordering is enforced
during provisioning, S11-08).

## Deploy evidence

Every Dockerfile declares `ARG RAILWAY_GIT_COMMIT_SHA` (Railway injects it as
a build arg for Dockerfile builds) and bakes it as `ENV AUTOTM_COMMIT_SHA`.
`/healthz` (all HTTP services) and `/readyz` (API) report `commitSha` +
`environment`, so deploy evidence identifies the exact `main` revision even
when Railway rebuilds it. `environment` prefers the Railway-injected
`RAILWAY_ENVIRONMENT_NAME`, falling back to `APP_ENV`.

## Provider-side settings (cannot live in this repo)

Config as code does not cover everything. These stay in the Railway
dashboard/API and are verified during provisioning (S11-07/S11-08) — listed
here so dashboard-only drift is auditable:

1. **Service source**: each of `api`, `worker`, `admin`, `web` builds from
   this repo with the **root directory set to the repository root** (the
   Dockerfiles need the full monorepo context).
2. **Config file path**: each service's config-as-code path set to
   `/railway/<service>.json`.
3. **Environments**: one project, `staging` + `production`. Staging
   auto-deploys `main` with **Wait for CI** (GitHub Actions must be green);
   production has **no branch autodeploy** — an operator manually deploys the
   exact staging-proven SHA (S11-12).
4. **Private networking**: `api`/`worker` reach Postgres, Redis, and MinIO
   over `*.railway.internal` hostnames; MinIO's public endpoint is only for
   anonymous media reads + signed PUTs (S11-02).
5. **Serverless sleep** (staging only, per sprint contract): may be enabled
   for `api`, `admin`, `web`; the worker and data services stay awake. All
   production services stay awake during store review.

## Environment matrix (names/references only — never values)

Secrets and generated connection strings live in Railway variables. This
matrix is the checked-in, secret-free contract; `R` = Railway reference
variable, `H` = human-supplied credential (stored only in Railway), `G` =
generated per environment.

| Variable | api | worker | admin | web | Source |
|---|---|---|---|---|---|
| `APP_ENV` | yes | yes | — | — | `staging` / `production` per environment |
| `AUTOTM_COMMIT_SHA` | baked | baked | baked | baked | image build arg (not a variable) |
| `DATABASE_URL` | yes | yes | — | — | R: `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | yes | yes | — | — | R: `${{Redis.REDIS_URL}}` |
| `MINIO_ENDPOINT` / `MINIO_PUBLIC_URL` | yes | yes | — | — | R/G: private origin / public S3 endpoint (S11-02) |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | yes | yes | — | — | G (S11-02) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | yes | — | — | — | H, distinct per environment |
| `TOTP_SECRET_ENCRYPTION_KEY` | yes | — | — | — | H (32-byte base64) |
| `SMS_DRIVER` | yes | — | — | — | fixed `mock` in both environments (ADR-0039) |
| `SOCKET_IO_CORS_ORIGIN` | yes | — | — | — | explicit origin list; never `*` in production |
| `PUSH_TRANSPORT` | — | yes | — | — | `fcm-apns` in production (S11-05) |
| `FCM_*` / `APNS_*` | — | yes | — | — | H, complete set required for `fcm-apns` (S11-05) |
| `NEXT_PUBLIC_API_URL` | — | — | yes | yes | R: API service public domain |
| `NEXT_PUBLIC_MINIO_PUBLIC_URL` | — | — | yes | yes | R/G (S11-02) |
| `SESSION_SECRET` | — | — | yes | — | H |

Reviewer-era fail-closed flags (`SMS_DRIVER=test`, `OTP_TEST_MODE`,
`OTP_TEST_CODE_RESPONSE`, `PUSH_TRANSPORT=test` in production, loopback or
cross-environment data endpoints, placeholder/default secrets) are rejected
by `apps/api/src/env.schema.ts` and `apps/worker/src/env.schema.ts` at boot —
no dashboard setting can accidentally enable them.

## References

- [ADR-0039 — phased cloud-first hosting](../docs/adr/0039-phased-cloud-first-hosting.md)
- [ADR-0004 — migrations](../docs/adr/0004-migrations.md)
- [Sprint 11 — Railway deployment](../docs/prd/sprints/sprint-11-railway-deployment.md)
- [`infra/docker/`](../infra/docker/README.md)
- Railway docs: config as code (`https://docs.railway.com/guides/config-as-code`)
