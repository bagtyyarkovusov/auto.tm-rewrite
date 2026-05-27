# catalog — CONTEXT

> Current implemented state per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md). Aspirational content lives in [`docs/prd/features/31-catalog.md`](../../../../../docs/prd/features/31-catalog.md) (product spec) and the relevant sprint files under [`docs/prd/sprints/`](../../../../../docs/prd/sprints/).

## Purpose

Curated reference data that listings, garage entries, and saved searches reference by ID. Read-mostly, admin-edited, trilingual.

## Owns (entities + tables)

> These are what exists in `packages/db/prisma/schema.prisma` today. Anything not listed here is not yet shipped — see the per-entity "Planned additions" notes below or the sprint that owns the addition.

- `Brand` — id, slug (unique), nameRu, nameTk, nameEn, createdAt, updatedAt
- `Model` — id, brandId (FK → Brand), slug, nameRu, nameTk, nameEn, createdAt, updatedAt. Unique on `(brandId, slug)`.
- `Generation` — id, modelId (FK → Model), nameRu, nameTk, nameEn, yearStart?, yearEnd?, createdAt, updatedAt
- `Color` — id, nameRu, nameTk, nameEn, hex?, createdAt, updatedAt
- `BodyType` — id, nameRu, nameTk, nameEn, createdAt, updatedAt
- `EngineType` — id, nameRu, nameTk, nameEn, createdAt, updatedAt
- `Transmission` — id, nameRu, nameTk, nameEn, createdAt, updatedAt
- `DriveType` — id, nameRu, nameTk, nameEn, createdAt, updatedAt
- `Region` — id, slug (unique), nameRu, nameTk, nameEn, createdAt, updatedAt
- `City` — id, regionId (FK → Region), slug, nameRu, nameTk, nameEn, createdAt, updatedAt

## Invariants

- All catalog rows have **trilingual columns** (`nameRu`, `nameTk`, `nameEn`) — non-null at schema level for all entities
- `Brand.slug` and `Region.slug` are globally unique
- `Model.slug` is unique within its Brand (composite `@@unique([brandId, slug])`)
- `City.slug` is unique within its Region (composite `@@unique([regionId, slug])`)
- `Model.brandId` references an existing Brand (FK)
- `Generation.modelId` references an existing Model (FK)
- `City.regionId` references an existing Region (FK)
- If both `Generation.yearStart` and `Generation.yearEnd` are set, `yearEnd >= yearStart` (application-level check; both may be null)
- `Generation` table exists but has **no seed data** — the `Listing.generationId` FK remains nullable until generation data is sourced

## Ports exposed

All repositories live at `apps/api/src/modules/catalog/domain/ports/`:

- **`BrandRepository`** (`BRAND_REPOSITORY` symbol)
  - `listBrands({ locale, cursor?, limit? }) → { items: Brand[]; nextCursor? }` — cursor-paginated, sorted alphabetically by requested locale name
  - `getBrandById(id) → Brand | null`
  - `getBySlug(slug) → Brand | null`
  - `create({ slug, nameRu, nameTk, nameEn }) → Brand`
  - `update(id, { slug?, nameRu?, nameTk?, nameEn? }) → Brand`
  - `delete(id) → void`

- **`ModelRepository`** (`MODEL_REPOSITORY` symbol)
  - `listModelsByBrand({ brandId, locale, cursor?, limit? }) → { items: Model[]; nextCursor? }`
  - `getModelById(id) → Model | null`
  - `getBySlug(slug) → Model | null`
  - `getByBrandIdAndSlug(brandId, slug) → Model | null`
  - `create({ brandId, slug, nameRu, nameTk, nameEn }) → Model`
  - `update(id, { brandId?, slug?, nameRu?, nameTk?, nameEn? }) → Model`
  - `delete(id) → void`

- **`GenerationRepository`** (`GENERATION_REPOSITORY` symbol)
  - `listGenerationsByModel({ modelId, locale }) → Generation[]`
  - `getGenerationById(id) → Generation | null`

- **`ColorRepository`** (`COLOR_REPOSITORY` symbol)
  - `listColors({ locale }) → Color[]`
  - `getColorById(id) → Color | null`

- **`BodyTypeRepository`** (`BODY_TYPE_REPOSITORY` symbol)
  - `listBodyTypes({ locale }) → BodyType[]`
  - `getBodyTypeById(id) → BodyType | null`

- **`EngineTypeRepository`** (`ENGINE_TYPE_REPOSITORY` symbol)
  - `listEngineTypes({ locale }) → EngineType[]`
  - `getEngineTypeById(id) → EngineType | null`

- **`TransmissionRepository`** (`TRANSMISSION_REPOSITORY` symbol)
  - `listTransmissions({ locale }) → Transmission[]`
  - `getTransmissionById(id) → Transmission | null`

- **`DriveTypeRepository`** (`DRIVE_TYPE_REPOSITORY` symbol)
  - `listDriveTypes({ locale }) → DriveType[]`
  - `getDriveTypeById(id) → DriveType | null`

- **`RegionRepository`** (`REGION_REPOSITORY` symbol)
  - `listRegions({ locale }) → Region[]`
  - `getRegionById(id) → Region | null`

- **`CityRepository`** (`CITY_REPOSITORY` symbol)
  - `listCitiesByRegion({ regionId, locale, cursor?, limit? }) → { items: City[]; nextCursor? }`
  - `getCityById(id) → City | null`

All read methods return entities with a `localeFallback` field when the requested locale name is missing and a fallback was applied.

## Ports consumed

- `IdentityCheckPort` (from `identity/` domain) — admin write use-cases call `isAdmin(userId)` to verify the actor has admin role before mutating Brand or Model rows

## Events emitted

- (none today — `CatalogChanged` domain event is planned for a future admin-edit sprint)

## Events consumed

- (none)

## Shipped use-cases (`application/`)

### Public read use-cases

- `ListBrands` — cursor-paginated brand list sorted by requested locale name; supports `?locale=` query param and `Accept-Language` fallback
- `ListModelsForBrand` — cursor-paginated models for a given brand
- `ListGenerationsForModel` — generations for a given model (empty list today because no generation seed exists)
- `ListRegions` — full region list sorted by requested locale name
- `ListCitiesForRegion` — cursor-paginated cities for a given region
- `ListBodyTypes` — full body-type list
- `ListColors` — full color list
- `ListEngineTypes` — full engine-type list
- `ListTransmissions` — full transmission list
- `ListDriveTypes` — full drive-type list

### Admin write use-cases (Brand + Model only)

- `CreateBrand` — validates slug uniqueness, creates Brand row, writes audit log
- `UpdateBrand` — validates slug uniqueness on change, updates Brand row, writes audit log
- `DeleteBrand` — soft-delete not implemented; deletes Brand row (cascade to Model via FK), writes audit log
- `CreateModel` — validates `(brandId, slug)` uniqueness, creates Model row, writes audit log
- `UpdateModel` — validates `(brandId, slug)` uniqueness on change, updates Model row, writes audit log
- `DeleteModel` — deletes Model row, writes audit log

All admin use-cases require an admin actor verified via `IdentityCheckPort.isAdmin(actorUserId)`.

## HTTP routes

### Public read endpoints (`CatalogController` at `GET /api/v1/catalog`)

All read endpoints are `@Public()` (no authentication required). Locale resolution order: `?locale=` query param → `Accept-Language` header → default `ru`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/catalog/brands` | List brands (cursor pagination) |
| `GET` | `/api/v1/catalog/brands/:id/models` | List models for brand (cursor pagination) |
| `GET` | `/api/v1/catalog/models/:id/generations` | List generations for model |
| `GET` | `/api/v1/catalog/regions` | List all regions |
| `GET` | `/api/v1/catalog/regions/:id/cities` | List cities for region (cursor pagination) |
| `GET` | `/api/v1/catalog/body-types` | List all body types |
| `GET` | `/api/v1/catalog/colors` | List all colors |
| `GET` | `/api/v1/catalog/engine-types` | List all engine types |
| `GET` | `/api/v1/catalog/transmissions` | List all transmissions |
| `GET` | `/api/v1/catalog/drive-types` | List all drive types |
| `GET` | `/api/v1/catalog/ping` | Health check — returns `{ context: "catalog", status: "ok" }` |

### Admin write endpoints (`AdminCatalogController` at `POST/PATCH/DELETE /api/v1/admin/catalog`)

All admin endpoints are guarded by `AdminGuard` (returns 401 without bearer, 403 with non-admin JWT).

S7 hardens `AdminGuard` to also require current TOTP elevation for every admin-only API, so catalog admin writes inherit the same admin-auth policy as the S7 moderation endpoints.

S7 does not add catalog UI in `apps/admin`; `/catalog` stays post-MLP dashboard work. If private beta needs an urgent catalog correction before the dashboard exists, operators use the existing protected API/operator tooling. A small beta-polish correction UI must be explicitly shaped in S8 before it is built.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/admin/catalog/brands` | Create brand (trilingual fields required) |
| `PATCH` | `/api/v1/admin/catalog/brands/:id` | Update brand |
| `DELETE` | `/api/v1/admin/catalog/brands/:id` | Delete brand |
| `POST` | `/api/v1/admin/catalog/brands/:brandId/models` | Create model under brand |
| `PATCH` | `/api/v1/admin/catalog/models/:id` | Update model |
| `DELETE` | `/api/v1/admin/catalog/models/:id` | Delete model |

## Accept-Language middleware

`apps/api/src/common/accept-language.middleware.ts` parses the `Accept-Language` header and sets `request.locale` to one of `tk | ru | en` (defaulting to `ru`). Catalog read endpoints use this as a fallback when `?locale=` is absent.

## Seed data

`packages/db/prisma/seed/` contains:

- `brands.json` — trilingual brand seed data (ported from `_legacy/cars.brands.json`; 130 brands)
- `models.json` — trilingual model seed data (2,447 models, linked to brands by `brandSlug`)
- `colors.json` — fresh trilingual fixed list (15 colors with hex values)
- `body-types.json` — fresh trilingual fixed list (10 body types)
- `engine-types.json` — fresh trilingual fixed list (6 engine types)
- `transmissions.json` — fresh trilingual fixed list (4 transmissions)
- `drive-types.json` — fresh trilingual fixed list (4 drive types)
- `regions.json` — fresh trilingual fixed list (6 Turkmenistan regions)
- `cities.json` — fresh trilingual fixed list (35 cities linked to regions by `regionSlug`)
- `_legacy/cars.brands.json` — monolingual snapshot from the legacy auto.tm backend; kept as historical port source
- `catalog-stub.json` — legacy regions stub kept in-tree, no longer read by `packages/db/src/seed.ts`

`pnpm db:seed` runs `packages/db/src/seed.ts`, which upserts all of the above idempotently (uses `upsert` for slug-unique entities, `findFirst` + update-or-create for entities without unique keys). No Generation seed has shipped yet; the `Generation` table exists but stays empty in S3.

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are NOT in CONTEXT.md as if they exist today — they're tracked here only as a pointer so future agents and reviewers can find the sprint that owns each future addition. The authoritative spec for each lives in the named sprint file or PRD feature.

- **S5 (Search + listing detail)** — may add only the catalog fields required for MLP picker/search UX. Rich visual picker fields (`Brand.logoUrl`, `Brand.displayOrder`, `Generation.photoUrl`, `BodyType.iconKey`) are post-MLP unless needed.
- **S7/S8 or post-MLP admin** — S7 only hardens auth for existing catalog admin APIs. Beta-critical corrections use protected API/operator tooling unless S8 explicitly shapes a small correction UI. Full catalog management UI and brand-logo upload are post-MLP dashboard work.

## Notable decisions

- [ADR-0007](../../../../../docs/adr/0007-i18n.md) — Trilingual catalog columns
- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Catalog is its own context (not embedded in listings)
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state, not aspirational spec
- [ADR-0027](../../../../../docs/adr/0027-mlp-beta-scope.md) — Catalog admin breadth deferred out of MLP beta
