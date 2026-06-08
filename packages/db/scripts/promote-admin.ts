#!/usr/bin/env tsx
import { PrismaClient } from "../generated/prisma/client/client";
import { runPromoteAdmin } from "../src/promote-admin";

function parseArgs(argv: string[]) {
  let phone: string | undefined;
  let reason: string | undefined;
  let dryRun = false;

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--phone" && i + 1 < argv.length) {
      phone = argv[++i];
    } else if (argv[i] === "--reason" && i + 1 < argv.length) {
      reason = argv[++i];
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    }
  }

  return { phone, reason, dryRun };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.phone || !args.reason) {
    console.error(
      "Usage: tsx scripts/promote-admin.ts --phone <phone> --reason <reason> [--dry-run]",
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const result = await runPromoteAdmin(
      {
        findUserByPhone: (phone) =>
          prisma.user.findUnique({ where: { phone } }).then((u) => u ?? null),
        updateUserRole: (userId, role) =>
          prisma.user.update({ where: { id: userId }, data: { role } }),
        createAuditLog: (data) =>
          prisma.auditLog.create({
            data: {
              actorId: data.actorId,
              action: data.action,
              targetType: data.targetType,
              targetId: data.targetId,
              details: data.details,
            },
          }),
      },
      { phone: args.phone, reason: args.reason, dryRun: args.dryRun },
    );

    console.log(result.message);
    process.exit(result.exitCode);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
