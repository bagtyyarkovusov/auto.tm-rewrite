# apps/api — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Per-bounded-context CONTEXT.md files under `src/modules/<context>/` describe each context in detail.

## Purpose

The NestJS API. Hosts all bounded contexts, exposes REST and Socket.IO endpoints, and runs Prisma against Postgres. The single source of business logic — mobile, admin, and web are thin clients. S10 adds rich realtime chat plus the API-side direct-message push decision/history/enqueue path; external push delivery runs in `apps/worker`. SMS gateway delivery remains in `apps/sms-gateway`.

## Layer rules (Level 2 architecture)

Every bounded context under `src/modules/<context>/` has four layers:

| Layer | Contents | Imports allowed |
|---|---|---|
| `domain/` | Pure TS — entities, value objects, invariants | Nothing framework-related; no Prisma, no `@nestjs/*` |
| `application/` | Use-cases — one class per verb, one `execute()` method | `domain/`, port interfaces |
| `infrastructure/` | Prisma repositories, FCM adapters, mappers | All TS, all libs |
| `presentation/` | HTTP controllers + WebSocket gateways — thin | Only `application/` (via DI) |

## What it contains

- 10 modules under `src/modules/` (admin, catalog, content, conversations, identity, listings, notifications, realtime, reports, subscriptions); `realtime` is an infrastructure module that provides authenticated Socket.IO and presence state to the business contexts
- Global `JwtAuthGuard` + `@Public()` decorator at `src/common/` for auth-gating + anonymous-browsing escape hatch. The API auth boundary is bearer-token only; browser cookie storage belongs to `apps/admin`, which forwards `Authorization: Bearer <accessToken>` server-side.
- `AdminGuard` at `src/common/admin.guard.ts` composing on top of `JwtAuthGuard` (gates admin-only routes via `IdentityCheckPort.isAdmin`)
- Global throttler (`@nestjs/throttler`) — 60 req/min/IP default; per-route override via `@Throttle()`. S7 public report routes use this global throttler only; no report-specific quota store or custom report throttling rule ships in the MLP.
- Prisma client via `PrismaService` (PrismaModule is currently commented out in `app.module.ts` pending API ESM migration — issue #16)
- Swagger / OpenAPI docs generated from Zod contracts
- `ConfigModule` with Zod-validated env schema (`src/env.schema.ts`), including `PORT=3006` (see ADR-0018) and `SOCKET_IO_NAMESPACE`, `SOCKET_IO_CORS_ORIGIN`, `SOCKET_IO_REDIS_ADAPTER_ENABLED` (default `false`) for the Socket.IO foundation. S11 adds `APP_ENV` (deployed-environment identity), `AUTOTM_COMMIT_SHA` (build-baked deploy evidence), and reviewer-demo auth config (`REVIEW_DEMO_ACCOUNT_ENABLED`, `REVIEW_DEMO_ACCOUNTS_JSON`). Fail-closed validation keeps reviewer-era test flags (`OTP_TEST_MODE`, `OTP_TEST_CODE_RESPONSE`, `SMS_DRIVER=test`) CI-only; enabled reviewer-demo config must contain 3-5 secret-managed unique `+993` phone/code entries; `APP_ENV=staging|production` rejects loopback data endpoints, cross-environment hosts, placeholder/default secrets, identical JWT secrets, unsafe MinIO private/public endpoint combinations, and (production only) wildcard Socket.IO CORS.
- `socket.io` package installed; `RealtimeIoAdapter` attached in `main.ts` with optional `@socket.io/redis-adapter` readiness; `RealtimeGateway` exposes the `/ws/chat` namespace with JWT-auth middleware, user rooms (`user:{userId}`), and an in-memory online registry. `conversations/` adds `ConversationGateway` on the same namespace for `conversation:join` / `conversation:leave` events and deterministic `conversation:{conversationId}` rooms (#235).

## Public API surface (today)

- REST: `/api/v1/auth/*`, `/api/v1/me` — identity context (S2 shipped)
- REST: `/api/v1/catalog/*`, `/api/v1/listings/*`, `/api/v1/conversations/*`, `/api/v1/notifications/*`, `/api/v1/admin/*`, and the per-context routes documented in their local `CONTEXT.md` files
- Health: `/healthz` (liveness — dependency-free by contract, returns `status`/`service` plus deploy evidence `commitSha`/`environment` from `src/common/deploy-metadata.ts`) and `/readyz` (readiness — bounded concurrent probes of Postgres via Prisma, Redis, and MinIO with a 1.5s per-check budget in `src/common/readiness.ts` + `readiness.service.ts`; 503 with per-check `ok`/`failed` statuses when any dependency is down; raw error details are logged server-side only and never leak into the response)
- WebSocket: `/ws/chat` namespace (Socket.IO) — authenticated user/conversation rooms with text/image send, watermarks, delete, typing, and chat-scoped presence events
- Direct-message push: native token registration and API-side eligibility/history/enqueue are live; the worker's `test` transport is the S10 delivery path. Production FCM/APNS credentials and `/metrics` remain unwired.

## Cross-context communication

- **Ports (synchronous)** — small TS interfaces injected via NestJS DI; one context exposes, others consume. `realtime/` exposes `PresencePort` (`isUserOnline`, `getLastSeenAt`) for cross-context online and last-seen checks; `conversations/` exposes `ConversationStatePort` (`isMuted`) for cross-context mute checks. `notifications/` consumes both ports when deciding direct-message pushes.
- **Events (asynchronous)** — `@nestjs/event-emitter` for fire-and-forget facts. Current paths include `MessageSent` from `conversations/` to `notifications/` and `ReviewerOtpBypassAuthenticated` from `identity/` to `admin/` for durable reviewer-auth audit. Other emitted/consumed events are documented by their owning contexts.

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
- [ADR-0039](../../docs/adr/0039-phased-cloud-first-hosting.md) — Railway-era hosting; API is the sole `prisma migrate deploy` authority via its pre-deploy command (`railway/api.json`)
