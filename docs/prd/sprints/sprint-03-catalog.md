# Sprint 3 — Catalog (trilingual pickers + seed data)

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | — (incremental) |
| **Demo audience** | Internal |
| **Estimated time** | ~1 week |

## Goal

Make Brand / Model / Generation / City / Color / BodyType / Region pickers real on mobile + web, in all three locales. Admin can add a missing brand without a deploy.

## User capability (the demo line)

> "When I open the create-listing wizard or the search filter sheet, I see real Turkmenistan-relevant brands and models, translated into the locale I'm using."

## Bounded contexts touched

- **Primary**: `catalog/` — read-only repositories + admin CRUD use-cases
- **Supporting**: `apps/admin` (catalog management screen); `apps/mobile` + `apps/web` (consumes pickers via shared contracts)

## Acceptance criteria (DoD)

- [ ] Seed data ported from the old project's `cars.brands.json` into trilingual JSON under `packages/db/prisma/seed/`
- [ ] `pnpm db:seed` populates all 6 catalog tables (Brand, Model, Generation, Color, BodyType, Region+City) idempotently
- [ ] `GET /api/v1/catalog/brands?locale=ru` (and tk/en) returns sorted, paginated brands; `Accept-Language` header honored as fallback
- [ ] `GET /api/v1/catalog/brands/{id}/models` returns models for a brand
- [ ] `GET /api/v1/catalog/models/{id}/generations` returns generations
- [ ] `GET /api/v1/catalog/regions`, `regions/{id}/cities` return geo data
- [ ] `GET /api/v1/catalog/body-types`, `colors` return type-of-car attributes
- [ ] **Admin write API**: `POST/PATCH/DELETE` for Brand and Model behind admin guard; writes audit-log entries; trilingual fields required
- [ ] Mobile + web pickers consume `@auto-tm/contracts` types directly
- [ ] Switching locale flips all visible labels without re-mounting
- [ ] `catalog/CONTEXT.md` reflects current invariants
- [ ] `docs/prd/03-roadmap.md` updated (S3 🟢, S4 🟡)

## Tests required (TDD mandatory)

- **Domain**: no business logic to test (catalog is mostly CRUD). Skip domain tests except for `Slug` value object.
- **Application**: `ListBrands(locale)`, `GetModelsByBrand`, `CreateBrand` (admin) — happy path + locale fallback
- **Infrastructure** (Testcontainers): repositories return rows in alphabetical order by localized name
- **Presentation** (e2e): GET endpoints return 200 + correct shape; POST denied without admin role

## Files this sprint creates / touches

```
apps/api/src/modules/catalog/
├── domain/
│   ├── Slug.ts                Trilingual-aware slug VO
│   ├── Brand.ts, Model.ts, Generation.ts, Color.ts, BodyType.ts, Region.ts, City.ts
│   └── ports/
│       ├── BrandRepository.ts
│       ├── ModelRepository.ts
│       ├── ... (one per entity)
├── application/
│   ├── ListBrands.ts
│   ├── ListModelsForBrand.ts
│   ├── ListGenerationsForModel.ts
│   ├── ListRegions.ts
│   ├── ListCitiesForRegion.ts
│   ├── ListColors.ts, ListBodyTypes.ts
│   ├── CreateBrand.ts, UpdateBrand.ts, DeleteBrand.ts   (admin)
│   └── CreateModel.ts, UpdateModel.ts, DeleteModel.ts   (admin)
├── infrastructure/
│   └── Prisma<Entity>Repository.ts (one per entity)
├── presentation/
│   ├── CatalogController.ts             Public read endpoints
│   └── AdminCatalogController.ts        Admin write endpoints
└── catalog.module.ts

packages/db/prisma/seed/
├── brands.json
├── models.json
├── generations.json
├── colors.json
├── body-types.json
├── regions.json
└── cities.json

apps/admin/src/app/(admin)/catalog/{brands,models,regions}/page.tsx
apps/mobile/app/(modals)/brand-picker.tsx, model-picker.tsx
apps/web/src/components/filter/BrandModelSelect.tsx
```

## References

- **PRD feature**: [`../features/31-catalog.md`](../features/31-catalog.md)
- **Charter sections**: §5 (Catalog context), §10 (i18n + trilingual columns)
- **ADRs**: 0007 (i18n)

## Previous-sprint dependencies

- **S2 — `JwtAuthGuard`** ✅ shipped (`apps/api/src/common/jwt-auth.guard.ts`). Validates bearer tokens; sets `request.user` payload.
- **S2 — `IdentityCheckPort.isAdmin(userId)` + `AdminGuard`** ❌ **NOT shipped**. The port is documented in `apps/api/src/modules/identity/CONTEXT.md` ("Ports exposed → IdentityCheckPort"), but no implementation exists and no admin guard wraps any controller method. **S3's admin write API (Brand / Model `POST`/`PATCH`/`DELETE`) cannot ship behind an admin guard until this lands.** Resolution: a discrete pre-S3 issue ships `IdentityCheckPort.isAdmin` + `AdminGuard` before the catalog admin slices start. Until that issue closes, S3 catalog public read endpoints can ship, but the admin write API is blocked.

## Open questions / risks

- **Seed-data quality**: old project had inconsistent translations; needs a pass by a native speaker. Flag rows where `nameTk` is just transliteration of `nameRu`.
- **Generation year ranges**: some models lack reliable generation data. Allow `yearEnd = null` for "current generation".
- **Locale fallback policy**: if a row has `nameRu` but `nameTk = null`, what do we show on a TK request? Decision: fall back to `nameRu` and tag with `[ru]` suffix in admin UI so editors notice.
