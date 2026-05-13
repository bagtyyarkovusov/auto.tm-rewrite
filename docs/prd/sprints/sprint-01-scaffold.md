# Sprint 1 — Scaffold

| | |
|---|---|
| **Status** | ⚪ Planned |
| **Phase** | 1 |
| **Milestone** | M1 — Hello stack |
| **Demo audience** | Nobody — confirms the rails |
| **Estimated time** | ~1 week |

## Goal

Land all 15 commits of the scaffold sequence so `pnpm install && pnpm dev` runs the full local stack and `make bundle` produces a Docker tarball ready to ship to TM.

## User capability (the demo line)

None yet. This sprint is purely engineer-facing. Sprint 2 produces the first user-visible thing (OTP login).

## Bounded contexts touched

All — but only at the scaffold level. Each `apps/api/src/modules/<context>/` gets a four-layer directory + a placeholder `<C>Module` + a `/ping` endpoint. No domain logic.

## Acceptance criteria (DoD)

- [ ] `.nvmrc` is `22.11.0`; `pnpm install` succeeds with no peer-dep warnings
- [ ] `pnpm typecheck` green across all 12 workspaces
- [ ] `pnpm lint` green across all 12 workspaces
- [ ] `pnpm test` green (db Testcontainers smoke + contracts schema test + sms-gateway send test)
- [ ] `pnpm build` green for every app
- [ ] `pnpm compose:up` starts Postgres 16 + Redis 7 + MinIO; healthcheck on Postgres passes
- [ ] `pnpm --filter @auto-tm/db migrate:dev --name init` produces an initial migration committed to git
- [ ] API responds 200 on `GET /healthz` and `GET /api/v1/identity/ping`
- [ ] `make -n bundle TAG=v0.0.0-test` prints the docker build + save commands cleanly
- [ ] `GRILL-OUTCOME.md` §21 + `docs/adr/0011-version-deltas.md` record the latest-stable uplift (Prisma 7, Next 16, Tailwind v4, Node 22, Expo SDK 55)
- [ ] `docs/prd/03-roadmap.md` shows S1 as 🟢 shipped and S2 as 🟡 in progress
- [ ] No domain logic added — all use-case classes are stubs

## Tests required

- **Testcontainers smoke** in `packages/db/tests/prisma.service.test.ts` — proves Postgres + driver adapter + generated client work together
- **Schema test** in `packages/contracts/tests/schemas.test.ts` — proves Zod schemas + OpenAPI generator work
- **HTTP smoke** in `apps/sms-gateway/test/send.test.ts` — proves Fastify auth + route work

> **TDD is not used for scaffolding.** The framework boilerplate doesn't have testable behavior. TDD becomes mandatory starting Sprint 2 for `domain/` + `application/`.

## Files this sprint creates / touches

See the full plan: [`docs/superpowers/plans/2026-05-13-monorepo-scaffold.md`](../../superpowers/plans/2026-05-13-monorepo-scaffold.md)

Summary of top-level adds:

- `.nvmrc` → `22.11.0`
- `docs/adr/0011-version-deltas.md` — version uplift ADR
- `packages/tsconfig/`, `packages/eslint-config/` — shared tooling
- `packages/ui/{theme,components,src}/` — Tailwind v4 `@theme` + Button/Card/Input
- `packages/db/{prisma,src,tests}/` — Prisma 7 schema + migration + Testcontainers smoke
- `packages/contracts/{src,scripts,tests}/` — Zod schemas (auth full; others as summaries) + OpenAPI exporter
- `apps/api/src/{main,app.module,env.schema,common,modules}/` — NestJS skeleton with 9 modules
- `apps/admin/`, `apps/web/` — Next.js 16 + Tailwind v4 + shadcn shells
- `apps/mobile/` — Expo SDK 55 + expo-router + NativeWind v4 + 5-tab nav
- `apps/sms-gateway/` — Fastify skeleton with mock OTP sender
- `apps/phone-agent/` — Kotlin Android skeleton (AGP 8.7, Kotlin 2.1)
- `apps/worker/` — BullMQ consumer skeleton (3 processor stubs)
- `infra/docker/` — 5 Dockerfiles + Caddyfile + observability stubs
- `infra/compose/` — dev/prod/serverb compose files
- `.github/workflows/` — CI / PR / Bundle on self-hosted runner
- `Makefile` — build/bundle/load/deploy/rollback targets

## References

- **Plan**: [`../../superpowers/plans/2026-05-13-monorepo-scaffold.md`](../../superpowers/plans/2026-05-13-monorepo-scaffold.md)
- **Charter sections**: §2 (Stack), §3-§4 (Monorepo apps + packages), §20 (Scaffold sequence)
- **ADRs**: 0001 (Architecture), 0002 (Stack), 0003 (Monorepo), 0011 (Version uplift, new)
- **Previous-sprint dependencies**: none (this is the first code sprint; commits 1-3 + 16 of the charter were the doc baseline)

## Open questions / risks

- **OTP-phone hardware**: charter §19 item 4 (source first 1-2 OTP phones for dev) is a parallel action item. Not blocking S1, but blocks `gateway` driver tests in S2.
- **TM Proxy PC**: self-hosted CI runner needs the proxy box up. Until it is, CI runs on `bagtyyar`'s local machine as the "backup runner" tier.
- **Tailwind v4 + shadcn**: shadcn's registry has been updated for v4, but a few community blocks may still emit v3 syntax. Captured as a known-issue note — re-test when pulling each component in S7+.

## Demo audience

Yourself. Successful demo = `pnpm dev` produces a green stack and `curl localhost:3000/healthz` returns `{"status":"ok"}`.
