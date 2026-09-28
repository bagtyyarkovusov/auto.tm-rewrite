# Catalog

Catalog owns shared reference data used by listings and other domains. Public reads use localized data; admin writes are narrower than the complete product specification. Inspect controllers for supported operations rather than assuming every schema entity has CRUD endpoints.

Preserve stable IDs used by persisted listings and seed idempotence. Names are trilingual; locale fallback and Accept-Language handling must remain consistent with contracts. Model/Brand and City/Region ownership matter when validating references. Generation data is not supplied by the current seed, so nullable generation selection must remain supported.

Seed inputs and migrations are operational data. An old data snapshot is not permission to overwrite current catalog records. Cross-context callers use catalog ports rather than importing repositories.

## Start here

- [Module composition](catalog.module.ts)
- [Read/write use-cases and tests](application)
- [Public reads and integration tests](presentation/catalog.controller.ts)
- [Catalog ports](domain/ports)
- [Seed implementation](../../../../../packages/db/src/seed.ts)
- [Target capability](../../../../../docs/prd/features/31-catalog.md)
- [Schema](../../../../../packages/db/prisma/schema.prisma)
