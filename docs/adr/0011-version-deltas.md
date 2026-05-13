# ADR-0011: Latest-stable version uplift

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

The charter (GRILL-OUTCOME.md, locked 2026-05-12) under-pinned versions for several core dependencies. During Sprint 1 scaffold, we uplifted to latest stable to avoid shipping on versions nearing end-of-life.

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

- Prisma 7 requires `prisma.config.ts` instead of env-var-only configuration.
- Tailwind v4 uses `@import "tailwindcss"` and `@theme` blocks; no `tailwind.config.js` in `packages/ui`.
- Expo SDK 55 requires custom dev client (Expo Go incompatible with NativeWind v4).

## References

- GRILL-OUTCOME.md §21 (Revision log)
- Sprint 1 scaffold plan
