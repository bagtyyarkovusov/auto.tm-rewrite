# ADR-0001: Level 2 bounded-contexts architecture

- **Status**: Accepted
- **Date**: 2026-05-13
- **Deciders**: AutoTM founder + AI architect

## Context

The previous AutoTM backend (NestJS + Sequelize) suffered from:

- Tight coupling between modules — changing one entity broke five
- Bloated services with no domain model
- Entity-driven design — schemas dictated everything, business logic leaked
- No feature folders — adding a feature touched 12 files across 6 modules
- Difficulty making changes without breaking unrelated code

Switching frameworks or ORMs alone would not fix this. The structure is owned by *how* code is organized, not what tools it uses.

## Decision

We adopt a **Level 2 bounded-contexts-with-use-cases** architecture for `apps/api`. Each top-level folder under `apps/api/src/modules/` is a *bounded context* with this layout:

```
modules/<context>/
├── domain/         pure TS — entities, value objects, invariants, NO Prisma, NO Nest
├── application/    use-cases — one file per use-case, one class with one execute() method
├── infrastructure/ Prisma repositories, FCM clients, mappers, external adapters
├── presentation/   thin HTTP controllers + WebSocket gateways — only call use-cases
└── <context>.module.ts
```

The nine contexts for Phase 1 + 2 are:

- `identity` — users, dealerships, OTP, sessions, garage
- `catalog` — brands, models, generations, colors, regions (reference data)
- `listings` — car ads, photos, videos, favorites, drafts
- `subscriptions` — saved searches + match evaluation
- `conversations` — chat
- `notifications` — push + in-app feed
- `content` — Bortzhurnal blogs
- `reports` — inspection reports (Phase 2)
- `admin` — audit log + moderation

### Five rules enforced by lint config + reviews

1. **A bounded context never imports another context's `domain/` or Prisma models.** Communication is via ports (small TS interfaces) or events (`@nestjs/event-emitter`).
2. **One use-case per file, max ~100 lines.** Use cases are verbs (`SendMessage`, `CreatePost`, `MatchSavedSearch`).
3. **Domain layer is framework-free.** No decorators, no Prisma imports. Pure TypeScript business rules.
4. **Prisma models live only in `infrastructure/`.** Repositories map Prisma rows to domain entities at the boundary.
5. **Every architecture decision is captured as an ADR.**

## Consequences

### Positive
- Bounded contexts have small, well-defined blast radii — changes within `conversations/` don't ripple into `listings/`.
- Use-cases are individually testable without spinning up HTTP.
- Domain layer can be tested without any framework.
- Engineers can locate "where the rule lives" — domain entities are the home for invariants.
- Adding a new feature usually means adding files inside one context, not editing files across many.

### Negative / accepted costs
- ~3× more files than a stock NestJS layout. New engineers need ~1 week to internalize.
- A small amount of mapper boilerplate between Prisma rows and domain entities (~30 lines per context).
- Cross-context features (e.g., "notification fires when message sent") require defining ports/events instead of direct calls.

### Neutral
- The cost of enforcement (lint + code review) is necessary — undisciplined adoption would re-create the original problems.

## Alternatives considered

- **Level 1 (stock NestJS feature folders)** — what the previous codebase essentially was. Rejected: re-creates the bloated-service problem within 6 months.
- **Level 3 (full Clean Architecture / Hexagonal)** — every repository has an interface + Prisma impl + mapper, with use-cases depending on interfaces. Rejected as MVP overkill: 3× the boilerplate, mapper sprawl.
- **Microservices** — bounded contexts as separate deployed services. Rejected: distributed system complexity for an MVP team is fatal.

## References

- Charter §5 (bounded contexts), §6 (architecture rules)
- Related: ADR-0002 (stack), ADR-0003 (monorepo)
