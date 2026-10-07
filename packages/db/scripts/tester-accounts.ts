#!/usr/bin/env tsx
import { assertTesterAccountsTarget } from "./tester-accounts-guard";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args[1];
  if (args.length !== 2 || args[0] !== "--mode" || (mode !== "seed" && mode !== "remove")) throw new Error("Invalid mode");
  // Fail closed before loading a driver or connecting. Never print environment or driver errors.
  const databaseUrl = assertTesterAccountsTarget(process.env, mode);
  const [{ Pool }, { PrismaPg }, { PrismaClient }, { PrismaTesterAccountStore }, { runTesterAccounts }] = await Promise.all([
    import("pg"), import("@prisma/adapter-pg"), import("../generated/prisma/client/client"),
    import("../src/PrismaTesterAccountStore"), import("../src/tester-accounts"),
  ]);
  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const result = await runTesterAccounts(new PrismaTesterAccountStore(prisma), {
      mode,
      testerAccountsJson: process.env["TESTER_ACCOUNTS_JSON"] ?? "[]",
      reviewerAccountsJson: process.env["REVIEW_DEMO_ACCOUNTS_JSON"] ?? "[]",
      now: new Date(),
    });
    console.log(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(() => {
  console.error("Tester accounts refused or failed. Check operator configuration; no credential values are logged.");
  process.exitCode = 1;
});
