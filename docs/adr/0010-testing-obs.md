# ADR-0010: Testing pyramid + observability stack

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

The previous backend had brittle tests that mocked Prisma — passing tests, failing production. The rewrite needs a testing discipline that catches real bugs, plus an observability stack that works air-gapped.

## Decision

### Test pyramid

| Layer | Tool | Scope | When |
|---|---|---|---|
| **Unit** | Jest + ts-jest | `domain/` (pure TS rules) + `application/` (use-cases with mocked ports) | Every PR, every push |
| **Integration** | Jest + Testcontainers (real Postgres + Redis) | Repository impls, full use-case flows, FCM stubs | Every PR |
| **API e2e** | Supertest + Jest | Full HTTP flows: auth, listing CRUD, message send, saved-search match | Every PR |
| **Mobile e2e** | Maestro (YAML) | Happy paths: signup, browse, listing create, send message | Pre-release nightly |
| **Admin / Web e2e** | Playwright | Login, critical admin workflows | PR + nightly |
| **Contract drift** | OpenAPI schema diff | API contract vs `packages/contracts/` Zod types | Every PR |

### Critical-path integration tests (non-negotiable)

These must exist before launch:

- OTP issuance + verification + refresh-token rotation
- Listing creation with photo upload + variant generation
- Chat message round-trip (sender → DB → recipient via Socket.IO)
- Saved-search match → notification fan-out
- Refresh token revocation on logout

### Coverage targets

- **`domain/` + `application/`**: 70%
- **Overall**: 50%

We deliberately do not chase 100%. Coverage of trivial controllers, DTOs, and infrastructure is low-value.

### Test discipline rules

1. **Never mock Prisma.** Use Testcontainers with a real Postgres. Slower (~2 min for full suite); catches real bugs.
2. **Never mock Redis.** Same reason — real Redis container in tests.
3. **One use-case = one test file.** Mirror the source layout.
4. **TDD required for `domain/` + `application/`.** Test-first for business rules. Other layers: encouraged, not enforced.
5. **No flaky tests committed.** Fix or quarantine immediately.

### Observability stack — all self-hosted on Server B

| Concern | Tool | Why |
|---|---|---|
| Metrics | Prometheus + node_exporter + cAdvisor | Free, mature, low resource, OTEL-compatible |
| Logs | Loki + Promtail | Light, integrates with Grafana, fast at our volume |
| Traces | OpenTelemetry SDK in NestJS + Tempo (Phase 2) | OTel SDK from day 1; Tempo deferred until we need traces |
| Dashboards | Grafana | Standard, free |
| Errors | GlitchTip (Sentry-compatible, self-hosted) | Real stack traces, release tracking, alert rules |
| Uptime probes | Cron job in `apps/worker` hitting each endpoint every 60s | Lightweight, exports to Prometheus |
| Alerts | Grafana Alerting → Telegram bot via TM Proxy PC | No PagerDuty/Slack outbound; Telegram works through proxy |

### Critical dashboards (commit to repo as Grafana JSON)

From day 1:
- API latency p50/p95/p99 per route
- API request rate + error rate per route
- DB connections, slow query log, replication lag (Server A → B)
- Redis ops/sec, memory, evictions
- BullMQ pending / active / failed queue counts
- SMS gateway: per-phone health, last successful send, SIM credit (manual entry)
- FCM/APNS push success/fail rate
- WebSocket: connections active, messages per minute

### Alerts (initial set)

- API error rate > 5% for 5 min → Telegram
- DB replication lag > 60s → Telegram
- Queue depth > 100 for 10 min → Telegram
- Any phone "down" for > 90s → Telegram
- Disk free < 10% on Server A or B → Telegram
- TLS cert expiring in < 14 days → Telegram

## Consequences

### Positive
- Real-DB tests catch bugs that mocked tests miss
- Observability stack is fully owned — no SaaS billing or vendor lock
- Grafana dashboards travel as code (JSON in repo)
- Alerts route through TM Proxy PC → Telegram, fully in-band

### Negative / accepted costs
- Testcontainers makes unit suite slower (acceptable: ~2 min)
- ~2 GB RAM on Server B for the full observability stack
- We become responsible for keeping Grafana / Loki / Prometheus updated

### Neutral
- We accept that traces (OTel + Tempo) are deferred to Phase 2 — most debugging in MVP is doable with logs + metrics.

## Alternatives considered

- **Mock Prisma in tests** — rejected: previous codebase pain.
- **Sentry cloud** — rejected per ADR-0005 (air-gap).
- **Datadog / New Relic** — rejected per ADR-0005.
- **No test pyramid, just e2e** — rejected: slow feedback, brittle.

## References

- Charter §13 (testing), §14 (observability)
- Related: ADR-0001 (architecture — domain/application is testable), ADR-0005 (hosting)
