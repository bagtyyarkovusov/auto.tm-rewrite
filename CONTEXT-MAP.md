# Context Map

Index of every `CONTEXT.md` in this repo. Each file documents the *current* state of a workspace or bounded context: what it owns, what invariants it maintains, what ports it exposes, what events it emits / consumes.

> `CONTEXT.md` is the *mutable* counterpart to ADRs. ADRs are decisions (immutable, dated). `CONTEXT.md` is "what is true right now."

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
