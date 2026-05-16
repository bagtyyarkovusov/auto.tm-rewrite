# Sprint 3 — Catalog (trilingual API + seed + dev smoke)

| | |
|---|---|
| **Status** | ⚪ Pending |
| **Phase** | 1 |
| **Milestone** | — (incremental) |
| **Demo audience** | Internal |
| **Estimated time** | ~1 week |

> **Scope note** (added 2026-05-17 during pre-sprint audit). The original DoD covered mobile + web pickers, an app-wide locale store, and an admin-app management screen. That scope was 2-3 weeks of work against a 1-week budget with no external milestone. This sprint has been **trimmed to a backend slice + dev smoke route**: ship the API + contracts + seed so S4 (Listings CRUD) and S5 (Listings UX) can consume them; build the picker UX inside the sprint that first uses it. See "Deferred to" at the bottom.

## Goal

Ship the catalog **API surface, contracts, and seed data** so downstream sprints (S4, S5) can build create-listing and filter-sheet flows against real Turkmenistan brands/models in three locales. Admin can add a missing Brand or Model without a deploy (tested via in-test JWT; admin UI lands in S9).

## User capability (the demo line)

> "When S4's create-listing wizard or S5's filter sheet asks 'which brand?', the API returns real Turkmenistan-relevant brands in the user's locale. Until then, a dev-only `/dev/catalog` route on mobile proves the wrapper hits the API end-to-end."

## Bounded contexts touched

- **Primary**: `catalog/` — read-side repositories + use-cases; admin write use-cases for Brand + Model
- **Supporting**: `packages/contracts` (trilingual DTOs); `apps/mobile` (one dev-only route consuming the wrapper)
- **Not touched this sprint**: `apps/admin` (admin UI ships in S9); `apps/web` filter components (S5); `apps/mobile` picker modals (S4 or S5)

## Acceptance criteria (DoD)

- [ ] Seed data ported from `auto.tm-main/backend/cars.brands.json` into trilingual JSON under `packages/db/prisma/seed/` (brand + model only; ~5 names transliterated, the rest are Latin proper nouns shared across locales)
- [ ] `pnpm db:seed` populates **Brand, Model, Color, BodyType, Region, City** idempotently. Generation seed is deferred — table stays empty, FK is nullable.
- [ ] `GET /api/v1/catalog/brands?locale=ru` (and `tk`/`en`) returns sorted, paginated brands; `Accept-Language` header is honored as fallback when `?locale=` is absent
- [ ] `GET /api/v1/catalog/brands/{id}/models` returns models for a brand
- [ ] `GET /api/v1/catalog/models/{id}/generations` returns generations (empty list until generation seed lands)
- [ ] `GET /api/v1/catalog/regions`, `regions/{id}/cities` return geo data
- [ ] `GET /api/v1/catalog/body-types`, `colors` return type-of-car attributes
- [ ] **Admin write API**: `POST/PATCH/DELETE` for **Brand and Model only**, behind `AdminGuard`. Writes audit-log entries. Trilingual fields required on input.
- [ ] `@auto-tm/contracts` exports full read DTOs for all 7 catalog entities + admin write DTOs for Brand and Model
- [ ] Dev-only `/dev/catalog` route on mobile (gated by `__DEV__`) fetches `GET /catalog/brands?locale=en` via `apiClient` and renders the result with existing RNR `Card` components — proves the wrapper, contracts, and API agree end-to-end
- [ ] `catalog/CONTEXT.md` reflects current invariants
- [ ] `docs/prd/03-roadmap.md` updated (S3 🟢, S4 🟡)

## Tests required (TDD mandatory)

- **Domain**: `Slug` value object only (trilingual-aware slugify, edge cases for transliteration, max length, uniqueness shape).
- **Application**: `ListBrands(locale)`, `ListModelsForBrand`, `ListRegions`, `ListCitiesForRegion`, `ListColors`, `ListBodyTypes` — happy path + locale-fallback (`tk` requested but row has only `nameRu` → falls back to `nameRu`). Admin: `CreateBrand`, `UpdateBrand`, `DeleteBrand`, `CreateModel`, `UpdateModel`, `DeleteModel` — happy path + uniqueness + admin-only authorization (via injected `IdentityCheckPort`).
- **Infrastructure** (Testcontainers): repositories return rows in alphabetical order by the requested locale's name; `Accept-Language` middleware extracts the right tag.
- **Presentation** (e2e): GET endpoints return 200 + correct shape; `POST /catalog/brands` without bearer → 401; with non-admin JWT → 403; with admin-flagged JWT minted in-test → 201 + audit-log row.

## Files this sprint creates / touches

```
apps/api/src/modules/catalog/
├── domain/
│   ├── Slug.ts                              Trilingual-aware slug VO
│   ├── Brand.ts, Model.ts, Generation.ts,
│   │   Color.ts, BodyType.ts, Region.ts, City.ts
│   └── ports/
│       ├── BrandRepository.ts
│       ├── ModelRepository.ts
│       └── ... (one per entity)
├── application/
│   ├── ListBrands.ts
│   ├── ListModelsForBrand.ts
│   ├── ListGenerationsForModel.ts
│   ├── ListRegions.ts, ListCitiesForRegion.ts
│   ├── ListColors.ts, ListBodyTypes.ts
│   ├── CreateBrand.ts, UpdateBrand.ts, DeleteBrand.ts   (admin)
│   └── CreateModel.ts, UpdateModel.ts, DeleteModel.ts   (admin)
├── infrastructure/
│   └── Prisma<Entity>Repository.ts (one per entity)
├── presentation/
│   ├── CatalogController.ts             Public read endpoints
│   └── AdminCatalogController.ts        Admin write endpoints (Brand + Model)
└── catalog.module.ts

apps/api/src/common/
└── accept-language.middleware.ts        Parses Accept-Language → request.locale fallback

packages/db/prisma/seed/
├── brands.json          (ported + transliterated where needed)
├── models.json
├── colors.json          (fresh fixed list)
├── body-types.json      (fresh fixed list)
├── regions.json         (already exists in catalog-stub.json — fold in)
└── cities.json          (already exists in catalog-stub.json — fold in)

packages/contracts/src/schemas/catalog.ts
└── Full read DTOs (7 entities) + admin write DTOs (Brand + Model)

apps/mobile/app/dev/catalog.tsx           Dev-only smoke screen (gated __DEV__)
```

## References

- **PRD feature**: [`../features/31-catalog.md`](../features/31-catalog.md)
- **Charter sections**: §5 (Catalog context), §10 (i18n + trilingual columns)
- **ADRs**: 0007 (i18n), 0013 (User role split — admin gate), 0017 (Context7 — for any library doc lookup), 0018 (API port 3006 — affects dev env)

## Previous-sprint dependencies

- **S2 — `JwtAuthGuard`** ✅ shipped (`apps/api/src/common/jwt-auth.guard.ts`). Validates bearer tokens; sets `request.user` payload.
- **Pre-S3 — `IdentityCheckPort.isAdmin(userId)` + `AdminGuard`** ✅ shipped in PR #59 (`apps/api/src/common/admin.guard.ts`, `apps/api/src/modules/identity/domain/ports/IdentityCheckPort.ts`). Admin write API can now gate behind `AdminGuard`.
- **Pre-S3 — mobile data-fetching infrastructure** ✅ shipped in PR #60 (`apps/mobile/src/api/client.ts`, `queryKeys.ts` with `catalog.*` keys ready). The dev smoke route uses this directly.

## Open questions / risks

- **Seed-data quality**: legacy `cars.brands.json` is monolingual ("name": "Toyota"). Most brand/model names are Latin proper nouns that don't translate. A handful (Lada, Waz, Zil, KamAZ, Zaz) need transliteration to Cyrillic for `nameRu`. Flag any row where `nameTk` is just a copy of `nameRu` for a future native-speaker pass.
- **Generation data missing**: legacy file has no `generations` array — only models. The Prisma `Generation` table exists, but the seed will leave it empty in S3. `Listing.generationId` must remain nullable until a generation-seed sprint runs (TBD — likely a half-day issue before S5).
- **Locale fallback policy**: if a row has `nameRu` but `nameTk = null`, what do we show on a TK request? Decision: return `nameRu` and tag the response with a `localeFallback: "ru"` field so admin UI (S9) can flag it for translation.
- **In-test admin JWT**: the e2e test mints an admin JWT against the `User` table's `role = 'admin'` column. There is no admin-login UI in S3; that ships in S9 (Admin dashboard). Document the test-only minting helper in `apps/api/test/helpers/`.

## Deferred to later sprints

These were in the original DoD but moved out during the pre-S3 audit (2026-05-17):

- **Mobile picker components** (`brand-picker.tsx`, `model-picker.tsx` modals) → **S4 or S5**, whichever first consumes them (create-listing wizard vs filter sheet). Building them before their consumer exists risks UX misfit.
- **App-wide locale store + query-key invalidation on locale change** → **S5** (filter sheet is the first surface where mid-session locale switches matter).
- **"Locale flips all visible labels without re-mounting"** acceptance criterion → **S5**.
- **Admin app catalog management screen** (`apps/admin/src/app/(admin)/catalog/...`) → **S9** (Admin dashboard sprint owns admin auth + admin pages together).
- **Web filter component** (`apps/web/src/components/filter/BrandModelSelect.tsx`) → **S5**.
- **Generation seed data** → TBD, half-day standalone issue before S5 (depends on a data source).
