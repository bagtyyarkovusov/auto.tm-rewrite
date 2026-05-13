import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client/client";
import catalogStub from "../prisma/seed/catalog-stub.json" with { type: "json" };

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const region of catalogStub) {
    await prisma.region.upsert({
      where: { slug: region.slug },
      update: { nameRu: region.nameRu, nameTk: region.nameTk, nameEn: region.nameEn },
      create: region,
    });
  }
  console.log(`Seeded ${catalogStub.length} regions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
