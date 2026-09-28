# Database

The schema, migration history, generated-client boundary, and seed inputs live here. Inspect `schema.prisma` for fields and relations instead of copying them into documentation. Runtime consumers load the compiled package.

`Listing.publicNumber` is a unique, database-assigned integer for the public detail footer. Its migration numbers existing Listings; subsequent inserts take the next sequence value. UUIDs remain the internal identity and route key.

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
