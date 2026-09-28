#!/usr/bin/env tsx
import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client/client";
import { recomputeListingPricesTmt } from "../src/listing-prices";

// Operator step after changing a row in `exchange_rates`: rates have no API write
// path yet, so this keeps Listing price sort and the Results price range current.
async function main() {
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const changed = await recomputeListingPricesTmt(prisma);
    const missing = await prisma.listing.count({ where: { priceTmt: null } });
    console.log(`Recomputed priceTmt: ${changed} Listing(s) changed.`);
    if (missing > 0) {
      console.warn(
        `${missing} Listing(s) have no priceTmt because their currency has no rate to TMT.`,
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
