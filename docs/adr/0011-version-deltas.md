# ADR-0011: Latest-stable version uplift

- **Status**: Accepted
- **Date**: 2026-05-13
- **Deciders**: Architecture grilling session (bagtyyar + Claude)

## Context

The charter (GRILL-OUTCOME.md, locked 2026-05-12) under-pinned versions for several core dependencies. During Sprint 1 scaffold, we uplifted to latest stable to avoid shipping on versions nearing end-of-life. This ADR records the uplift and supersedes the version-specific portions of earlier ADRs where they conflict.

## Decision

| Component | Charter (locked 2026-05-12) | Now using | Reason |
|---|---|---|---|
| Node.js | 20.10.0 | **22.11.0 LTS** | Latest LTS; 20.x enters maintenance in late 2026 |
| Prisma | 5 | **7.6.0** | Latest stable; config moved to `prisma.config.ts`; requires `@prisma/adapter-pg` driver adapter |
| Next.js | 15 | **16.2.2** | Latest stable; App Router unchanged; no breaking changes for our usage |
| Tailwind CSS | (implied v3) | **4.1** | CSS-first config via `@theme`; `@tailwindcss/postcss` replaces JS config preset |
| Expo SDK | unspecified | **55** | Latest stable; RN 0.83; New Architecture mandatory |

Everything else (NestJS 11, Socket.IO 4, Postgres 16, Redis 7, MinIO, BullMQ, etc.) remains as the charter specified.

## Consequences

### Positive

- Prisma 7 brings native driver-adapter support, removing native binary dependency from the API layer — easier air-gapped deployment (no `prisma generate` downloading platform binaries).
- Tailwind v4 eliminates `tailwind.config.js` boilerplate; theming moves to CSS `@theme` directives, closer to the platform.
- Next.js 16 defaults to Turbopack in dev, cutting cold-start times.
- Expo SDK 55 with New Architecture mandatory ensures RN 0.83 Fabric renderer, better scroll performance on listing feeds.
- Node 22 LTS buys us 3 years of support (through 2028).

### Negative / accepted costs

- **Prisma 7**: `schema.prisma` no longer holds the datasource `url`; it moves to `prisma.config.ts` (`defineConfig({ datasource: { url: env('DATABASE_URL') } })`). Generated client lives under `./generated/prisma/client` instead of the conventional `node_modules/.prisma/client`. Driver adapter `@prisma/adapter-pg` wraps a `pg` connection — adds one more dependency.
- **Tailwind v4**: no `tailwind.config.js` for theming on web/admin. `packages/ui/theme/` exports a `theme.css` with `@theme` directive instead of a JS preset. Each consumer app imports it from `globals.css`. NativeWind v4 still uses a JS config — `packages/ui/theme/tailwind.ts` exports a small JS object for that path. Two config formats to maintain (CSS for web, JS for mobile) instead of one.
- **Next.js 16**: Turbopack default in dev — faster but slightly different error messages vs. webpack. App Router shape unchanged.
- **Expo SDK 55**: React Native 0.83; New Architecture mandatory. Custom dev client required (Expo Go incompatible with NativeWind v4).

### Neutral

- NestJS 11, Socket.IO 4, Postgres 16, Redis 7 unchanged — already current at charter time.
- No database migration impact (this is a greenfield project with no existing data).

## Alternatives considered

- **Pin to charter versions (Node 20, Prisma 5, Next 15, Tailwind v3, Expo SDK 52)** — rejected because several would be end-of-life before our Phase 2 launch, forcing an in-flight migration with production data.
- **Go further (Node 24 current, Prisma 8 preview)** — rejected because Node 24 is not yet LTS and Prisma 8 may introduce breaking changes mid-project.
- **Stay on Tailwind v3 + JS config for all three frontends** — rejected because Tailwind v4 is the stable release line; delaying the migration past scaffold means doing it later with real components to update.

## References

- GRILL-OUTCOME.md §2 (Stack), §21 (Revision log)
- ADR-0002 (Stack) — version rows superseded
- ADR-0004 (Migrations) — Prisma config path superseded
- ADR-0007 (i18n) — no change; included for completeness
- ADR-0008 (Media) — no change; included for completeness
- Sprint 1 scaffold plan
