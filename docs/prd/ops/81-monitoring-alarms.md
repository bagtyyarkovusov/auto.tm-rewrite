# 81 — Monitoring + alarms

What we watch, what triggers a page, and what to do when it fires.

## Where things run

- **Prometheus** scrapes metrics from API + worker + sms-gateway + node_exporter on each VM
- **Loki + Promtail** aggregate Docker logs from all containers
- **GlitchTip** receives error reports from API + worker
- **Grafana** dashboards + Grafana Alerting
- **Telegram bot** (via TM Proxy PC VPN egress) for alert delivery

All running on Server B.

## Critical dashboards (commit Grafana JSON to repo)

### Overview

- Active users (last 1h, 24h, 7d)
- Listings: active, created today, marked sold today
- Conversations active (last 24h)
- Messages sent (last 1h, 24h)
- OTPs issued + delivered (last 24h)

### API health

- p50 / p95 / p99 latency per route
- Request rate
- Error rate per route (4xx vs 5xx)
- DB connection pool usage
- Memory usage per container

### Database

- Active connections
- Slow query log (queries > 500ms)
- Replication lag (Server A → Server B)
- Table sizes growing fastest

### Queue (BullMQ)

- Pending / active / failed counts per queue (`video-transcode`, `notification-fanout`, `push`, `image-variants`)
- Job duration p95
- Retry rate

### SMS gateway

- Per-phone connected status (green/red)
- Per-phone today's send count vs daily cap
- SIM credit balance (manual update)
- OTP request rate
- OTP delivery success rate

### Push

- FCM send success / fail counts
- APNS send success / fail counts
- Invalidated tokens count

### Chat

- WebSocket connections active
- Messages sent per minute
- Connection churn (connects + disconnects per minute)

### Admin moderation

- Pending content report count
- Oldest pending content report age
- Moderation action failure rate by action
- Audit write failures
- TOTP failure and throttle counters

## Alert rules

Severity tiers:

| Severity | Response time | Routing |
|---|---|---|
| **Critical** | Immediate | Telegram bot to admin channel |
| **High** | Within 1 hour | Telegram |
| **Medium** | Within 24 hours | Telegram (silent / no notification sound) |
| **Low** | Daily digest | Telegram once/day |

Until a formal on-call rotation exists, the release operator is the primary responder for the first 24 hours after a deploy. Outside that window, the founder/operator owning the beta invite cohort is primary. If neither can respond, pause the affected write path with the relevant beta flag before attempting manual repair.

### Critical (page immediately)

- API error rate > 5% for 5 min
- API p95 latency > 2000ms for 10 min
- DB connection pool exhausted (> 95% used) for 5 min
- Disk free < 5% on Server A or Server B
- All 5 OTP phones offline simultaneously for > 5 min (no OTPs deliverable)
- Postgres replica lag > 5 minutes
- Restore drill failure during a launch gate or schema-change readiness check

### High

- API error rate > 2% for 15 min
- Any single OTP phone offline > 15 min
- BullMQ queue depth > 500 for 10 min
- DB replica lag > 60s for 5 min
- TLS cert expiring in < 7 days
- FCM/APNS push failure rate > 10% for 15 min
- Disk free < 10%
- Server A memory > 90% for 10 min
- Any audit write failure for an otherwise successful admin moderation action
- Telegram alert delivery failure during a drill

### Medium

- TLS cert expiring in < 14 days
- BullMQ queue depth > 200 for 30 min
- Single FCM/APNS push failure rate > 5% sustained 1 hour
- Pending content reports > 5 sitting unreviewed for > 1 hour
- Oldest pending content report age > 24 hours during beta
- Moderation action failure rate > 5% for 15 min

### Low

- Failed login attempts spike (potential brute force)
- New user signups (daily count, for dashboard)
- Database table growth rate alerts

Moderation-specific Telegram alerts beyond pending count, oldest pending age, moderation action failure rate, and audit write failures are post-MLP unless beta safety explicitly reshapes them. Future rules should consume `ContentReportCreated` or aggregate thresholds such as repeated targets, pending-report age, or admin-set severity; reporters do not provide an `urgent` flag.

## Required drills

Before private beta, and before wider public launch, run and record these drills:

- **Alert delivery drill** — force a harmless test alert through Grafana to Telegram; confirm ack in the ops channel.
- **Rollback drill** — deploy a known-good test version in staging/prod-like infra, roll back, and verify health.
- **Restore drill** — restore a recent backup into staging/prod-like infra and run the deployment smoke set.
- **Feature-pause drill** — toggle each beta kill switch in staging/prod-like infra and verify the API blocks writes with `FEATURE_DISABLED` while allowed reads still work.
- **Moderation incident drill** — simulate a bad moderation action, reverse it through `unban` or `unsuspend`, verify a new audit row, and confirm the original audit row remains intact.

Record drill date, operator, environment, result, and follow-up issue links. A failed drill blocks beta launch unless S8 explicitly records the accepted risk and mitigation.

## Alert format (Telegram)

```
🚨 CRITICAL — AutoTM
API error rate at 8.3% for 5 minutes
Dashboard: https://grafana.auto.tm/d/api-health
Recent logs: <link>
Top errors:
  - PrismaClientKnownRequestError (45)
  - SocketTimeoutException (12)
```

The Telegram bot supports interactive commands:
- `/silence <alert-id> <duration>` — silence an alert
- `/escalate <alert-id>` — page secondary contact (Phase 2)
- `/status` — overview

## What to do when an alert fires (runbook stubs)

### API error rate spike

1. Open the Grafana dashboard → see which routes are erroring
2. Check GlitchTip for recent errors with stack traces
3. Check recent deploys (last 1 hour) — most spikes correlate to a release
4. If recent deploy: consider rollback ([80-deployment-runbook.md](80-deployment-runbook.md))
5. If not: check DB health, look for slow queries, check Redis
6. If a single write path is causing the spike, pause that path with the relevant beta flag before manual data repair

### SMS phone offline

1. Check Server B → is it reachable?
2. SSH to Server B, check `docker logs phone-agent-<phone-id>`
3. Common causes: phone reboot, USB disconnect, app crash, battery optimization kicked in
4. Physical fix: walk to the phone fleet, replug, restart agent
5. While 1 phone is down, routing falls to remaining phones (capacity check)

### Disk full

1. SSH to affected server
2. `df -h` to confirm
3. Find the largest consumers: `du -sh /var/lib/docker/*` etc.
4. Common culprits: video transcoded files retained, MinIO bucket growth, log rotation not happening
5. Clean up (move to Server B if needed); expand disk if needed

### TLS cert expiring

1. SSH TM Proxy PC
2. Run `./renew-certs.sh`
3. Script: obtains new cert via Let's Encrypt (using TM Proxy PC's VPN), uploads to TM servers, reloads Caddy
4. Verify: `curl -vI https://api.auto.tm` shows new expiry

## References

- [ADR-0010 — Testing + observability](../../adr/0010-testing-obs.md)
- [82-incident-template.md](82-incident-template.md)
- Server B observability stack: `infra/compose/docker-compose.prod.yml`
