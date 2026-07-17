# realtime — CONTEXT

> Current implemented state per [ADR-0019](../../../../docs/adr/0019-context-md-describes-current-state.md). This is an infrastructure module, not a full bounded context with domain business rules.

## Purpose

Authenticated Socket.IO foundation for the API. Provides the server adapter, connection authentication, user-scoped rooms, and an in-memory online/last-seen registry used by the S10 conversation gateway and direct-message push suppression. No chat business logic lives here.

## Owns

- `RealtimeIoAdapter` — extends NestJS `IoAdapter`; creates the Socket.IO server and optionally attaches the `@socket.io/redis-adapter` when `SOCKET_IO_REDIS_ADAPTER_ENABLED=true`.
- `SocketAuthMiddleware` — verifies the JWT from `handshake.auth.token` (or `Authorization` header) and attaches the payload to `socket.data.user`.
- `RealtimeGateway` — NestJS WebSocket gateway on namespace `SOCKET_IO_NAMESPACE` (default `/ws/chat`); registers auth middleware, joins authenticated sockets to `user:{userId}`, and updates the connection registry.
- `SocketConnectionRegistry` — in-memory map of socket IDs to user IDs plus per-user active-socket counts. Implements `PresencePort`. Records a per-user `lastSeenAt` timestamp when the user's final socket disconnects and clears it when a socket reconnects, so consumers can render "last seen" labels.
- `realtime.config.ts` — shared socket infrastructure constants: `REALTIME_NAMESPACE`, `userRoom(userId)`, and `conversationRoom(conversationId)`. Conversation room join/leave handlers live in `conversations/`.

## Domain layer

No domain entities. Domain artifacts:
- `PresencePort` interface (`domain/ports/PresencePort.ts`) so other contexts can ask whether a user is currently socket-online without importing Socket.IO internals.
- `REALTIME_ERROR_CODES` (`domain/types.ts`) — canonical error codes returned by the socket auth middleware.

## Ports exposed

- `PresencePort` (`PRESENCE_PORT`) — implemented by `SocketConnectionRegistry`. Methods: `isUserOnline(userId)`, `getLastSeenAt(userId)`, `getSocketCountForUser(userId)`, `getOnlineUserCount()`.

## Ports consumed

- `JwtService` from `@nestjs/jwt` — shared access-token signing/verification secret configured in `AppModule`.

## Module shape

- `apps/api/src/modules/realtime/`:
  - `domain/types.ts`
  - `domain/ports/PresencePort.ts`
  - `infrastructure/RealtimeIoAdapter.ts`
  - `infrastructure/SocketAuthMiddleware.ts`
  - `infrastructure/RealtimeGateway.ts`
  - `infrastructure/SocketConnectionRegistry.ts`
  - `infrastructure/realtime.config.ts`
  - `realtime.module.ts`

## Configuration

Validated in `apps/api/src/env.schema.ts`:

| Variable | Default | Purpose |
|---|---|---|
| `SOCKET_IO_NAMESPACE` | `/ws/chat` | Socket.IO namespace path |
| `SOCKET_IO_CORS_ORIGIN` | `*` | CORS origin for native/browser clients |
| `SOCKET_IO_REDIS_ADAPTER_ENABLED` | `false` | Enable `@socket.io/redis-adapter` via `REDIS_URL` |

When `SOCKET_IO_REDIS_ADAPTER_ENABLED=false` (default), the adapter boots in single-node mode with the in-memory adapter and no Redis connection is attempted.

## Security

- Unauthenticated sockets are rejected at the middleware layer with `connect_error`.
- The access-token secret and verification semantics match the HTTP JWT routes (`JwtAuthGuard`).

## Integration today

- `conversations/` owns participant-validated conversation rooms and message/watermark/delete/typing/presence events on this namespace.
- `notifications/` consumes `PresencePort.isUserOnline()` to suppress direct-message push while a recipient has an active socket.
- The in-memory registry is single-node state. The Redis adapter distributes Socket.IO traffic when enabled, but no distributed presence registry ships in S10.

## Notable decisions

- [ADR-0002](../../../../docs/adr/0002-stack.md) — Socket.IO + NestJS WebSocket gateway
- [ADR-0019](../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
