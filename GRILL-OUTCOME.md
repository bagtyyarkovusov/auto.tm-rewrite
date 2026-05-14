# AutoTM Rewrite — Design Charter

> Output of the architectural grilling session held 2026-05-12 → 2026-05-13.
> Every decision below is **locked**. Open this file when starting any new session
> on this project so the AI has full context without re-grilling.

---

## 1. Strategy

- **Full rewrite** (greenfield — no data migration; empty Postgres on day one)
- Phased delivery:
  - **Phase 1** (~8-10 weeks) — Marketplace MVP: identity, listings, chat, notifications, garage, blog, public web, admin
  - **Phase 2** (~6-8 weeks) — Inspection reports + 3-tier system + PDF export + AutoTM-staffed pro media
  - **Phase 3** (~4-6 weeks) — 360° orbit photos + comparisons + polish
- Reference design: auto.ru, simplified for TM market
- Brand identity: red `#E60000` carried from previous Flutter app; rest of design fresh

## 2. Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| API | NestJS 11 + Prisma 5 + Socket.IO 4 + Postgres 16 + Redis 7 |
| Web (public) | Next.js 15 + shadcn/ui + Tailwind |
| Web (admin) | Next.js 15 + shadcn/ui + Tailwind |
| Mobile | Expo + expo-router + NativeWind |
| Shared tokens | `packages/ui/tokens/` consumed by all frontends |
| Object storage | Self-hosted MinIO (S3-compatible) |
| Media processing | Self-hosted ffmpeg + Sharp |
| Reverse proxy / TLS | Caddy |
| SMS gateway | Custom Node service + Kotlin Android phone agent (full rewrite) |
| Job queue | BullMQ + Redis |
| Push | FCM + APNS (verified reachable from TM); PushPort abstraction kept as insurance |

## 3. Monorepo apps (7)

```
apps/
├── api/             NestJS API (Server A)
├── admin/           Next.js + shadcn — admin.auto.tm
├── web/             Next.js + shadcn — auto.tm (public landing + listings + dealers + blog)
├── mobile/          Expo (Android + iOS)
├── sms-gateway/     Node service for OTP routing (Server B)
├── phone-agent/     Kotlin Android — runs on each OTP phone
└── worker/          NestJS standalone — BullMQ consumer
```

## 4. Packages (5)

```
packages/
├── db/              Prisma schema + generated client
├── contracts/       Zod schemas + OpenAPI export
├── ui/              Design tokens + shared shadcn components
├── tsconfig/        Shared tsconfig presets
└── eslint-config/   Shared lint rules
```

## 5. Bounded contexts (9 — in `apps/api/src/modules/`)

| Context | Owns | Notes |
|---|---|---|
| `identity/` | User, Dealership, DealershipMember, OTP, sessions, OwnedVehicle (Garage), BlockedUser | |
| `catalog/` | Brand, Model, Generation, Color, BodyType, Region, City | Trilingual columns (`name_ru, name_tk, name_en`) |
| `listings/` | Listing, ListingMedia, Favorite, Draft, VinDecoderPort | |
| `subscriptions/` | SavedSearch + MatchEvaluator | Synchronous push-on-event with debounced digest |
| `conversations/` | Conversation, Message, QuickReply | Per-listing scoping; text/image/post_ref/system message types |
| `notifications/` | FcmPush, InAppFeed, NotificationHistory, NotificationPreference, PushPort | 6 categories with granular opt-out |
| `content/` | BlogPost (Bortzhurnal) | |
| `reports/` | InspectionReport, RubricTemplate, Tier, PdfArtifact | **Phase 2** |
| `admin/` | AuditLog, ContentModeration, StaffMedia attribution | |

**Layer rules (Level 2 architecture):**
- `domain/` — pure TS, framework-free, NO Prisma
- `application/` — one use-case per file, one method (`execute()`)
- `infrastructure/` — Prisma repositories, FCM clients, mappers
- `presentation/` — thin HTTP controllers + WS gateways
- **Cross-context calls go through injected ports OR event bus; never direct domain imports**

## 6. Authentication

- **Mobile + public web**: Phone OTP via custom Android SMS gateway (5 phones in prod to start; scale to 20)
- **Admin**: Phone OTP + TOTP 2FA
- **Anonymous browsing**: listings, dealers, catalog, blog all readable without auth
- **Action-gated**: tap-to-auth pattern with deferred-action replay
- **Sessions**: JWT access (15 min) + DB-hashed refresh tokens, rotated on every refresh

## 7. Chat (headline MVP feature)

- Conversation scoping: **per-listing** (one conversation per `{buyer, listing}`)
- Message types: `text | image | post_ref | system`
- Attachments in Phase 1: text + 1 image per message + post-card refs (5 MB image cap)
- Read receipts, typing indicators, 5-min presence
- Block / report user from Phase 1
- Encryption: **plain TLS in transit** (no E2E — moderation > confidentiality for marketplace)
- Write-then-deliver persistence; FCM/APNS when offline
- Single Node instance; Redis adapter ready behind a config flag for horizontal scale

## 8. Notifications + Subscriptions

- **6 categories**: direct messages, saved-search matches, listing activity, admin announcements, blog activity, marketing
- Per-category opt-out + per-item (per-conversation, per-search) granular mute
- Admin "important" override only for outages/security
- Saved-search subscription:
  - Triggered by `ListingCreated` event
  - Sync query against saved searches → matches → notifications
  - Rate-limited: **max 1 notification per saved-search per hour, bundled digest**
  - Entry points: save-from-results, notify-from-Garage-dream, follow-brand-model

## 9. Infrastructure (Topology C — fully in-TM, air-gapped)

| Box | Role |
|---|---|
| **Server A** | `apps/api` + Postgres (primary) + Redis + MinIO + Caddy + `apps/admin` + `apps/web` + `apps/worker` |
| **Server B** | `apps/sms-gateway` + 5-20 phones via USB hub + Postgres replica + Prometheus + Grafana + Loki + GlitchTip + backups |
| **TM Proxy PC** | GitHub Actions runner (primary) + VPN egress + VIN decoder proxy + admin backup drive. Production infrastructure with UPS. |
| **Your computer (China/Mac)** | GitHub Actions runner (backup) |
| **OTP phones** | Kotlin Android `phone-agent`, USB-tethered, individual TM SIMs. Start with 5 prod, 1 dev, 2-3 staging. |

**Network reality:**
- TM Telecom is closed: TM hosts can talk to each other; TM hosts cannot reach abroad (except FCM/APNS endpoints, which are confirmed reachable from VM provider)
- Outside (e.g., China) can SSH into TM VMs; cannot reach personal computers
- TM Proxy PC bridges this: legal VPN on personal PC, reachable from VMs on Telecom network

**Deployment workflow:**
- CI builds Docker images on self-hosted runner → `docker save` → `.tar.gz` bundle
- Transfer to TM Servers via SCP over Telecom (or USB)
- `docker load` + `docker compose up -d` on TM side
- Prisma migrations run at container start (`migrate deploy`)
- Forward-only migrations

## 10. i18n + Search

- **UI locales**: Russian + Turkmen + English from day 1
- **URL locale**: in-path (`/ru/`, `/tk/`, `/en/`)
- **Catalog tables**: trilingual columns
- **Listing content**: single-locale (whatever seller wrote); auto-detected language metadata via `franc`
- **Search**: Postgres native FTS with `pg_catalog.simple` tokenizer (handles Cyrillic + Latin both); upgrade path to Meilisearch documented but not built

## 11. Media handling

- **Upload path**: Presigned URL → direct to MinIO (API never holds bytes)
- **Image variants**: Eager (on upload) — thumbnail (200×200) + list (600×400) + detail (1200×800) + fullscreen (2400×1600), JPEG + WebP
- **Client compression mandatory**:
  - Photos: `expo-image-manipulator` → max 2400px, JPEG 80
  - Videos: `react-native-compressor` → ≤60s, 720p, ~1 Mbps H.264, ~7-10 MB max
- **Video pipeline**: Async worker (BullMQ + Redis) → ffmpeg → HLS variants (320p + 720p) + poster frame at 2s
- **Serving**: Caddy at `media.auto.tm` with 1-year immutable cache headers
- **Storage buckets** (MinIO): `listing-photos`, `listing-videos`, `chat-attachments`, `user-avatars`, `inspection-reports` (Phase 2), `orbit-photos` (Phase 3)
- **Orphan cleanup**: Nightly cron deletes unreferenced objects > 24h

## 12. Design system

**Tokens** in `packages/ui/tokens/`:
- `palette` — red 50-900 (brand), neutral 0-950, green/amber/rose/blue 500
- `colors` — semantic mappings (primary, surface, text, error, etc.)
- `type` — Inter font; scale xs (11) → 5xl (44); weights 400/500/600/700
- `spacing` — 4px base grid (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- `radius` — none/sm/md/lg/xl/2xl/full
- `shadow` — sm/md/lg
- `motion` — duration (instant/fast/base/slow) + standard easing

**Critical fix from old Flutter palette**: error moves from `#FF3B30` to rose `#F43F5E` to be distinct from brand red.

**Mode**: System-default + per-user override (Light / Dark / System) in `useColorScheme()`-driven theme.

**Implementation**:
- Web: shadcn/ui (Radix + Tailwind), reads tokens via CSS variables
- Mobile: React Native + NativeWind (Tailwind classnames in RN)
- Icons: Lucide (`lucide-react` + `lucide-react-native`)

## 13. Testing

| Layer | Tool | Scope |
|---|---|---|
| Unit | Jest + ts-jest | `domain/` + `application/` |
| Integration | Jest + Testcontainers (real Postgres + Redis) | Repository implementations, full use-case flow |
| API e2e | Supertest + Jest | Full HTTP flows |
| Mobile e2e | Maestro (YAML) | Happy paths |
| Admin/Web e2e | Playwright | Critical workflows |
| Contract drift | Existing pattern | OpenAPI ↔ frontend types |

- **Coverage**: 70% domain/application, 50% overall
- **TDD**: required for `domain/` + `application/`; encouraged elsewhere
- **NEVER mock Prisma** — use real Postgres in tests

## 14. Observability

Running on **Server B** (separate from API):
- **Metrics**: Prometheus + node_exporter + cAdvisor
- **Logs**: Loki + Promtail
- **Errors**: GlitchTip (self-hosted, Sentry-compatible)
- **Traces**: OpenTelemetry SDK in NestJS; Tempo backend deferred to Phase 2
- **Dashboards**: Grafana
- **Alerts**: Grafana Alerting → Telegram bot (via TM Proxy PC VPN)

Critical dashboards from day 1: API latency/error rate, DB connections, Redis ops, queue depth, SMS phone health, push success rate, WebSocket connections.

## 15. Documentation systems (don't mix)

| System | Location | Count at scaffold | Purpose |
|---|---|---|---|
| ADRs (immutable decisions) | `docs/adr/` (root) + `apps/*/docs/adr/` | **10** | Why we chose X over Y, dated, never edited |
| `CONTEXT.md` (mutable domain language) | Per app + per bounded context | **16** | What things are, current invariants |
| PRD (product spec) | `docs/prd/` | **~35 files** | What we're building and why |
| Matt Pocock skill configs | `docs/agents/` | **3** | Issue tracker + triage labels + multi-context layout |
| Root index | `CONTEXT-MAP.md` | **1** | Points to every CONTEXT.md |

## 16. API + DB conventions

**API**
- Versioning: `/api/v1/...` prefix
- Resource paths: kebab-case plural nouns
- IDs: UUIDs
- Pagination: cursor-based for feeds (`?cursor=abc&limit=20`); offset for admin tables
- Error format: `{ statusCode, code, message, details?, timestamp, requestId }` — programmatic codes + user-friendly messages
- Auth header: `Authorization: Bearer <jwt>`
- Rate limits: 60/min/IP global; 5/phone/day + 10/IP/hour for OTP issue with exponential backoff
- Request tracing: `X-Request-Id` (server generates if absent)
- Locale: `Accept-Language: ru,tk,en`
- Client version: `X-Client-Version` for hard-cutoff support
- All timestamps: ISO 8601 UTC

**Database**
- Primary keys: UUID v4
- `createdAt` / `updatedAt` on every table, auto-managed
- Soft-delete via `deletedAt` ONLY on `Listing` and `BlogPost`; hard-delete everywhere else
- Column naming: snake_case in DB, camelCase in Prisma model
- Enums: Postgres native via Prisma `enum`
- JSON columns: sparingly (saved-search filters, message payload metadata)
- Indexes: explicit on every query path

## 17. Currency + phone validation

- **Currencies**: `TMT` | `USD` | `AED` (admin-edited FX rates table, manual update — no live FX API since air-gapped)
- **Phone validation MVP**: TM-only (`+993` followed by mobile prefix 6X/7X). Normalize to E.164. Reject other country codes with clear error. International support in Phase 2.
- **SMS_DRIVER env var**: `test` (CI, code in response) | `mock` (dev without phones, fake success) | `gateway` (production, real phones)

## 18. Phase 1 build order (recommended sprint sequence)

| Sprint | Focus |
|---|---|
| 1 | Scaffold + infra (commits 1-16 of the scaffold plan) |
| 2 | Identity (OTP login end-to-end with mock SMS driver) |
| 3 | Catalog (Brand/Model/Generation pickers + seed data ported from old backend) |
| 4 | Listings CRUD (create, edit, photos, anonymous browse) |
| 5 | Listings UX (search, filters, favorites, drafts, deep links) |
| 6 | Garage + Dealership pages |
| 7 | Conversations (chat 1:1 + post-card refs + read receipts) |
| 8 | Notifications + Subscriptions (FCM push + saved-search match fan-out) |
| 9 | Admin dashboard (moderation, user mgmt, send notification, SMS gateway health) |
| 10 | Public web + Blog + Polish (landing, listing detail, dealer pages, OG metadata, app-store readiness) |

## 19. Outstanding action items (parallel to scaffolding)

1. **TLS cert strategy**: Let's Encrypt obtained via TM Proxy PC, SCP'd to TM servers, renewal automated
2. **Verify NTP outbound** from TM VMs to public NTP pool; if blocked, run NTP on TM Proxy PC
3. **Provision TM Proxy PC hardware** (UPS, dedicated, reliable Wi-Fi to Telecom)
4. **Source first 1-2 OTP phones** for development
5. **Register / verify domain** `auto.tm` (and `admin.auto.tm`, `api.auto.tm`, `media.auto.tm` subdomains)
6. **Apple Developer account** ($99/yr) + **Google Play Console** ($25 one-time) before app store submission
7. **Privacy Policy + Terms of Service** in RU + TK + EN — required for app store
8. **Account deletion endpoint** + screen (`DELETE /api/v1/me`) — Apple App Store requirement
9. **Port catalog seed data** from old `cars.brands.json` to trilingual JSON for `prisma/seed/`
10. **Docker base image bundling** — first bundle ships base images (`node:20-bookworm-slim`, `postgres:16`, `redis:7`, `caddy:2`, `minio/minio`, observability stack); subsequent bundles ship only app images

## 20. Scaffold sequence (next session)

---

## 21. Revision log

### 2026-05-13 — Latest-stable version uplift (recorded in ADR-0011)

| Component | Charter (locked 2026-05-12) | Now using | Reason |
|---|---|---|---|
| Node.js | 20.10.0 | **22.11.0 LTS** | Latest LTS; charter under-pinned |
| Prisma | 5 | **7.6.0** | Latest stable; config moved to `prisma.config.ts`; driver adapter `@prisma/adapter-pg` required |
| Next.js | 15 | **16.2.2** | Latest stable; App Router unchanged |
| Tailwind CSS | (implied v3) | **4.1** | CSS-first config; `@tailwindcss/postcss` replaces `tailwind.config.js`-as-preset |
| Expo SDK | unspecified | **55** | Latest stable; RN 0.83; New Architecture mandatory |

These are the only locked-decision revisions. Everything else (NestJS 11, Socket.IO 4, Postgres 16, Redis 7, etc.) remains as the charter specified.

### 2026-05-14 — Identity model refinements ahead of Sprint 2 (ADR-0012, ADR-0013)

Two refinements to §6 (Authentication) and §5 (Bounded contexts), prompted by the Sprint 1 retrospective and a fresh grilling session:

- **Auth is multi-device** (ADR-0012, supersedes ADR-0006 §"Refresh token storage" only). Refresh tokens live on `Session` rows (bcrypt-hashed), not on `User`. Max 10 concurrent sessions per user with FIFO eviction. Refresh updates the session row in-place (sliding 30-day expiry). New `POST /auth/logout-all` endpoint added.
- **`User.role` and `DealershipMember.role` are separate concerns** (ADR-0013). `User.role ∈ {buyer, seller, moderator, admin}` is marketplace identity. New `DealershipMember.role ∈ {owner, sales}` is membership role within a specific dealership. The contracts' `dealer_owner`, `dealer_member`, and `super_admin` values are dropped.
- **`TotpEnrollment` deferred to Sprint 9** (admin dashboard). ADR-0006's TOTP-for-admins policy stands; the table and flow ship when admin role is first exercised.

The rest of §6 (phone OTP, JWT access TTL 15 min, refresh TTL 30 days, action-gated browsing) is unchanged.

Run from `/Users/bagtyyar/Projects/auto.tm-rewrite/`:

```
Commit 1   Repo init: workspace files, turbo.json, tsconfig, .gitignore, CLAUDE.md, AGENTS.md, README, LICENSE
Commit 2   Agent configs + CONTEXT-MAP + ADR-0001 (architecture)
Commit 3   ADRs 0002-0010 (stack, monorepo, migrations, hosting, auth, i18n, media, notifications, testing-obs)
Commit 4   packages/ui — design tokens + theme
Commit 5   packages/db — Prisma schema with all Phase 1 tables + initial migration
Commit 6   packages/contracts — Zod schemas + OpenAPI exporter
Commit 7   apps/api — NestJS skeleton with empty modules for 9 contexts + per-context CONTEXT.md stubs
Commit 8   apps/admin — Next.js + shadcn init
Commit 9   apps/web — Next.js + shadcn init
Commit 10  apps/mobile — Expo + expo-router + 5-tab nav skeleton
Commit 11  apps/sms-gateway — Node skeleton with port abstractions
Commit 12  apps/phone-agent — Kotlin Android skeleton (Gradle init, manifest, foreground service stub)
Commit 13  apps/worker — BullMQ consumer skeleton
Commit 14  infra/docker — Dockerfiles + docker-compose dev + prod
Commit 15  .github/workflows — self-hosted runner CI + Makefile (build/load/deploy/rollback)
Commit 16  docs/prd — README + 00-vision + 01-glossary + 02-phases stubs
```

After commit 16: `pnpm dev` runs the local dev stack; `pnpm test` runs the pyramid; `pnpm build && make bundle` produces the air-gapped release tarball.

---

*End of charter. Update this file only when a locked decision is consciously revisited — and add a section noting the revision date and reason.*
