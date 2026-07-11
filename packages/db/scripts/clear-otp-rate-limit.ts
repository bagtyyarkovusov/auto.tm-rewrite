#!/usr/bin/env tsx
import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client/client";

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("Usage: tsx clear-otp-rate-limit.ts <phone>");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const countBefore = await prisma.otpRequest.count({ where: { phone } });
    console.log(`OTP requests for ${phone}: ${countBefore}`);

    const result = await prisma.otpRequest.deleteMany({ where: { phone } });
    console.log(`Deleted ${result.count} OTP request(s) for ${phone}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
