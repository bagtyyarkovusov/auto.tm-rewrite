# Catalog

Catalog owns shared reference data used by listings and other domains. Public reads use localized data; admin writes are narrower than the complete product specification. Inspect controllers for supported operations rather than assuming every schema entity has CRUD endpoints.

Preserve stable IDs used by persisted listings and seed idempotence. Names are trilingual; locale fallback and Accept-Language handling must remain consistent with contracts. Model/Brand and City/Region ownership matter when validating references. Generation data is not supplied by the current seed, so nullable generation selection must remain supported.

Seed inputs and migrations are operational data. An old data snapshot is not permission to overwrite current catalog records. Cross-context callers use catalog ports rather than importing repositories.

## Brand logos

A Brand may have a logo. `Brand.logoKey` is an object key in the public-read `catalog-assets` MinIO bucket, laid out as `brands/<slug>/v<epoch-ms>/logo.<png|webp>`. Keys are versioned and immutable, so a replaced logo gets a new URL. `GET /api/v1/catalog/brands` returns `logoUrl` (built from `MINIO_PUBLIC_URL`) only for brands with a key; clients show a letter fallback otherwise.

Admins (AdminGuard) upload through the ADR-0008 presigned path. `POST /api/v1/admin/catalog/brands/:id/logo/presign` (`{ contentType, sizeBytes }`) returns a PUT URL for `pending/brands/<slug>/<uuid>` and the headers to send, including `Content-Disposition: attachment` so a pending file is never shown inline. `PUT /api/v1/admin/catalog/brands/:id/logo` (`{ key }`) then reads that object back, validates it, stores the logo, and deletes the pending object whether or not it was accepted. `DELETE` on the same path clears the logo.

Accepted files are SVG, PNG, or WebP, at most 200 KB, whose decoded format matches the declared type and whose sides are within 1:1.25. **SVG is never served:** it is rendered to a 256 px PNG. Before rendering, an SVG is rejected if it has a DOCTYPE, any namespace-prefixed element, scripts, event handlers, animation elements, `foreignObject`, embedded images, CSS escapes or `@import`, or any non-`#` reference. That check runs on the raw text, before XML character references are decoded, so it is defense in depth. What keeps the renderer from reading files is that librsvg gets the SVG as a buffer with no base URL and refuses `file:` and relative references; a `data:` URL can still render, and it is self-contained. `SharpLogoImageProcessor.spec.ts` pins that behaviour. Rejections are 400 `VALIDATION_FAILED` with `details.reason`, one of the `BrandLogoRejectionReason` values in `@auto-tm/contracts`.

Replacing, removing, or deleting a Brand deletes the previous logo object after the database points elsewhere; a failed delete is logged with its key and does not undo the change. Two known leftovers are logged or left for manual cleanup: a pending upload that is never confirmed, and the losing object when two admins replace the same logo at once. Set and remove write `CATALOG_BRAND_LOGO_SET` / `CATALOG_BRAND_LOGO_REMOVE` audit entries. The rules live in [BrandLogo](domain/BrandLogo.ts); storage and image work sit behind the `BrandLogoStorage` and `LogoImageProcessor` ports.

## Search

`GET /api/v1/catalog/search?q=&locale=` runs one public search over brands and models together, capped at 20 results. It is served from a per-process in-memory snapshot (`CatalogSearchIndex`) loaded through the brand/model repository ports; the admin Brand/Model write use-cases invalidate the snapshot after a successful mutation. No Postgres extension or outbound service is involved.

Matching rules live in pure domain functions ([CatalogSearchMatcher](domain/CatalogSearchMatcher.ts), [YearQueryParser](domain/YearQueryParser.ts)):

- Normalization: lowercase, Unicode NFD with combining marks stripped (folds the Turkmen letters ä/ç/ň/ö/ş/ü/ý/ž and also й→и), ё→е, punctuation collapsed to spaces.
- Transliteration: Cyrillic↔Latin in both directions, so "toyota" matches "Тойота" and "камри" matches "Camry".
- Tiers: exact > prefix > one forgiven edit (only for words of 4+ letters). Multi-token queries match token by token; a model also matches on its combined "Brand Model" names. Ties put brands before models.
- Years: standalone four-digit tokens are year candidates. Candidates in [1950, current year + 1] become `yearFrom`/`yearTo` (a "2014-2019" style range with hyphen, en or em dash included); out-of-range candidates are ignored. Digits glued to letters ("B2000") are name text, never years. A bare year query returns only the range with empty results.
- An empty or one-character query returns an empty result list, not an error.

Response items are `{ kind: "brand" | "model", brandId, modelId?, label, brandLabel?, localeFallback? }` with the same locale fallback order as the list endpoints.

## Start here

- [Module composition](catalog.module.ts)
- [Read/write use-cases and tests](application)
- [Public reads and integration tests](presentation/catalog.controller.ts)
- [Catalog ports](domain/ports)
- [Seed implementation](../../../../../packages/db/src/seed.ts)
- [Target capability](../../../../../docs/prd/features/31-catalog.md)
- [Schema](../../../../../packages/db/prisma/schema.prisma)
