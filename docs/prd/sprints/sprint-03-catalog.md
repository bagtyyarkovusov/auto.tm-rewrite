# Sprint 3 — Catalog (full schema + trilingual API + seed + dev smoke)

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | — (incremental) |
| **Demo audience** | Internal |
| **Estimated time** | ~2-3 weeks |

> **Scope note** (revised 2026-05-17). The pre-S3 grill resolved that **`apps/api/src/modules/catalog/CONTEXT.md` is the binding spec** for this context. Code, schema, and seed catch up to what CONTEXT.md describes — never the reverse. This sprint delivers all 10 catalog entities + all fields CONTEXT.md describes + full read API + admin write API for the editable entities. Picker UI still ships in S4/S5 (UI deferral preserved); admin app and real-logo upload UX still ship in S9.

## Goal

Bring the catalog context up to its target state per [`apps/api/src/modules/catalog/CONTEXT.md`](../../../apps/api/src/modules/catalog/CONTEXT.md): 10 entities (Brand, Model, Generation, Color, BodyType, EngineType, Transmission, DriveType, Region, City), trilingual columns, every field CONTEXT.md describes (brand logos, body-type icons, country codes, etc.), seeded reference data, full read API, and admin write API for the entities that actually get added/edited in production.

## User capability (the demo line)

> "When S4's create-listing wizard or S5's filter sheet queries the catalog, the API returns every entity CONTEXT.md describes in three locales — brands with logo placeholders, body-types with icon keys, engine/transmission/drive types as their own catalog rows. A dev-only `/dev/catalog` route on mobile proves the wrapper hits the API end-to-end."

## Bounded contexts touched

- **Primary**: `catalog/` — all 10 entities (read + admin write where editable)
- **Supporting**: `packages/contracts` (trilingual DTOs for all 10); `packages/db` (Prisma migration + seed runner); `apps/mobile` (one dev-only route)
- **Not touched this sprint**: `apps/admin` (admin UI → S9); `apps/web` filter components (→ S5); `apps/mobile` picker modals (→ S4 or S5)

## Acceptance criteria (DoD)

### Schema migration (reversible Prisma migration)

- [ ] **3 new tables**: `EngineType`, `Transmission`, `DriveType` — each: `id`, `slug` (unique), `nameRu`, `nameTk`, `nameEn`, `createdAt`, `updatedAt`
- [ ] **Column additions to existing tables**:
  - `Brand`: + `logoUrl: String?`, `isActive: Boolean @default(true)`, `displayOrder: Int @default(0)`
  - `Model`: + `bodyTypeId: String?` (FK → BodyType), `isActive: Boolean @default(true)`
  - `Generation`: + `photoUrl: String?`
  - `BodyType`: + `slug: String @unique`, `iconKey: String`
  - `Region`: + `countryCode: String @default("TM")`
- [ ] **Column rename**: `Color.hex` → `Color.hexCode` (kept nullable) — Prisma `@@map` or proper rename migration
- [ ] Migration is reversible (proper Prisma migration file, not `db push`)
- [ ] Existing rows survive migration (test in local Postgres before merging)

### Seed data

- [ ] `pnpm db:seed` populates all **10** catalog tables idempotently. Seed order respects FKs (BodyType before Model.bodyTypeId; Region before City; Brand before Model; Model before Generation).
- [ ] Per-entity seed content:
  - **Brand** — ~130 entries ported from `packages/db/prisma/seed/_legacy/cars.brands.json`. Most names stay Latin proper nouns; transliterate Lada/Waz/Zil/KamAZ/Zaz for `nameRu`. `logoUrl` = null (admin uploads in S9). `isActive` = true. `displayOrder` = ascending index (Toyota, Lexus, BMW first since they're most common in TM).
  - **Model** — ~5000 entries scoped to brands. `bodyTypeId` left null in seed (admin populates when known). `isActive` = true.
  - **Generation** — **empty** in S3 (table exists, no rows). Admin adds incrementally. `Listing.generationId` stays nullable.
  - **Color** — ~15-20 TM-common car colors (white, black, silver, grey, red, blue, dark blue, green, beige, brown, yellow, orange, gold, burgundy, etc.) with `hexCode` values.
  - **BodyType** — ~10 entries (sedan, hatchback, suv, crossover, pickup, coupe, wagon, van, minivan, cabriolet, off-road). `slug` URL-safe; `iconKey` = lucide-react-native icon name (e.g., `"car"`, `"truck"`, `"caravan"`).
  - **EngineType** — 5 entries: gasoline, diesel, lpg (Turkmenistan-specific — many cars run on LPG), hybrid, electric.
  - **Transmission** — 4 entries: manual, automatic, cvt, semi-automatic.
  - **DriveType** — 4 entries: fwd, rwd, awd, 4wd.
  - **Region** — 6 TM administrative regions with `countryCode = "TM"`.
  - **City** — TM cities scoped to regions (existing data in `catalog-stub.json` — fold into the new `cities.json`).

### Read API (all 10 entities + locale fallback)

- [ ] `GET /api/v1/catalog/brands?locale=ru` (and `tk`/`en`) returns sorted, paginated brands with `id`, `slug`, `name` (locale-resolved), `logoUrl`, `isActive`, `displayOrder`. `Accept-Language` header honored as fallback when `?locale=` is absent.
- [ ] `GET /api/v1/catalog/brands/{id}/models` returns models for a brand
- [ ] `GET /api/v1/catalog/models/{id}/generations` returns generations (may be empty)
- [ ] `GET /api/v1/catalog/regions` + `regions/{id}/cities` — region response includes `countryCode`
- [ ] `GET /api/v1/catalog/body-types` returns `slug` + `iconKey`
- [ ] `GET /api/v1/catalog/colors` returns `hexCode`
- [ ] `GET /api/v1/catalog/engine-types`, `/transmissions`, `/drive-types` return the seeded enums
- [ ] Locale fallback policy: if requested locale's column is empty string (treat as missing), return another locale's value AND include `localeFallback: "ru"` (or similar) in response so admin UI in S9 can flag for translation

### Admin write API (the editable entities)

- [ ] `POST/PATCH/DELETE` for **Brand, Model, Color, BodyType** behind `AdminGuard`. Trilingual fields required on input.
- [ ] Writes `AuditLog` entries (entity, action, userId, before/after snapshot).
- [ ] **Admin write deferred to S9** for EngineType, Transmission, DriveType (stable closed sets), Region, City (fixed TM admin divisions). The admin app screen in S9 owns those edits.

### Contracts

- [ ] `@auto-tm/contracts` exports full read DTOs for all 10 catalog entities (one summary + one detail shape per entity).
- [ ] Admin write DTOs for Brand + Model + Color + BodyType (CreateX, UpdateX, DeleteX request schemas + matching response schemas).
- [ ] OpenAPI export regenerated.

### Dev smoke

- [ ] Dev-only `/dev/catalog` route on mobile gated by `__DEV__` (`apps/mobile/app/dev/catalog.tsx`). Fetches `GET /catalog/brands?locale=en` via `apiClient` and renders the result with existing RNR `Card` components — proves the wrapper, contracts, and API agree end-to-end.

### Wiring + roadmap

- [ ] `CatalogReadPort` interface in `catalog/CONTEXT.md` is implemented faithfully (no edits to CONTEXT.md — code matches spec).
- [ ] `docs/prd/03-roadmap.md` updated (S3 🟢, S4 🟡).

## Tests required (TDD mandatory)

- **Domain**: `Slug` value object (trilingual-aware slugify, edge cases, max length, uniqueness); `HexCode` VO for Color (validates `#rrggbb` format).
- **Application** (~26 use-case classes — happy path + edge cases):
  - 10 List* use-cases (one per entity) with locale fallback
  - 16 admin write use-cases (Create/Update/Delete × Brand/Model/Color/BodyType + a few extras for soft-delete or activate/deactivate)
- **Infrastructure** (Testcontainers): repository round-trips return alphabetical-by-locale ordering; `Accept-Language` middleware extracts the right tag.
- **Presentation** (e2e): GET endpoints return 200 + correct shape; POST without bearer → 401; non-admin JWT → 403; admin JWT minted in-test → 201 + audit-log row written.

## Files this sprint creates / touches

```
packages/db/prisma/
├── schema.prisma                              Add 3 tables; add columns; rename hex→hexCode
└── migrations/<timestamp>_catalog_full/
    └── migration.sql                          Reversible

packages/db/prisma/seed/
├── _legacy/cars.brands.json                   (existing — port source)
├── brands.json                                (port + transliterate)
├── models.json
├── colors.json
├── body-types.json
├── engine-types.json
├── transmissions.json
├── drive-types.json
├── regions.json                               (with countryCode='TM')
└── cities.json                                (fold in existing catalog-stub.json)

packages/db/src/seed.ts                        Extend to 10-entity upsert loop (FK-ordered)

packages/contracts/src/schemas/catalog.ts
└── Read DTOs (10 entities) + admin write DTOs (Brand, Model, Color, BodyType)
└── Locale-aware response shapes with `localeFallback?: string`

apps/api/src/modules/catalog/
├── domain/
│   ├── Slug.ts, HexCode.ts                    Trilingual-aware VOs
│   ├── Brand.ts, Model.ts, Generation.ts, Color.ts,
│   │   BodyType.ts, EngineType.ts, Transmission.ts,
│   │   DriveType.ts, Region.ts, City.ts       Domain entities (10)
│   └── ports/                                 BrandRepository, ..., one per entity (10)
├── application/
│   ├── ListBrands.ts, ListModelsForBrand.ts,
│   │   ListGenerationsForModel.ts, ListRegions.ts,
│   │   ListCitiesForRegion.ts, ListColors.ts,
│   │   ListBodyTypes.ts, ListEngineTypes.ts,
│   │   ListTransmissions.ts, ListDriveTypes.ts   List use-cases (10)
│   ├── CreateBrand.ts, UpdateBrand.ts, DeleteBrand.ts
│   ├── CreateModel.ts, UpdateModel.ts, DeleteModel.ts
│   ├── CreateColor.ts, UpdateColor.ts, DeleteColor.ts
│   └── CreateBodyType.ts, UpdateBodyType.ts, DeleteBodyType.ts   Admin (12)
├── infrastructure/
│   └── Prisma<Entity>Repository.ts            One per entity (10)
├── presentation/
│   ├── CatalogController.ts                   Public read endpoints (10 routes)
│   └── AdminCatalogController.ts              Admin write (Brand + Model + Color + BodyType)
└── catalog.module.ts

apps/api/src/common/
└── accept-language.middleware.ts              Parses Accept-Language → request.locale

apps/api/test/helpers/
└── mintAdminJwt.ts                            Test-only admin JWT helper

apps/mobile/app/dev/catalog.tsx                Dev-only smoke screen (__DEV__ gated)
```

## References

- **CONTEXT spec** (binding): [`apps/api/src/modules/catalog/CONTEXT.md`](../../../apps/api/src/modules/catalog/CONTEXT.md) — entity shapes, field set, invariants, port interface. **This is the source of truth this sprint catches up to.**
- **PRD feature**: [`../features/31-catalog.md`](../features/31-catalog.md)
- **Charter sections**: §5 (Catalog context), §10 (i18n + trilingual columns)
- **ADRs**: 0007 (i18n), 0013 (User role split — admin gate), 0017 (Context7 — for any library doc lookup), 0018 (API port 3006)

## Previous-sprint dependencies

- **S2 — `JwtAuthGuard`** ✅ shipped (`apps/api/src/common/jwt-auth.guard.ts`).
- **Pre-S3 — `IdentityCheckPort.isAdmin(userId)` + `AdminGuard`** ✅ shipped in PR #59.
- **Pre-S3 — mobile data-fetching infrastructure** ✅ shipped in PR #60.

## Open questions / risks

- **Schema migration size**: 3 new tables + 6 column additions + 1 column rename in one migration. Test against local Postgres + seeded data before merging.
- **Brand-logo upload UX deferred to S9**: S3 ships `Brand.logoUrl` as nullable. Seed populates null. Admin app in S9 wires real MinIO upload. Mobile picker UI in S4/S5 renders a generic placeholder if `logoUrl == null`.
- **iconKey values bind to lucide-react-native icon names** so mobile renders directly without a mapping table. `sedan: "car"`, `suv: "truck"`, `motorcycle: "bike"`, `pickup: "truck"` (or a custom truck variant), etc.
- **Color.hex → hexCode rename**: Prisma rename creates a migration that drops + adds the column. Use `@@map` if there's a way to rename without data loss, or move data inside the migration SQL manually.
- **Generation.yearStart nullability**: CONTEXT.md description writes `yearStart, yearEnd?` (yearStart no `?`) — interpreted as required. But for very old generations whose start year is unknown, this is restrictive. Resolution: keep `yearStart: Int?` (nullable) in the migration; the invariant becomes "if both yearStart and yearEnd are set, yearEnd >= yearStart." This is a charitable reading of CONTEXT.md, not a contradiction — informal description ≠ binding type-level rule.
- **EngineType/Transmission/DriveType seed values** target TM market specifically. LPG matters (Turkmenistan has many LPG cars); semi-automatic matters less but covered for completeness; "4wd" vs "awd" both included since TM 4x4 culture distinguishes them.
- **localeFallback response field** adds a small wrinkle to every read endpoint. Implementer chooses: include only when fallback occurred, OR always include with `null` when locale matched. Recommend: include only when fallback occurred to keep responses lean.
- **Admin write for EngineType/Transmission/DriveType/Region/City deferred**: these are stable closed sets / fixed administrative divisions. Adding a new EngineType during Phase 1 is unlikely. If admin needs to fix a typo, it lands in S9 admin UI.

## Deferred to later sprints

- **Mobile picker components** (`brand-picker.tsx`, `model-picker.tsx` modals) → **S4 or S5**, whichever first consumes them.
- **App-wide locale store + query-key invalidation on locale change** → **S5**.
- **"Locale flips all visible labels without re-mounting"** acceptance criterion → **S5**.
- **Admin app catalog management screen** + **brand-logo upload UX (MinIO)** → **S9** (Admin dashboard sprint).
- **Web filter component** → **S5**.
- **Generation seed data** → S9 or whenever stakeholder provides a source.
- **Admin write API for EngineType / Transmission / DriveType / Region / City** → **S9**.
- **Real brand logos uploaded and assigned via admin UX** → **S9**.
