# Context Map

Index of every `CONTEXT.md` in this repo. Each file documents the **current implemented state** of a workspace or bounded context: what it owns today, what invariants are enforced in code today, what ports exist today, what events have running emit/consume code today.

> **`CONTEXT.md` is the mutable mirror of current implementation.** ADRs are decisions (immutable, dated). PRD features files (`docs/prd/features/*.md`) describe product capability ambition. Sprint files (`docs/prd/sprints/sprint-NN-*.md`) describe what each sprint adds. `CONTEXT.md` describes what exists **after** each sprint ships — updated as part of any PR that changes domain invariants. Aspirational content (entities/fields not yet shipped) belongs in PRD or sprint files, never in CONTEXT.md. Locked 2026-05-17 — see [ADR-0019](docs/adr/0019-context-md-describes-current-state.md).

## Agent policy

Agents working in this repo read these files **before** the per-context `CONTEXT.md` entries below:

| File | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Root agent policy (canonical for Claude Code) — architecture rules, never-do list, verification gate |
| [`AGENTS.md`](AGENTS.md) | Cross-agent mirror of CLAUDE.md (Cursor, Codex, Windsurf, etc.) |
| [`docs/agents/documentation-lookups.md`](docs/agents/documentation-lookups.md) | Canonical Context7 MCP workflow + pinned library-ID table for the whole stack ([ADR-0017](docs/adr/0017-context7-as-canonical-doc-source.md)) |
| [`docs/agents/mobile-expo.md`](docs/agents/mobile-expo.md) | Mobile SDK alignment + dependency-check gate |
| [`docs/agents/nativewind-v4.md`](docs/agents/nativewind-v4.md) | Mobile styling with NativeWind v4 + React Native Reusables ([ADR-0014](docs/adr/0014-mobile-component-library.md)) |
| [`docs/agents/mobile-data-fetching.md`](docs/agents/mobile-data-fetching.md) | Mobile data fetching with TanStack Query v5 + `apiClient` wrapper ([ADR-0015](docs/adr/0015-mobile-data-fetching.md)) |
| [`docs/agents/typescript-runtime.md`](docs/agents/typescript-runtime.md) | TypeScript module-resolution boundaries for runtime-shared packages ([ADR-0016](docs/adr/0016-typescript-runtime-boundaries.md)) |
| [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) | GitHub Issues workflow + label vocabulary |
| [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) | Five-role label taxonomy |
| [`docs/agents/domain.md`](docs/agents/domain.md) | How this multi-context CONTEXT.md system works |

## Apps

| Workspace | File | Owns |
|---|---|---|
| API service | [`apps/api/CONTEXT.md`](apps/api/CONTEXT.md) | NestJS bounded contexts, HTTP + WS endpoints |
| Admin (Next.js) | [`apps/admin/CONTEXT.md`](apps/admin/CONTEXT.md) | Internal admin UI, moderation, user mgmt |
| Public web (Next.js) | [`apps/web/CONTEXT.md`](apps/web/CONTEXT.md) | Landing, listing detail, dealer page, blog — OG / SEO |
| Mobile (Expo) | [`apps/mobile/CONTEXT.md`](apps/mobile/CONTEXT.md) | Android + iOS app, the primary user surface |
| SMS gateway | [`apps/sms-gateway/CONTEXT.md`](apps/sms-gateway/CONTEXT.md) | Node service that orchestrates the OTP phone fleet |
| Phone agent | [`apps/phone-agent/CONTEXT.md`](apps/phone-agent/CONTEXT.md) | Kotlin Android app on each OTP phone |
| Worker | [`apps/worker/CONTEXT.md`](apps/worker/CONTEXT.md) | BullMQ consumer — video transcode, notification fanout |

## Bounded contexts (inside `apps/api/src/modules/`)

| Context | File | Phase | Owns |
|---|---|---|---|
| identity | [`identity/CONTEXT.md`](apps/api/src/modules/identity/CONTEXT.md) | 1 | User, Dealership, DealershipMember, OTP, Sessions, Garage, BlockedUser |
| catalog | [`catalog/CONTEXT.md`](apps/api/src/modules/catalog/CONTEXT.md) | 1 | Brand, Model, Generation, Color, BodyType, Region, City |
| listings | [`listings/CONTEXT.md`](apps/api/src/modules/listings/CONTEXT.md) | 1 | Listing, ListingMedia, Favorite, Draft |
| subscriptions | [`subscriptions/CONTEXT.md`](apps/api/src/modules/subscriptions/CONTEXT.md) | 1 | SavedSearch + match algorithm |
| conversations | [`conversations/CONTEXT.md`](apps/api/src/modules/conversations/CONTEXT.md) | 1 | Conversation, Message, QuickReply |
| notifications | [`notifications/CONTEXT.md`](apps/api/src/modules/notifications/CONTEXT.md) | 1 | Push transport, in-app feed, history |
| content | [`content/CONTEXT.md`](apps/api/src/modules/content/CONTEXT.md) | 1 | BlogPost (Bortzhurnal) |
| reports | [`reports/CONTEXT.md`](apps/api/src/modules/reports/CONTEXT.md) | **2** | InspectionReport, Tier, PDF artifacts |
| admin | [`admin/CONTEXT.md`](apps/api/src/modules/admin/CONTEXT.md) | 1 | Audit log, moderation, staff-media attribution |

## Mobile feature modules (inside `apps/mobile/src/`)

| Module | File | Owns |
|---|---|---|
| listings | [`listings/CONTEXT.md`](apps/mobile/src/listings/CONTEXT.md) | Upload pipeline, wizard state machine, autosave |

## Packages

| Package | File | Owns |
|---|---|---|
| Database | [`packages/db/CONTEXT.md`](packages/db/CONTEXT.md) | Prisma schema, migrations, seed data |
| Contracts | [`packages/contracts/CONTEXT.md`](packages/contracts/CONTEXT.md) | Zod schemas, OpenAPI exporter |
| UI | [`packages/ui/CONTEXT.md`](packages/ui/CONTEXT.md) | Design tokens, shared shadcn components |

## How to maintain this map

- Adding a new bounded context or app? Add a row above and create the `CONTEXT.md`.
- Renaming or removing a context? Update the row + leave a note in the relevant ADR.
- Don't let this map drift — review on every architecture-affecting PR.
