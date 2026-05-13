# 82 — Incident response template

Use this when a significant incident occurs (production down, data loss, security breach, prolonged degradation).

## During the incident

### 1. Acknowledge

- Reply to the Telegram alert with `Acknowledged — investigating`
- Open this template (copy below) in a Markdown editor
- Start a timer / note start time

### 2. Triage

- Severity: SEV1 (down) / SEV2 (degraded) / SEV3 (partial)
- Scope: which features affected, % of users affected
- Impact: monetary, reputational, data integrity

### 3. Stabilize

- Priority is **stop the bleeding**, not understand root cause
- If recent deploy: rollback ([80-deployment-runbook.md](80-deployment-runbook.md))
- If DB issue: failover to replica (Phase 2 setup TBD)
- If feature gone: disable the feature (admin toggle if available)
- If security: revoke credentials, block IPs

### 4. Communicate

- Update the Telegram channel every 30 min minimum (even if "still investigating")
- If user-impacting: post a status banner in mobile app (Phase 2 — admin announcement)

### 5. Resolve

- Verify the fix in monitoring
- Run smoke tests
- Reply to Telegram: `Resolved at <time>`

## Post-incident — within 48 hours

Write a postmortem using the template below. **Blameless** — focus on the system, not people.

---

## Incident postmortem template

```markdown
# Incident <YYYY-MM-DD>: <one-line summary>

**Severity**: SEV-N
**Duration**: HH:MM
**User impact**: <how many users, what features unavailable, etc.>
**Status**: Resolved / Ongoing

## Timeline (all times UTC)

| Time | Event |
|---|---|
| 14:23 | Alert fired: API error rate at 8% |
| 14:25 | On-call ack'd, started investigating |
| 14:31 | Identified bad migration in v0.4.2 release |
| 14:35 | Rolled back to v0.4.1 |
| 14:38 | Error rate dropped to baseline |
| 14:45 | Verified all smoke tests pass |
| 14:50 | Resolved |

## Root cause

<what actually went wrong — be specific>

## Why it wasn't caught

<gaps in tests, monitoring, or process that allowed this to ship>

## What we changed

- Reverted v0.4.2
- Hotfix v0.4.3 with corrected migration
- Added integration test covering the failing scenario

## Action items

- [ ] (Date) Owner: Add CI check that blocks migrations dropping non-empty columns
- [ ] (Date) Owner: Improve pre-deploy DB backup verification
- [ ] (Date) Owner: Update runbook for migration-rollback scenarios

## What went well

- Alert fired within minutes
- Rollback was clean
- No data lost

## What could go better

- Migration drop-column not caught in CI
- Smoke tests don't yet cover the affected feature
- Took 8 minutes to identify the bad migration (could be 2 with better dashboards)
```

## Common incident categories

| Category | First-response action |
|---|---|
| Bad deploy / regression | Rollback to last known good version |
| Database performance | Identify slow query, add index, kill long-running query |
| Disk full | Free space (clean up + emergency expand if needed) |
| Push delivery degraded | Check FCM/APNS status, verify creds, fall back to ntfy if blocked |
| SMS gateway down | Switch to backup phones or `SMS_DRIVER=mock` (warning: blocks new logins) |
| TLS cert expired | Manual renewal via TM Proxy PC |
| Security breach (suspected) | Rotate all secrets, force re-login, audit log review |
| Data loss / corruption | Restore from backup, communicate with users, RCA |

## Severity definitions

**SEV1** — Production down or unusable
- Examples: API returning 500 for all requests, mobile app cannot start, all logins failing
- Action: All hands, every 30 min update, rollback if recent deploy

**SEV2** — Degraded for some users
- Examples: Chat broken, push notifications delayed > 30 min, search returning no results
- Action: Investigate within 1 hour, fix within 4 hours

**SEV3** — Minor or limited impact
- Examples: One niche feature broken, intermittent slowness on one endpoint
- Action: Plan fix within 24-48 hours

## Avoiding incidents

- Deploy on Tue/Wed mornings (not Fri afternoon)
- Always have a < 6h backup before deploying schema changes
- Use the migration discipline ([ADR-0004](../../adr/0004-migrations.md))
- Watch the dashboard for 30 min after every deploy
- Don't skip the smoke test in the runbook

## References

- [80-deployment-runbook.md](80-deployment-runbook.md)
- [81-monitoring-alarms.md](81-monitoring-alarms.md)
- [ADR-0010 — Observability](../../adr/0010-testing-obs.md)
