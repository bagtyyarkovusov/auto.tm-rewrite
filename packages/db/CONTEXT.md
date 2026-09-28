# Database

The schema, migration history, generated-client boundary, and seed inputs live here. Inspect `schema.prisma` for fields and relations instead of copying them into documentation. Runtime consumers load the compiled package.

Cross-context foreign keys are allowed; application use-cases still use ports for cross-context access. Database integrity does not waive the application boundary. Keep schema changes with their committed migration, use forward corrective migrations, and reserve `db push` for localhost. The API pre-deploy step is the sole deployed migration authority under ADR-0039.

Deletion intentionally preserves some history while erasing or nulling personal data. Check identity deletion, worker purge, and migration tests before changing cascades, nullable audit actors, or retained messages. Seeds and reviewer scenarios have separate purposes; do not run operational scripts against a live database as a cleanup check. Keep credential values out of seed/audit evidence.

## Start here

- [Schema](prisma/schema.prisma)
- [Migration history](prisma/migrations)
- [Runtime entry](src/index.ts)
- [Seeds](src/seed.ts)
- [Tests](tests)
- [Runtime boundary guide](../../docs/agents/typescript-runtime.md)
- [Migration deployment](../../docs/adr/0039-phased-cloud-first-hosting.md)

The seed `_legacy/cars.brands.json` is retained as the source snapshot for the S3 brand/model import recorded in the locked [catalog sprint](../../docs/prd/sprints/sprint-03-catalog.md). It is provenance, not a runtime seed input; read it only when investigating that import.
