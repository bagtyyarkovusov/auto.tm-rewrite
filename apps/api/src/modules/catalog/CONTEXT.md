# catalog — CONTEXT

## Purpose

Curated reference data that listings, garage entries, and saved searches reference by ID. Read-mostly, admin-edited, trilingual.

## Owns (entities + tables)

- `Brand` — id, slug, name_ru, name_tk, name_en, logoUrl, isActive, displayOrder
- `Model` — id, brandId, slug, name_ru, name_tk, name_en, bodyTypeId, isActive
- `Generation` — id, modelId, name_ru, name_tk, name_en, yearStart, yearEnd?, photoUrl
- `Color` — id, hexCode, name_ru, name_tk, name_en
- `BodyType` — id, slug, name_ru, name_tk, name_en, iconKey
- `Region` — id, slug, name_ru, name_tk, countryCode (default 'TM')
- `City` — id, regionId, slug, name_ru, name_tk

**Not catalog (intentionally):** `EngineType`, `Transmission`, `DriveType` are modeled as Prisma enums on `Listing` (planned in S4) — same pattern as `ListingStatus` and `Currency`. They are stable closed sets queried as part of listing detail, and don't need DB-driven i18n. UI translation strings will live alongside the Listing surfaces in `apps/mobile` / `apps/web` (decided per-app in S4).

## Invariants

- All catalog rows have **trilingual columns** (`name_ru`, `name_tk`, `name_en`) — non-null
- `Brand.slug` and `Model.slug` are unique within their scope (slugs are URL-safe + stable)
- `Model.brandId` references an existing Brand
- `Generation.modelId` references an existing Model
- `Generation.yearEnd` (if set) must be >= `yearStart`
- `City.regionId` references an existing Region
- `isActive = false` rows are still queryable (e.g., for historical listings) but excluded from picker UIs

## Ports exposed

```ts
interface CatalogReadPort {
  getBrandSummary(id, locale): Promise<{ id, slug, name, logoUrl } | null>
  getModelSummary(id, locale): Promise<{ id, brandId, slug, name } | null>
  getGenerationSummary(id, locale): Promise<{ id, modelId, name, yearStart, yearEnd? } | null>
  getColorSummary(id, locale): Promise<{ id, hexCode, name } | null>
  getRegionSummary(id, locale): Promise<{ id, slug, name } | null>
}
```

These ports are how other contexts (`listings`, `garage`, `subscriptions`) display brand/model/region names. They never import Catalog domain types directly.

## Ports consumed

- (none — catalog is foundational)

## Events emitted

- `CatalogChanged` — fired on any admin edit (so caches in other contexts can invalidate)

## Events consumed

- (none)

## Seed data

`packages/db/prisma/seed/` contains:
- `_legacy/cars.brands.json` (monolingual source from old backend; not loaded directly — ported into the files below during S3)
- `brands.json` (~130 entries — ported and translated from `_legacy/cars.brands.json`)
- `models.json` (~5000 entries scoped to brands)
- `generations.json` (populated incrementally; admin adds as needed — empty in S3, table-only)
- `colors.json` (~20)
- `regions.json` + `cities.json` (TM administrative divisions)
- `body-types.json` (~5-10)

## Notable decisions

- [ADR-0007](../../../../docs/adr/0007-i18n.md) — Trilingual catalog columns
- [ADR-0001](../../../../docs/adr/0001-architecture.md) — Catalog is its own context (not embedded in listings)
