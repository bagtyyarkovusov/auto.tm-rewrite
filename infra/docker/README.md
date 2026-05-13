# `infra/docker/`

Per-app Dockerfiles (one per deployable app). Created during code scaffolding session.

## Planned files

| File | Builds image for |
|---|---|
| `Dockerfile.api` | `apps/api` (NestJS) |
| `Dockerfile.admin` | `apps/admin` (Next.js standalone) |
| `Dockerfile.web` | `apps/web` (Next.js standalone) |
| `Dockerfile.sms-gateway` | `apps/sms-gateway` (Node service) |
| `Dockerfile.worker` | `apps/worker` (NestJS standalone) |

Note: `apps/mobile` (Expo) and `apps/phone-agent` (Kotlin Android) do NOT have Dockerfiles — they're packaged via EAS Build and Gradle respectively.

## Conventions

- **Multi-stage**: build + runtime stages
- **Slim base**: `node:20-bookworm-slim`
- **Native deps**: install `python3 make g++` only in build stage (for `sharp`, `bcrypt`)
- **All node_modules bundled** in the final image — never `npm install` at runtime (air-gap)
- **Postgres client tools** + `curl` in runtime stage (healthchecks)
- **Healthcheck**: `HEALTHCHECK CMD curl -f http://localhost:3000/healthz || exit 1`
- **Non-root user**: every container runs as a non-root user
- **Prisma migrate deploy** runs at container start for the API + worker (handles fresh DB and migrations)

## See also

- [ADR-0005 — Hosting](../../docs/adr/0005-hosting.md)
- [Deployment runbook](../../docs/prd/ops/80-deployment-runbook.md)
