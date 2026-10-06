#!/usr/bin/env tsx
/**
 * Demo inventory for reviewer production (#703): about 50 active car Listings with real
 * photographs, spread over demo sellers, and the command that removes exactly that again.
 *
 *   --mode seed     create or converge the demo sellers, Listings, media rows and photo objects
 *   --mode remove   delete them, and the favourites, Conversations and reports left on them
 *
 * It is operator work, not a boot side effect. The founder runs it inside the API container, on
 * the private Postgres and MinIO connections, with `DEMO_INVENTORY_AUTHORIZATION` set for the mode
 * (`guard.ts`). `docs/prd/ops/80-deployment-runbook.md` has the procedure. Run the reviewer
 * scenario seed first; this adds the inventory around it and touches none of its rows.
 *
 * Photos are downloaded from Wikimedia Commons at run time (`manifest.ts`), one at a time, into a
 * cache beside the workspace's dependencies. No photo bytes are committed.
 */
// Keep this import first. It loads `.env` and refuses an unsafe target before any other module
// (generated Prisma client, sharp, S3) is loaded.
// eslint-disable-next-line import/order
import { MODE, TARGET } from "./demo-inventory/target";

import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../generated/prisma/client/client";

import { createCommonsPhotoSource } from "./demo-inventory/photos";
import { removeDemoInventory } from "./demo-inventory/remove";
import { seedDemoInventory } from "./demo-inventory/seed";
import { createS3ObjectStore } from "./demo-inventory/storage";

const PHOTO_CACHE = path.join(__dirname, "../node_modules/.cache/demo-inventory-photos");

async function main(): Promise<number> {
  const pool = new Pool({ connectionString: TARGET.databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const storage = createS3ObjectStore({
    endpoint: TARGET.minioEndpoint,
    region: TARGET.minioRegion,
    accessKeyId: TARGET.minioAccessKey,
    secretAccessKey: TARGET.minioSecretKey,
  });

  try {
    const result =
      MODE === "seed"
        ? await seedDemoInventory({
            prisma,
            storage,
            photos: createCommonsPhotoSource(PHOTO_CACHE),
            now: new Date(),
            log: (line) => console.log(line),
          })
        : await removeDemoInventory({ prisma, storage });
    (result.exitCode === 0 ? console.log : console.error)(result.message);
    return result.exitCode;
  } finally {
    await prisma.$disconnect();
    await pool.end();
    storage.close();
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    // A driver error can quote a connection string; print its class of failure only.
    console.error(`Demo inventory ${MODE} failed: ${error instanceof Error ? error.name : "unknown error"}`);
    if (process.env["DEMO_INVENTORY_DEBUG"] === "1" && error instanceof Error) console.error(error.message);
    process.exit(1);
  });
