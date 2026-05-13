# ADR-0002: Technology stack

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

We are rewriting AutoTM from scratch (Flutter + NestJS+Sequelize → web + mobile + new API). We need a stack that:

- Supports real-time chat (WebSockets)
- Works under air-gapped Turkmenistan hosting (no managed services available)
- Has strong typing across mobile, admin, web, and API
- Is hireable / well-documented (so future contributors aren't blocked)
- Plays well in a monorepo

## Decision

| Layer | Technology |
|---|---|
| **API** | NestJS 11 + Prisma 5 + Socket.IO 4 |
| **Database** | Postgres 16 (self-hosted) |
| **Cache + queue** | Redis 7 (self-hosted) |
| **Public web** | Next.js 15 (App Router) + shadcn/ui + Tailwind |
| **Admin web** | Next.js 15 (App Router) + shadcn/ui + Tailwind |
| **Mobile** | Expo + expo-router + NativeWind |
| **SMS gateway** | NestJS or Fastify (TBD at scaffold) + Kotlin Android phone agent |
| **Worker** | NestJS standalone + BullMQ consumer |
| **Object storage** | MinIO (self-hosted, S3-compatible) |
| **Media processing** | Self-hosted ffmpeg + Sharp |
| **Reverse proxy / TLS** | Caddy |
| **Job queue** | BullMQ |
| **Push** | FCM (Android) + APNS (iOS) with `PushPort` fallback abstraction |
| **Language** | TypeScript everywhere (strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| **Runtime** | Node.js 20 LTS |
| **Package manager** | pnpm 9 |

## Consequences

### Positive
- NestJS provides Level 2 architecture's structure for free (modules, DI, decorators)
- Prisma gives a single declarative schema file + great DX + reliable migrations
- Socket.IO works in NestJS via `@WebSocketGateway`, scales with Redis adapter
- Next.js + shadcn/ui is the de-facto modern web stack; OG metadata via `generateMetadata()` is first-class
- Expo + expo-router shares routing primitives with Next.js (familiar)
- All TypeScript end-to-end → shared `packages/contracts/` for Zod schemas + OpenAPI export
- All components run as Docker containers — air-gap deployment is straightforward

### Negative / accepted costs
- Heavy reliance on the JS/TS ecosystem — security + supply chain management is critical
- NestJS adds ~30% boilerplate vs Hono/Fastify (acceptable for the structure we want)
- Prisma + Socket.IO + NestJS aren't a single "preset" — we wire them ourselves
- Expo with native modules (react-native-compressor, expo-secure-store) needs a custom dev client, not Expo Go

### Neutral
- No exotic dependencies. Every choice is mainstream, well-supported, and replaceable.

## Alternatives considered

- **Hono / Fastify** for API — rejected: less opinionated, would re-create structural drift
- **Drizzle** ORM — rejected for Prisma: less mature migration tooling, smaller community
- **SvelteKit / Remix / Astro** — rejected: smaller ecosystems for the components we need
- **Flutter (keep current)** — rejected per the rewrite decision; structural pain was the driver
- **React Native CLI (no Expo)** — rejected: Expo's tooling, EAS Build, expo-router, expo-image-manipulator all save weeks
- **GraphQL over REST** — rejected: simpler REST + Zod contracts is enough; the surface is well-defined

## References

- Charter §2 (stack), §3 (apps), §4 (packages)
- Related: ADR-0001 (architecture), ADR-0003 (monorepo)
