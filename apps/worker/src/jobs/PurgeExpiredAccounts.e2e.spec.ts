import { createHash, randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "@auto-tm/db";

import { PurgeExpiredAccounts } from "./PurgeExpiredAccounts";

/**
 * Runs only against the CI disposable Postgres, which the workflow migrates
 * before `pnpm test`. The purge's every-run delete drops ALL code requests
 * older than 30 days in whatever database DATABASE_URL names, and vitest sets
 * NODE_ENV=test on its own, so an environment variable the runner controls
 * (CI=true, which GitHub Actions always sets) gates the suite instead: a dev
 * database pointed at by hand is never touched.
 */
const runWithDatabase = process.env["CI"] === "true" && Boolean(process.env["DATABASE_URL"]);
const describeWithDatabase = runWithDatabase ? describe : describe.skip;

const DAY_MS = 24 * 60 * 60 * 1000;

function suitePhone(alias: string): string {
  const hex = createHash("sha256").update(`purge-e2e:${alias}`).digest("hex");
  let digits = "";
  for (let i = 0; digits.length < 7 && i + 2 <= hex.length; i += 2) {
    digits += String(parseInt(hex.slice(i, i + 2), 16) % 100).padStart(2, "0");
  }
  return `+9936${digits.slice(0, 7)}`;
}

describeWithDatabase("PurgeExpiredAccounts — Postgres", () => {
  const now = new Date();
  const expiredUserId = randomUUID();
  const otherUserId = randomUUID();
  const expiredPhone = suitePhone("expired");
  const otherPhone = suitePhone("other");
  const strangerPhone = suitePhone("stranger");

  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
  });

  afterAll(async () => {
    await prisma.otpRequest.deleteMany({
      where: {
        OR: [
          { userId: { in: [expiredUserId, otherUserId] } },
          { destination: { in: [expiredPhone, otherPhone, strangerPhone] } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: [expiredUserId, otherUserId] } } });
    await prisma.onModuleDestroy();
  });

  it("deletes code requests past retention and the purged User's own, and keeps the rest", async () => {
    await prisma.user.create({
      data: {
        id: expiredUserId,
        phone: expiredPhone,
        phoneVerifiedAt: now,
        deletionScheduledAt: new Date(now.getTime() - 1_000),
      },
    });
    await prisma.user.create({
      data: { id: otherUserId, phone: otherPhone, phoneVerifiedAt: now },
    });

    const old = new Date(now.getTime() - 31 * DAY_MS);
    const seed = (data: {
      destination: string;
      userId?: string;
      createdAt: Date;
    }) =>
      prisma.otpRequest.create({
        data: {
          purpose: "sign_in",
          channel: "phone",
          codeHash: "e2e-code-hash",
          expiresAt: new Date(now.getTime() + DAY_MS),
          ip: "10.0.0.1",
          ...data,
          userId: data.userId ?? null,
        },
      });

    // Past retention: gone on every run, whoever they belong to.
    const oldStranger = await seed({ destination: strangerPhone, createdAt: old });
    const oldExpiredPhone = await seed({ destination: expiredPhone, createdAt: old });
    // Recent, but the purged User's: by User id, or by the purged phone from
    // a signed-out request.
    const recentOwn = await seed({ destination: strangerPhone, userId: expiredUserId, createdAt: now });
    const recentSignedOut = await seed({ destination: expiredPhone, createdAt: now });
    // Recent and not the purged User's: stay until they are 30 days old.
    const recentStranger = await seed({ destination: strangerPhone, createdAt: now });
    const recentOtherUser = await seed({ destination: otherPhone, userId: otherUserId, createdAt: now });

    const result = await new PurgeExpiredAccounts(prisma).execute({ now });

    expect(result.purgedCount).toBe(1);
    const remaining = await prisma.otpRequest.findMany({
      where: {
        id: {
          in: [
            oldStranger.id,
            oldExpiredPhone.id,
            recentOwn.id,
            recentSignedOut.id,
            recentStranger.id,
            recentOtherUser.id,
          ],
        },
      },
      select: { id: true },
    });
    expect(remaining.map((row) => row.id).sort()).toEqual(
      [recentStranger.id, recentOtherUser.id].sort(),
    );

    const purged = await prisma.user.findUnique({
      where: { id: expiredUserId },
      select: { phone: true, deletionScheduledAt: true },
    });
    expect(purged).toEqual({ phone: null, deletionScheduledAt: null });
  });
});
