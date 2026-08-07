# `infra/compose/`

Docker Compose files. Created during code scaffolding session.

## Planned files

| File | Purpose |
|---|---|
| `docker-compose.dev.yml` | Local development — Postgres + Redis + MinIO + Mailpit (for testing) + app containers in watch mode |
| `docker-compose.prod.yml` | Production deployment to TM servers — full stack with healthchecks + restart policies |
| `docker-compose.observability.yml` | Prometheus + Grafana + Loki + Promtail + GlitchTip (lives on Server B) |
| `docker-compose.test.yml` | Spawns minimal Postgres + Redis for integration tests (used by Testcontainers fallback) |

## MinIO data contract

Local and TM-era Compose files mount MinIO's single data path at `/data`
(`minio-data:/data` in development, `/srv/auto-tm/minio:/data` in TM
production). Do not add a second object-data mount; backup/restore tooling
assumes the full object store lives under that one persistent path.

Bucket creation and anonymous-read policy setup are explicit, not an API boot
side effect:

```sh
pnpm compose:up
pnpm minio:bootstrap
```

The same endpoint variables drive the backup/restore scripts:

```sh
pnpm minio:backup /tmp/autotm-minio-backup
pnpm minio:restore /tmp/autotm-minio-backup
```

## Service catalog (production)

```
Server A:
  - api          (apps/api)
  - admin        (apps/admin)
  - web          (apps/web)
  - worker       (apps/worker)
  - postgres     (primary)
  - redis
  - minio
  - caddy        (reverse proxy + TLS)

Server B:
  - sms-gateway  (apps/sms-gateway)
  - phone-agent  (×N — runs on physical phones, not in Docker)
  - postgres-replica
  - prometheus
  - grafana
  - loki
  - promtail
  - glitchtip
```

## Networking

- Server A internal: `auto-tm-internal` bridge network — only Caddy exposes ports externally
- Server A ↔ Server B: Telecom-local network (no public exposure)
- Caddy publishes: 80 (HTTP → HTTPS redirect), 443 (HTTPS for all subdomains)

## See also

- [ADR-0005 — Hosting](../../docs/adr/0005-hosting.md)
- [Deployment runbook](../../docs/prd/ops/80-deployment-runbook.md)
- [Monitoring + alarms](../../docs/prd/ops/81-monitoring-alarms.md)
