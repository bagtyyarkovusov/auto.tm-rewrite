# packages/contracts — CONTEXT

## Purpose

Shared API contracts. Owns:

- Zod schemas describing every API request + response body
- OpenAPI exporter that generates `openapi.json` from those Zod schemas
- TypeScript types derived from the Zod schemas (used by mobile, admin, web)
- A small typed client wrapper for convenient consumption

## What it contains

```
packages/contracts/
├── src/
│   ├── schemas/
│   │   ├── auth.ts             OTP request/verify/refresh/logout schemas
│   │   ├── identity.ts         User, Dealership, Garage schemas
│   │   ├── catalog.ts          Brand, Model, Region schemas
│   │   ├── listings.ts         Listing CRUD + filter schemas
│   │   ├── subscriptions.ts    SavedSearch schemas
│   │   ├── conversations.ts    Conversation, Message schemas + WS event types
│   │   ├── notifications.ts    Notification schemas
│   │   ├── content.ts          BlogPost schemas
│   │   ├── reports.ts          Inspection report schemas (Phase 2)
│   │   └── admin.ts            Admin op schemas
│   ├── enums.ts                Shared enums (UserRole, ListingStatus, etc.)
│   ├── errors.ts               Error code enum + ErrorResponse schema
│   ├── pagination.ts           Cursor + Offset pagination schemas
│   ├── openapi.ts              OpenAPI generator
│   └── index.ts                Re-exports
├── package.json
└── CONTEXT.md
```

## Conventions

- Every API endpoint has a matching schema pair: `XRequest` and `XResponse`
- Enums declared once in `enums.ts`, referenced by Zod via `z.nativeEnum(MyEnum)`
- Error responses follow a single shape: `{ statusCode, code, message, details?, timestamp, requestId }`
- Pagination uses two shapes: `CursorPagination` (feeds) and `OffsetPagination` (admin tables)

## OpenAPI generation

```bash
pnpm --filter contracts run openapi:generate
# → outputs openapi.json + openapi.yaml
```

CI runs this on every PR to detect contract drift. The output is checked in (or generated reproducibly and diffed).

## Versioning

API base path is `/api/v1`. When a breaking change is needed:
1. New schemas added under a `v2/` sub-folder
2. New routes mounted at `/api/v2/...`
3. Old `v1/` deprecated for ≥6 months before removal

## Public API surface

```ts
export * as schemas from './schemas'
export * as types from './types'
export { Errors } from './errors'
export { CursorPagination, OffsetPagination } from './pagination'
export { generateOpenApiDocument } from './openapi'
```

## Dependencies

- `zod` (^3.23)
- `zod-to-openapi` for spec generation
- Consumed by `apps/api`, `apps/admin`, `apps/web`, `apps/mobile`

## Notable decisions

- Centralizing contracts here prevents drift between server (NestJS DTOs) and clients (mobile/admin/web)
- Zod chosen over class-validator for the contract layer; NestJS still uses class-validator for HTTP DTOs internally, derived from Zod schemas at module boundary
