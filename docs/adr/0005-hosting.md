# ADR-0005: Fully-in-Turkmenistan air-gapped hosting

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

Turkmenistan Telecom is a closed national network:

- TM hosts can communicate with each other freely
- TM hosts cannot reach foreign servers (outbound is blocked or unreliable)
- Foreign hosts can reach TM VMs that have public IPs (inbound SSH works)
- Personal computers in TM (e.g., developer laptops) can have VPNs legally; **VMs cannot**

This rules out:
- Cloud platforms (AWS, GCP, Azure, Vercel, Railway, Fly, Hetzner-only)
- Managed databases (Neon, Supabase, RDS, Cloud SQL)
- CDNs (Cloudflare, Bunny — both are sometimes blocked in TM anyway)
- SaaS observability (Sentry cloud, Datadog, Grafana Cloud)
- Build systems that pull from npm/Docker Hub during deploy

## Decision

**Topology C — fully in-TM, air-gapped.** All production services run on hardware inside Turkmenistan.

### Infrastructure tiers

| Box | Role | Hardware target |
|---|---|---|
| **Server A** (primary) | `apps/api` + Postgres (primary) + Redis + MinIO + Caddy + `apps/admin` + `apps/web` + `apps/worker` | 8 vCPU / 16-32 GB RAM / 500 GB SSD |
| **Server B** | `apps/sms-gateway` + 5-20 OTP phones via USB + Postgres streaming replica + Prometheus + Grafana + Loki + GlitchTip + backup target | 4 vCPU / 16 GB RAM / 500 GB SSD |
| **TM Proxy PC** | GitHub Actions self-hosted runner (primary) + VPN egress (legal on personal computer) + VIN decoder proxy + admin manual backup drive | 16 GB RAM, SSD, UPS, reliable Wi-Fi to TM Telecom |
| **Developer machine abroad** | GitHub Actions self-hosted runner (backup) | The developer's Mac / Windows machine |

### Deployment workflow

```
Code change
   ↓
git push → GitHub
   ↓
Self-hosted runner (TM Proxy PC primary, abroad-dev backup) picks up job
   ↓
1. pnpm install (online)
2. turbo run build
3. turbo run test
4. docker build -t auto-tm/{api,admin,web,sms-gateway,worker}:v0.x.y
5. docker save → auto-tm-release-v0.x.y.tar.gz
   ↓
Transfer to TM Servers via:
  - SCP over Telecom (from TM Proxy PC — fast, local network)
  - SCP from abroad-dev via SSH-into-TM-VM (slower, intercontinental)
  - USB drive (manual fallback)
   ↓
On TM Server:
1. tar -xzf auto-tm-release-v0.x.y.tar.gz
2. docker load < images.tar
3. docker compose -f docker-compose.prod.yml up -d
   ↓
prisma migrate deploy runs on container start
   ↓
Caddy zero-downtime rolling restart
   ↓
Old image kept for rollback
```

### Air-gap-specific constraints

- **All Docker base images** (`node:20-bookworm-slim`, `postgres:16`, `redis:7`, `caddy:2`, `minio/minio`, observability stack) ship in the **first** bundle. Subsequent bundles ship only app images.
- **All npm packages** ship inside the Docker image — no runtime `npm install`.
- **No outbound calls** from API or worker. External integrations (VIN decoder, future maps) route through TM Proxy PC.
- **TLS certificates**: Let's Encrypt obtained on TM Proxy PC (which has VPN), then SCP'd to TM servers. Renewal automated via cron + scp.
- **NTP**: assumed reachable on port 123 from TM VMs; if blocked, run NTP server on TM Proxy PC.
- **Push notifications (FCM / APNS)**: verified reachable from TM VM provider.

### Backups

- **Layer 1 — automatic**: Nightly `pg_dump` on Server A → Server B (replica). Retain 14 daily, 8 weekly, 12 monthly.
- **Layer 2 — manual**: Admin panel "Export full backup" button → downloads .tar.gz to admin's browser → saved to TM Proxy PC drive.
- **Layer 3 — offline**: Quarterly encrypted disk rotation kept by AutoTM staff.

### Domain + DNS

- `auto.tm` (public), `admin.auto.tm` (admin), `api.auto.tm` (API), `media.auto.tm` (MinIO via Caddy)
- DNS managed at a registrar reachable from outside TM (so the dev can update records without VPN trickery)
- A records point directly to TM Server A's public IP — **no Cloudflare in front** (avoid blocking risk)

## Consequences

### Positive
- Best possible latency for TM users
- No dependence on foreign infrastructure that could be blocked
- Regulatory simplicity — everything in-country
- Lower long-term cost than managed cloud at scale (no egress fees, no per-request pricing)

### Negative / accepted costs
- Significant ops burden — we run our own DB, Redis, storage, observability
- Air-gap deployment adds friction: every deploy involves a build+transfer step
- Disaster recovery is harder — no easy second region to fail over to
- Hiring engineers familiar with self-hosted infra is harder than hiring "cloud people"
- Base image bundling is a one-time-but-painful step

### Neutral
- We have a clear scaling path: add Server C as a delayed DR replica; split workers to a dedicated box; eventually shard Postgres if the marketplace grows beyond a single-box capacity.

## Alternatives considered

- **Topology A — fully outside TM (cloud)** — rejected: poor latency for TM users, intermittent blocking of CF/Vercel, egress costs at scale.
- **Topology B — hybrid (API outside, gateway in-TM)** — rejected: still requires foreign cloud reachability from TM, which is the core constraint we're working around.
- **Use Kubernetes** — rejected for MVP: Docker Compose is enough at this scale; K8s adds operational complexity we don't need yet.

## References

- Charter §9 (infrastructure), §19 (outstanding action items)
- Related: ADR-0004 (migrations run in-container), ADR-0006 (SMS gateway hardware), ADR-0009 (push routing)
