# Database

The schema, migration history, generated-client boundary, and seed inputs live here. Inspect `schema.prisma` for fields and relations instead of copying them into documentation. Runtime consumers load the compiled package.

`Listing.publicNumber` is a unique, database-assigned integer for the public detail footer. Its migration numbers existing Listings; subsequent inserts take the next sequence value. UUIDs remain the internal identity and route key.

`listings.damaged` is the seller's "Damaged / needs repair" answer (ADR-0052). It is nullable only so its migration applies to existing rows; the API requires it, and the fixture and reviewer seeds set it on every Listing. The earlier accident, mileage-accurate, owner-count, and service-history columns were dropped without data migration, so environments are reseeded.

`Brand.logoKey` is a nullable object key in the `catalog-assets` bucket (see the catalog overview for the layout). Null means no logo.

Brand logos are filled by an operator script, not by a seed. `prisma/seed/brand-logos.manifest.json` lists every catalog brand once, with a tier (A to F, from the logo research) and either a source or a reason there is none. The manifest parser is the licensing gate: it accepts only Simple Icons icons (CC0-1.0, from the exact `simple-icons` version pinned in `package.json`) and Wikimedia Commons files whose file page carries `PD-textlogo` or `PD-shape`, and every entry records the file page or icon URL, licence, retrieval date, and the sha256 of the master. Do not add a source from anywhere else (logo datasets, CDNs, manufacturer press kits, the old backend's uploads). Sourced entries allow lowercase Unicode letters, digits and hyphens in catalog slugs; the API URL-encodes every key segment. No logo bytes are committed: Commons masters are downloaded by the importer's host (the operator's machine, or the PR API container in remote native seeding) into `node_modules/.cache/brand-logos`, checked against the sha256, and never fetched by the API or worker.

`pnpm --filter @auto-tm/db logos:import [-- --dry-run] [-- --force]` needs `DATABASE_URL` and the `MINIO_*` variables of the target environment. It renders each master to black-on-transparent PNG masks at 30, 60 and 90 px, uploads them to `catalog-assets`, sets `Brand.logoKey`, and prints coverage by tier. A second run changes nothing. It never overwrites a logo an admin uploaded unless `--force` is given: ownership is read from the stored key, so an `imp-<hash>` or `imp-<hash>-<uuid>` directory is an import even after a brand rename, and any other key is treated as an admin's. Every new activation writes a directory that has never been active (`imp-<hash12>-<randomUUID>`), so a delayed admin cleanup of an earlier directory cannot delete it ([ADR-0072](../../docs/adr/0072-imported-logo-cleanup-coordination.md)). `imp-<hash12>` is only the content/render identity: when the active key already has that identity the script repairs missing objects in that exact stored directory and never writes `Brand.logoKey`. Before each activation it re-reads the brand by id, rejects a renamed brand, and swaps the key only if both slug and key are unchanged. Previous imported versions and uploads from a failed compare-and-swap are retained; the script does not garbage-collect imports. Forced replacement deletes the previous admin directory in batches of at most 1,000 keys and reports deletion failures. Old deterministic importer processes must be stopped before API whole-prefix deletion is enabled. Running it against staging or production is an operator step. Curating the manifest, and the object layout, are described in the catalog overview.

Cross-context foreign keys are allowed; application use-cases still use ports for cross-context access. Database integrity does not waive the application boundary. Keep schema changes with their committed migration, use forward corrective migrations, and reserve `db push` for localhost. The API pre-deploy step is the sole deployed migration authority under ADR-0039.

Deletion intentionally preserves some history while erasing or nulling personal data. Check identity deletion, worker purge, and migration tests before changing cascades, nullable audit actors, or retained messages. Seeds and reviewer scenarios have separate purposes; do not run operational scripts against a live database as a cleanup check. Keep credential values out of seed/audit evidence.

`listings.priceTmt` is a stored TMT price derived from `priceAmount` and the `<currency> -> TMT` rate; feed price sort and price-range counts read it ([ADR-0061](../../docs/adr/0061-stored-tmt-listing-price-for-feed-sort-and-range.md)). The conversion expression is shared between `src/listing-prices.ts` (`recomputeListingPricesTmt`) and the `20260928000000_add_listing_price_tmt` backfill — keep them identical. After any `exchange_rates` change, run `pnpm --filter @auto-tm/db listing-prices:recompute` against that environment's database.

## Start here

- [Schema](prisma/schema.prisma)
- [Migration history](prisma/migrations)
- [Runtime entry](src/index.ts)
- [Seeds](src/seed.ts)
- [Tests](tests)
- [Runtime boundary guide](../../docs/agents/typescript-runtime.md)
- [Migration deployment](../../docs/adr/0039-phased-cloud-first-hosting.md)

The seed `_legacy/cars.brands.json` is retained as the source snapshot for the S3 brand/model import recorded in the locked [catalog sprint](../../docs/prd/sprints/sprint-03-catalog.md). It is provenance, not a runtime seed input; read it only when investigating that import.

The Railway native-session demo data (buckets, reference data, UI fixtures and licensed logos) is prepared by `scripts/native-pr-seed.mjs`. Its only mode is `--remote`, run over Railway SSH inside the PR API container on private service connections: `node /app/scripts/native-pr-seed.mjs --remote`. It accepts only AutoTM PR environment names and mock SMS and rejects production. The root `pnpm native:seed` script points at the same entry point but, with no arguments, refuses: local (non-remote) mode was removed because it could not be bound to the PR environment's database. The entry point and the `ui:fixture` script's `--railway-pr` step share one pure guard, `packages/db/scripts/native-pr-seed-guard.cjs`, tested from `scripts/native-pr-seed.test.mjs`. See [the agent procedure](../../docs/agents/mobile-expo.md#railway-pr-backend-sessions). The ordinary `ui:fixture` command remains localhost-only.
