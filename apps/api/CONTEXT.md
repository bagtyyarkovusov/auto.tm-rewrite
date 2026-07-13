# apps/api — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Per-bounded-context CONTEXT.md files under `src/modules/<context>/` describe each context in detail.

## Purpose

The NestJS API. Hosts all bounded contexts, exposes REST endpoints, runs Prisma against Postgres. The single source of business logic — mobile, admin, and web are thin clients. MLP contact ships as a simple REST text thread in S6; WebSocket chat and push dispatch are post-MLP. SMS gateway driver shipped in S2 via `apps/sms-gateway`.

## Layer rules (Level 2 architecture)

Every bounded context under `src/modules/<context>/` has four layers:

| Layer | Contents | Imports allowed |
|---|---|---|
| `domain/` | Pure TS — entities, value objects, invariants | Nothing framework-related; no Prisma, no `@nestjs/*` |
| `application/` | Use-cases — one class per verb, one `execute()` method | `domain/`, port interfaces |
| `infrastructure/` | Prisma repositories, FCM adapters, mappers | All TS, all libs |
| `presentation/` | HTTP controllers + WebSocket gateways — thin | Only `application/` (via DI) |

## What it contains

- 10 modules under `src/modules/` (admin, catalog, content, conversations, identity, listings, notifications, realtime, reports, subscriptions) — `identity` and `conversations` have shipped use-cases; `realtime` provides authenticated Socket.IO infrastructure
- Global `JwtAuthGuard` + `@Public()` decorator at `src/common/` for auth-gating + anonymous-browsing escape hatch. The API auth boundary is bearer-token only; browser cookie storage belongs to `apps/admin`, which forwards `Authorization: Bearer <accessToken>` server-side.
- `AdminGuard` at `src/common/admin.guard.ts` composing on top of `JwtAuthGuard` (gates admin-only routes via `IdentityCheckPort.isAdmin`)
- Global throttler (`@nestjs/throttler`) — 60 req/min/IP default; per-route override via `@Throttle()`. S7 public report routes use this global throttler only; no report-specific quota store or custom report throttling rule ships in the MLP.
- Prisma client via `PrismaService` (PrismaModule is currently commented out in `app.module.ts` pending API ESM migration — issue #16)
- Swagger / OpenAPI docs generated from Zod contracts
- `ConfigModule` with Zod-validated env schema (`src/env.schema.ts`), including `PORT=3006` (see ADR-0018) and `SOCKET_IO_NAMESPACE`, `SOCKET_IO_CORS_ORIGIN`, `SOCKET_IO_REDIS_ADAPTER_ENABLED` (default `false`) for the Socket.IO foundation.
- `socket.io` package installed; `RealtimeIoAdapter` attached in `main.ts` with optional `@socket.io/redis-adapter` readiness; `RealtimeGateway` exposes the `/ws/chat` namespace with JWT-auth middleware, user rooms (`user:{userId}`), and an in-memory online registry. `conversations/` adds `ConversationGateway` on the same namespace for `conversation:join` / `conversation:leave` events and deterministic `conversation:{conversationId}` rooms (#235).

## Public API surface (today)

- REST: `/api/v1/auth/*`, `/api/v1/me` — identity context (S2 shipped)
- REST: `/api/v1/catalog/*` — catalog stub controller (full surface in S3)
- REST stubs: `/api/v1/listings`, `/api/v1/conversations`, etc. — controllers exist but no real handlers
- Health: `/healthz` (liveness)
- WebSocket: `/ws/chat` namespace (Socket.IO) — authenticated connections only; `conversation:join` / `conversation:leave` events in `conversations/` gateway
- Push, Metrics (`/metrics`) — planned, not yet attached

## Cross-context communication

- **Ports (synchronous)** — small TS interfaces injected via NestJS DI; one context exposes, others consume. `realtime/` exposes `PresencePort` (`isUserOnline`) for cross-context online checks; `conversations/` exposes `ConversationStatePort` (`isMuted`) for cross-context mute checks. `notifications/` consumes both ports when deciding direct-message pushes.
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
