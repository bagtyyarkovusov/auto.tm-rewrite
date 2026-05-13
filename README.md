# AutoTM

Turkmenistan car marketplace. Mobile-first, multilingual (Russian / Turkmen / English), self-hosted inside Turkmenistan.

## Architecture at a glance

- **Mobile app**: Expo (Android + iOS)
- **Public web**: Next.js 16 (`auto.tm`) — landing, listings, dealers, blog
- **Admin web**: Next.js 16 (`admin.auto.tm`) — moderation, user mgmt, push, reports
- **API**: NestJS 11 + Prisma 7 + Postgres + Redis + Socket.IO
- **SMS gateway**: Custom Node service + Kotlin Android phone agent (TM has no commercial SMS API)
- **Object storage**: Self-hosted MinIO
- **All hosted inside Turkmenistan** (air-gapped, builds shipped via Docker image tarballs)

## Where to start

1. **`GRILL-OUTCOME.md`** — the design charter (locked decisions, the spec)
2. **`docs/adr/`** — architectural decisions (numbered, immutable)
3. **`docs/prd/`** — product requirements (mutable, structured)
4. **`CONTEXT-MAP.md`** — points to every `CONTEXT.md` in the tree
5. **`CLAUDE.md`** — agent policy for AI-assisted development

## Monorepo layout

```
apps/
  api/             NestJS API
  admin/           Next.js + shadcn — admin.auto.tm
  web/             Next.js + shadcn — auto.tm (public)
  mobile/          Expo (Android + iOS)
  sms-gateway/     Node service — OTP routing
  phone-agent/     Kotlin Android — runs on each OTP phone
  worker/          NestJS standalone — BullMQ consumer
packages/
  db/              Prisma schema + generated client
  contracts/       Zod schemas + OpenAPI export
  ui/              Design tokens + shared components
  tsconfig/        Shared tsconfig presets
  eslint-config/   Shared lint rules
infra/
  docker/          Dockerfiles
  compose/         docker-compose.dev.yml + docker-compose.prod.yml
```

## Local development

The scaffold is complete (May 2026). `pnpm install && pnpm dev` starts the full local stack.
See `docs/adr/0003-monorepo.md` for monorepo conventions.

```bash
# Install (once we have package.json deps wired up)
pnpm install

# Develop everything
pnpm dev

# Test everything
pnpm test

# Lint + typecheck
pnpm lint && pnpm typecheck
```

## Deployment

Air-gapped to Turkmenistan. See `docs/adr/0005-hosting.md` and `docs/prd/ops/80-deployment-runbook.md`.

```
build (on TM Proxy PC) → docker save → .tar.gz bundle → SCP to TM servers → docker load → docker compose up -d
```

## License

UNLICENSED — proprietary. See `LICENSE`.
