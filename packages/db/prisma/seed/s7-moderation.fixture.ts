import type { PrismaClient } from "../../generated/prisma/client/client";

const ADMIN_PHONE = "+99360000001";
const TARGET_PHONE = "+99360000002";
const REPORTER_PHONE = "+99360000003";

const ADMIN_ID = "s7-fixture-admin-001";
const TARGET_ID = "s7-fixture-target-001";
const REPORTER_ID = "s7-fixture-reporter-001";
const LISTING_REPORT_ID = "s7-fixture-report-listing-001";
const USER_REPORT_ID = "s7-fixture-report-user-001";
const LISTING_TARGET_ID = "s7-fixture-listing-001";

async function upsertFixtureUser(
  prisma: PrismaClient,
  id: string,
  phone: string,
  displayName: string,
  role: "buyer" | "admin",
) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return existing;
  return prisma.user.create({
    data: { id, phone, displayName, role },
  });
}

export async function seedS7ModerationFixtures(prisma: PrismaClient) {
  const admin = await upsertFixtureUser(
    prisma,
    ADMIN_ID,
    ADMIN_PHONE,
    "Fixture Admin",
    "admin",
  );

  const target = await upsertFixtureUser(
    prisma,
    TARGET_ID,
    TARGET_PHONE,
    "Fixture Target User",
    "buyer",
  );

  const reporter = await upsertFixtureUser(
    prisma,
    REPORTER_ID,
    REPORTER_PHONE,
    "Fixture Reporter",
    "buyer",
  );

  const existingListingReport = await prisma.contentReport.findUnique({
    where: { id: LISTING_REPORT_ID },
  });
  if (!existingListingReport) {
    await prisma.contentReport.create({
      data: {
        id: LISTING_REPORT_ID,
        reporterUserId: reporter.id,
        targetType: "listing",
        targetId: LISTING_TARGET_ID,
        reason: "spam",
        status: "pending",
      },
    });
  }

  const existingUserReport = await prisma.contentReport.findUnique({
    where: { id: USER_REPORT_ID },
  });
  if (!existingUserReport) {
    await prisma.contentReport.create({
      data: {
        id: USER_REPORT_ID,
        reporterUserId: reporter.id,
        targetType: "user",
        targetId: target.id,
        reason: "harassment",
        status: "pending",
      },
    });
  }

  return { admin, target, reporter };
}
