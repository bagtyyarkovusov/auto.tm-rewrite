# apps/sms-gateway — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Today this is a **Fastify skeleton with a mock OTP sender** — the full per-phone routing + WebSocket protocol + SmsLog persistence ships in a future hosting sprint.

## Purpose

The Node service that orchestrates the AutoTM physical Android phone fleet for OTP SMS delivery. Lives on Server B in TM, on the same network as the connected phones.

## What it contains (today)

### Stack

- `fastify@^5.2.0` + `@fastify/helmet` + `@fastify/rate-limit`
- `pino` for logging
- `zod` env schema validation (`src/env.schema.ts`)
- No Postgres driver (`pg`, Prisma adapter, etc.) — no persistent storage today
- No WebSocket server library — no agent connections today

### Source

- `src/main.ts` / `src/server.ts` — Fastify bootstrap
- `src/env.schema.ts` — Zod env validation
- `src/ports/OtpSenderPort.ts` — port interface
- `src/adapters/OtpSenderMock.ts` — mock driver implementation (logs OTP to stdout)
- `src/routes/send.ts` — `POST /send` route
- `src/routes/health.ts` — `GET /health` route

### Drivers

- **Mock driver** (`OtpSenderMock.ts`) is the only one wired today. Logs the OTP code to stdout. Used by `apps/api` when `SMS_DRIVER=mock`.
- **Test driver** (in-memory) — not yet split out; current mock covers test mode.
- **Gateway driver** (production, real Android phones) — not yet implemented.

## Public HTTP API surface (today)

- `POST /send` — accepts `{ phone, message, requestId }`; mock driver logs and returns success
- `GET /health` — liveness check

## Dependencies

- `apps/api` calls the HTTP API for OTP dispatch

## Planned additions (future — likely S10 or a dedicated SMS-gateway sprint)

Per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md), the items below are tracked in the sprint that wires the real production OTP path:

- **Real-gateway driver** routing to real Android phones via WebSocket
- **WebSocket server** for `apps/phone-agent` connections:
  - Agent connects + authenticates with `AGENT_AUTH_TOKEN`
  - Gateway sends: `{ type: 'send', requestId, phone, message }`
  - Agent replies: `{ type: 'sent', requestId, success, error? }`
  - Heartbeat every 30s; 3 missed pings → agent marked down
- **Per-phone round-robin routing** + per-SIM rate limit (default: 80 SMS/day/SIM)
- **Per-phone health monitor**
- **Persistence** (Postgres, separate DB or dedicated schema):
  - `Phone { id, label, simNumber, simCarrier, isActive, addedAt }`
  - `SmsLog { id, phoneId, requestId, phoneNumber, status, errorMessage, sentAt }`
  - `RateLimitWindow { phoneId, windowStart, count }`
- **Extended HTTP surface**:
  - `GET /api/v1/phones` — list phones + health
  - `GET /api/v1/phones/:id/health` — per-phone metrics
  - `GET /api/v1/metrics` (Prometheus format)
- **Phone fleet sizing**: 5 phones for production launch (scale to 20); 1 reserved for dev/staging; 2-3 for batching tests
- **OTP SMS body format** (multi-platform autofill):

  ```text
  AutoTM code: 123456
  <android-app-hash>
  @auto.tm #123456
  ```

  - Android SMS Retriever app hash (compute after final mobile package name + signing cert exist)
  - iOS domain-bound SMS code AutoFill (`@auto.tm #123456`)

## Notable decisions

- [ADR-0006](../../docs/adr/0006-auth.md) — Phone OTP via custom gateway
- [ADR-0005](../../docs/adr/0005-hosting.md) — Server B placement
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
