# apps/api — CONTEXT

## Purpose

The NestJS API. Hosts all bounded contexts, exposes REST + WebSocket endpoints, runs Prisma against Postgres, dispatches push notifications, drives the SMS gateway. The single source of business logic — mobile, admin, and web are thin clients.

## Layer rules (Level 2 architecture)

Every bounded context under `src/modules/<context>/` has four layers:

| Layer | Contents | Imports allowed |
|---|---|---|
| `domain/` | Pure TS — entities, value objects, invariants | Nothing framework-related; no Prisma, no `@nestjs/*` |
| `application/` | Use-cases — one class per verb, one `execute()` method | `domain/`, port interfaces |
| `infrastructure/` | Prisma repositories, FCM adapters, mappers | All TS, all libs |
| `presentation/` | HTTP controllers + WebSocket gateways — thin | Only `application/` (via DI) |

## What it contains

- 9 bounded-context modules under `src/modules/`
- Global `JwtAuthGuard` + `@Public()` decorator for anonymous browsing
- Global throttler (60 req/min/IP) + per-route override via `@Throttle()`
- Prisma client via `PrismaService` injected wherever needed
- Socket.IO server attached on a dedicated port (chat + push live notifications)
- Swagger / OpenAPI docs generated from class-validator DTOs + Zod contracts
- `ConfigModule` with Zod-validated env schema

## Public API surface

- REST: `/api/v1/...` (versioned), see `packages/contracts/` for the typed schema
- WS: `/ws/chat` (Socket.IO namespace)
- Health: `/healthz` (liveness) + `/readyz` (readiness)
- Metrics: `/metrics` (Prometheus)

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
