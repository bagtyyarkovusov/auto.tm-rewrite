# ADR-0003: Monorepo with Turborepo + pnpm workspaces

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

AutoTM has 7 deployable applications (API, admin, web, mobile, sms-gateway, phone-agent, worker) and shared concerns (Prisma schema, Zod contracts, design tokens, tsconfig presets, ESLint rules). These cannot live in 7 separate repos without:

- Version drift between API contract and mobile/admin consumers
- Duplicated tooling config
- Slower iteration for cross-cutting changes (e.g., adding a new entity touches schema + types + admin + mobile)

We also have an unusual deployment constraint: **air-gapped Turkmenistan**. Builds happen on a self-hosted runner; artifacts are shipped as Docker image tarballs. The build system must:

- Cache aggressively (re-running builds is expensive when international bandwidth is slow)
- Be cheap (no per-minute CI charges; self-hosted)
- Work offline once base images are bundled

## Decision

We use **Turborepo + pnpm workspaces**, with this layout:

```
auto.tm-rewrite/
├── apps/<app>/         deployable applications
├── packages/<pkg>/     shared libraries (db, contracts, ui, tsconfig, eslint-config)
├── infra/              Dockerfiles, docker-compose, deploy scripts
├── docs/               ADRs, PRD, agent configs
└── .github/workflows/  self-hosted runner CI
```

**pnpm** is the package manager. Workspaces declared in `pnpm-workspace.yaml`.

**Turborepo** orchestrates task running and caches outputs. Tasks defined in `turbo.json`:
- `build`, `dev`, `lint`, `test`, `typecheck`, `clean`
- Build cache stores compiled output, speeds up re-builds 10×

**Shared tsconfig** lives in `packages/tsconfig/`, extended by each workspace's `tsconfig.json`.

**Shared ESLint config** in `packages/eslint-config/`, extended by each app.

The Kotlin Android `phone-agent` lives under `apps/phone-agent/` but is not a pnpm workspace — it has its own Gradle build. Turbo treats it as an external task (`turbo run build --filter=phone-agent` invokes Gradle).

## Consequences

### Positive
- Single repo, single CI pipeline, single set of base configs
- Type changes propagate atomically (one PR can touch contract + API + admin + mobile)
- Turbo cache makes incremental rebuilds fast — critical with self-hosted runner on a single Windows/Mac machine
- pnpm's content-addressable store deduplicates dependencies across workspaces (smaller disk footprint)

### Negative / accepted costs
- Turborepo learning curve (~1 day)
- `pnpm` semantics differ from `npm` (strict hoisting) — devs may stumble on first install
- The Kotlin sub-project needs Gradle, not pnpm — handled as a special-case Turbo task

### Neutral
- We avoid Nx for now (more powerful but heavier; we don't need generators or multi-language graph yet). If we outgrow Turbo, migration to Nx is documented but not urgent.

## Alternatives considered

- **Nx + pnpm** — rejected: more complex, more features than we need, steeper learning curve.
- **pnpm workspaces alone** — rejected: no build orchestration or caching; would re-run everything on every change.
- **Lerna** — rejected: largely superseded by Turbo/Nx.
- **Multi-repo (one repo per app)** — rejected: type drift, duplicate tooling, slower for cross-cutting work.

## References

- Charter §3 (apps), §4 (packages)
- Related: ADR-0002 (stack), ADR-0010 (testing-obs uses Turbo for parallel test runs)
