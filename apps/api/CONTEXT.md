# apps/api — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Per-bounded-context CONTEXT.md files under `src/modules/<context>/` describe each context in detail.

## Purpose

The NestJS API. Hosts all bounded contexts, exposes REST endpoints, runs Prisma against Postgres. The single source of business logic — mobile, admin, and web are thin clients. WebSocket (chat) layer + push dispatch + SMS gateway driver land in their owning sprints (S7, S8, S2 respectively — S2 SMS driver already shipped via `apps/sms-gateway`).

## Layer rules (Level 2 architecture)

Every bounded context under `src/modules/<context>/` has four layers:

| Layer | Contents | Imports allowed |
|---|---|---|
| `domain/` | Pure TS — entities, value objects, invariants | Nothing framework-related; no Prisma, no `@nestjs/*` |
| `application/` | Use-cases — one class per verb, one `execute()` method | `domain/`, port interfaces |
| `infrastructure/` | Prisma repositories, FCM adapters, mappers | All TS, all libs |
| `presentation/` | HTTP controllers + WebSocket gateways — thin | Only `application/` (via DI) |

## What it contains

- 9 bounded-context modules under `src/modules/` (admin, catalog, content, conversations, identity, listings, notifications, reports, subscriptions) — only `identity` has shipped use-cases today; the rest are skeletons
- Global `JwtAuthGuard` + `@Public()` decorator at `src/common/` for auth-gating + anonymous-browsing escape hatch
- `AdminGuard` at `src/common/admin.guard.ts` composing on top of `JwtAuthGuard` (gates admin-only routes via `IdentityCheckPort.isAdmin`)
- Global throttler (`@nestjs/throttler`) — 60 req/min/IP default; per-route override via `@Throttle()`
- Prisma client via `PrismaService` (PrismaModule is currently commented out in `app.module.ts` pending API ESM migration — issue #16)
- Swagger / OpenAPI docs generated from Zod contracts
- `ConfigModule` with Zod-validated env schema (`src/env.schema.ts`), including `PORT=3006` (see ADR-0018)
- `socket.io` package installed but no `IoAdapter` attached today; no WebSocket gateways — chat namespace ships in S7 (`conversations` module)

## Public API surface (today)

- REST: `/api/v1/auth/*`, `/api/v1/me` — identity context (S2 shipped)
- REST: `/api/v1/catalog/*` — catalog stub controller (full surface in S3)
- REST stubs: `/api/v1/listings`, `/api/v1/conversations`, etc. — controllers exist but no real handlers
- Health: `/healthz` (liveness)
- Push, WS (`/ws/chat`), Metrics (`/metrics`) — planned, not yet attached

## Cross-context communication

- **Ports (synchronous)** — small TS interfaces injected via NestJS DI; one context exposes, others consume
- **Events (asynchronous)** — `@nestjs/event-emitter` for fire-and-forget notifications. Used heavily for `ListingCreated → subscriptions/`, `MessageSent → notifications/`, etc.

## Dependencies

- `packages/db` — Prisma schema + generated client
- `packages/contracts` — Zod schemas + OpenAPI exporter

## Notable decisions

- [ADR-0001](../../docs/adr/0001-architecture.md) — Level 2 bounded contexts
- [ADR-0002](../../docs/adr/0002-stack.md) — Stack
- [ADR-0004](../../docs/adr/0004-migrations.md) — Prisma migrations run at container start
- [ADR-0016](../../docs/adr/0016-typescript-runtime-boundaries.md) — TypeScript runtime package boundaries (affects `@auto-tm/db` and `@auto-tm/contracts` consumption)
- [ADR-0017](../../docs/adr/0017-context7-as-canonical-doc-source.md) — Context7 MCP for library docs
- [ADR-0018](../../docs/adr/0018-api-port-3006.md) — API runs on port 3006
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
