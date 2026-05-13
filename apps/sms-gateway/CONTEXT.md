# apps/sms-gateway — CONTEXT

## Purpose

The Node service that orchestrates the AutoTM physical Android phone fleet for OTP SMS delivery. Lives on Server B in TM, on the same network as the connected phones.

## What it contains

- HTTP API consumed by `apps/api`: `POST /send`, `GET /phones/:id/health`, `GET /metrics`
- WebSocket server for the Android phone agents to maintain persistent connections
- Job queue with per-phone round-robin routing
- Per-phone health monitor
- Per-SIM rate limit (default: 80 SMS/day per SIM)
- Per-IP and per-phone OTP request rate limits (defense in depth — also enforced upstream in `apps/api`)
- Test driver (`SMS_DRIVER=test`) — no-op, returns code in response (CI + dev)
- Mock driver (`SMS_DRIVER=mock`) — fakes success (dev without phones)
- Gateway driver (`SMS_DRIVER=gateway`) — production, routes to real phones

## Phone fleet sizing

- **5 phones for production launch** (with capacity to scale to 20)
- 1 phone reserved for dev / staging single-phone tests
- 2-3 phones for batching / sequencing tests

## Public HTTP API surface

```
POST /api/v1/send
  Body: { phone: E.164, message: string, requestId: uuid }
  Returns: { dispatched: boolean, phoneId?: string, error?: string }

GET /api/v1/phones
  Returns: list of phones with health status

GET /api/v1/phones/:id/health
  Returns: { connected, lastSendAt, todaySendCount, errorRate, simCreditBalance }

GET /api/v1/metrics  (Prometheus format)
```

## WebSocket protocol (agent ↔ gateway)

- Agent connects via WS, authenticates with `AGENT_AUTH_TOKEN`
- Gateway sends: `{ type: 'send', requestId, phone, message }`
- Agent replies: `{ type: 'sent', requestId, success, error? }` after Android `SmsManager` call
- Heartbeat: ping every 30s; agent missing 3 pings → marked down

## Storage

- Lightweight Postgres (separate DB from main API) for:
  - `Phone { id, label, simNumber, simCarrier, isActive, addedAt }`
  - `SmsLog { id, phoneId, requestId, phoneNumber, status, errorMessage, sentAt }`
  - `RateLimitWindow { phoneId, windowStart, count }`

OR for simplicity in MVP, share the main API's Postgres with a dedicated `sms_gateway` schema.

## Dependencies

- `apps/phone-agent` (Android Kotlin) — connects via WS
- `apps/api` (consumes the HTTP API)

## Notable decisions

- [ADR-0006](../../docs/adr/0006-auth.md) — Phone OTP via custom gateway
- [ADR-0005](../../docs/adr/0005-hosting.md) — Server B placement
