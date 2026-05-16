# packages/db — CONTEXT

## Purpose

Single source of truth for the database schema. Owns `schema.prisma`, all migrations, the generated Prisma client, and seed data.

## What it contains

```
packages/db/
├── prisma/
│   ├── schema.prisma         The schema — all bounded contexts' tables, grouped by /// section comments
│   ├── migrations/           Timestamped SQL files, one per PR
│   │   ├── 20260513120000_initial/
│   │   └── ...
│   └── seed/                 JSON files for catalog seed data
│       ├── brands.json
│       ├── models.json
│       ├── colors.json
│       ├── regions.json
│       ├── cities.json
│       ├── body-types.json
│       ├── engine-types.json
│       ├── transmissions.json
│       └── drive-types.json
├── src/
│   ├── index.ts              Exports PrismaService class + types
│   └── seed.ts               Seed script (pnpm db:seed)
├── tsconfig.build.json       CommonJS runtime build for NestJS consumers
├── package.json
└── CONTEXT.md
```

## Schema organization

`schema.prisma` is grouped by bounded context with `///` section markers:

```prisma
/// ============================================================
/// IDENTITY
/// ============================================================
model User { ... }
model Dealership { ... }
...

/// ============================================================
/// CATALOG
/// ============================================================
model Brand { ... }
...
```

## Foreign-key policy across contexts

- **Cross-context FKs ARE allowed** in `schema.prisma` (e.g., `Listing.brandId → Brand.id`)
- **But direct joins across contexts in use-cases are NOT.** Code must go through a port.
- This gives us referential integrity at the DB level + clean architectural boundaries at the application level.

## Naming conventions

- Tables: snake_case plural (`users`, `inspection_reports`)
- Columns: snake_case (`created_at`, `dealership_id`)
- Prisma models: PascalCase singular (`User`, `InspectionReport`)
- Prisma fields: camelCase (`createdAt`, `dealershipId`)
- Enums: PascalCase (`UserRole`, `ListingStatus`)

## Migration discipline

See ADR-0004. Key points:
- `pnpm db:migrate:dev --name <verb>_<thing>` creates migrations during development
- Migrations committed to git with their schema change
- `pnpm db:migrate:deploy` runs them in production (inside Docker)
- Never `db push` outside localhost
- One migration per PR
- Forward-only — revert by writing a new migration

## Public API surface

```ts
export { PrismaClient } from '@prisma/client'
export { PrismaService } from './prisma.service'  // NestJS-injectable wrapper
export * as types from './types'
```

Consumed by `apps/api`, `apps/worker`, `apps/sms-gateway`.

## Runtime packaging

`@auto-tm/db` is authored in TypeScript, but backend apps consume the compiled CommonJS output in `dist/`. The package `exports` map points runtime consumers at `dist/src/index.js` while the type surface stays on `src/index.ts`.

`pnpm --filter @auto-tm/db build` regenerates the Prisma client and compiles only the runtime surface (`src/index.ts`, `src/prisma.service.ts`, and the generated Prisma client). `src/seed.ts` continues to run directly through `tsx` via `pnpm db:seed`.

## Dependencies

- `prisma` + `@prisma/client`
- Used by all backend apps; never imported by frontends

## Notable decisions

- [ADR-0004](../../docs/adr/0004-migrations.md) — Migration workflow
- [ADR-0001](../../docs/adr/0001-architecture.md) — FK allowed, joins via ports only
