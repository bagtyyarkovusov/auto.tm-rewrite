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
- `Region` — id, slug (unique), nameRu, nameTk, nameEn, createdAt, updatedAt
- `City` — id, regionId (FK → Region), slug, nameRu, nameTk, nameEn, createdAt, updatedAt

## Invariants

- All catalog rows have **trilingual columns** (`nameRu`, `nameTk`, `nameEn`) — non-null
- `Brand.slug` and `Region.slug` are globally unique
- `Model.slug` is unique within its Brand (composite `@@unique([brandId, slug])`)
- `Model.brandId` references an existing Brand (FK)
- `Generation.modelId` references an existing Model (FK)
- `City.regionId` references an existing Region (FK)
- If both `Generation.yearStart` and `Generation.yearEnd` are set, `yearEnd >= yearStart` (application-level check; both may be null)

## Ports exposed

> The catalog module's `domain/ports/` directory does not yet have port files committed. The shape below is what S3 (Sprint 3 — Catalog, currently ⚪ Pending) will ship per `docs/prd/sprints/sprint-03-catalog.md`. After S3 closes, this section gets updated to reflect the actual interface shipped.

(none today — S3 adds `BrandRepository`, `ModelRepository`, `GenerationRepository`, `ColorRepository`, `BodyTypeRepository`, `RegionRepository`, `CityRepository`, plus a read-side `CatalogReadPort` summarizing entity reads for cross-context use.)

## Ports consumed

- (none — catalog is foundational)

## Events emitted

- (none today — `CatalogChanged` is planned for the admin write API in S3 and any subsequent admin-edit sprint)

## Events consumed

- (none)

## Seed data

`packages/db/prisma/seed/` contains today:
- `_legacy/cars.brands.json` — monolingual snapshot from the legacy auto.tm backend (~130 brands + ~5000 models); port source for S3
- `catalog-stub.json` — regions stub (loaded by `packages/db/src/seed.ts`)

After S3 ships (per `docs/prd/sprints/sprint-03-catalog.md`), this section is updated to add `brands.json`, `models.json`, `colors.json`, `body-types.json`, and a folded-in `cities.json`.

## Planned additions (future sprints)

Per [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md), the items below are NOT in CONTEXT.md as if they exist today — they're tracked here only as a pointer so future agents and reviewers can find the sprint that owns each future addition. The authoritative spec for each lives in the named sprint file or PRD feature.

- **S3 (catalog API + seed + admin write)** — `sprint-03-catalog.md`
- **S5 (Listings UX)** — may add `Brand.logoUrl`, `Brand.isActive`, `Brand.displayOrder`, `Generation.photoUrl`, `BodyType.slug`, `BodyType.iconKey` to support picker UX with logos and icons. Decide in S5 if these land then or earlier.
- **S9 (Admin dashboard)** — admin app for catalog management (CRUD UI for Brand/Model/Color/BodyType/etc.); brand-logo upload UX to MinIO.

EngineType / Transmission / DriveType are NOT catalog entities — they are modeled as Prisma enums on `Listing` (planned in S4, same pattern as `ListingStatus` and `Currency`). UI translation strings for these enums live in `apps/mobile` / `apps/web` per-app translations.

## Notable decisions

- [ADR-0007](../../../../../docs/adr/0007-i18n.md) — Trilingual catalog columns
- [ADR-0001](../../../../../docs/adr/0001-architecture.md) — Catalog is its own context (not embedded in listings)
- [ADR-0019](../../../../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state, not aspirational spec
