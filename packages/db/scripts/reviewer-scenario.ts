#!/usr/bin/env tsx
import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client/client";
import {
  runReviewerScenarioSeed,
  type ReviewerScenarioSeedStore,
  type ReviewerScenarioUser,
} from "../src/reviewer-scenario-seed";

type PrismaOrTx = PrismaClient;

function parseArgs(argv: string[]): { mode: "seed" | "revoke" | null } {
  let mode: "seed" | "revoke" | null = "seed";

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--mode" && i + 1 < argv.length) {
      const rawMode = argv[++i];
      if (rawMode === "seed" || rawMode === "revoke") {
        mode = rawMode;
      } else {
        mode = null;
      }
    }
  }

  return { mode };
}

class PrismaReviewerScenarioSeedStore implements ReviewerScenarioSeedStore {
  constructor(private readonly prisma: PrismaOrTx) {}

  async findUserById(id: string): Promise<ReviewerScenarioUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, phone: true, role: true },
    });
    return user;
  }

  async findUserByPhone(phone: string): Promise<ReviewerScenarioUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, role: true },
    });
    return user;
  }

  async upsertUser(input: {
    id: string;
    phone: string;
    displayName: string;
    role: "buyer" | "seller";
  }): Promise<ReviewerScenarioUser> {
    return this.prisma.user.upsert({
      where: { id: input.id },
      update: {
        phone: input.phone,
        displayName: input.displayName,
        role: input.role,
        deletionScheduledAt: null,
      },
      create: {
        id: input.id,
        phone: input.phone,
        displayName: input.displayName,
        role: input.role,
      },
      select: { id: true, phone: true, role: true },
    });
  }

  async revokeUser(input: {
    id: string;
    revokedPhone: string;
    displayName: string;
  }): Promise<void> {
    await this.prisma.user.update({
      where: { id: input.id },
      data: {
        phone: input.revokedPhone,
        displayName: input.displayName,
      },
    });
  }

  async deleteSessionsByUserIds(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0;
    const result = await this.prisma.session.deleteMany({
      where: { userId: { in: userIds } },
    });
    return result.count;
  }

  async invalidatePushDevicesByUserIds(
    userIds: string[],
    invalidatedAt: Date,
  ): Promise<number> {
    if (userIds.length === 0) return 0;
    const result = await this.prisma.fcmDevice.updateMany({
      where: { userId: { in: userIds }, invalidatedAt: null },
      data: { invalidatedAt },
    });
    return result.count;
  }

  async upsertCatalog(input: {
    brandId: string;
    brandSlug: string;
    modelId: string;
    modelSlug: string;
    regionId: string;
    regionSlug: string;
    cityId: string;
    citySlug: string;
  }): Promise<void> {
    await this.prisma.brand.upsert({
      where: { slug: input.brandSlug },
      update: {
        nameRu: "AutoTM Review",
        nameTk: "AutoTM Review",
        nameEn: "AutoTM Review",
      },
      create: {
        id: input.brandId,
        slug: input.brandSlug,
        nameRu: "AutoTM Review",
        nameTk: "AutoTM Review",
        nameEn: "AutoTM Review",
      },
    });
    await this.prisma.model.upsert({
      where: {
        brandId_slug: { brandId: input.brandId, slug: input.modelSlug },
      },
      update: {
        nameRu: "Review Scenario",
        nameTk: "Review Scenario",
        nameEn: "Review Scenario",
      },
      create: {
        id: input.modelId,
        brandId: input.brandId,
        slug: input.modelSlug,
        nameRu: "Review Scenario",
        nameTk: "Review Scenario",
        nameEn: "Review Scenario",
      },
    });
    await this.prisma.region.upsert({
      where: { slug: input.regionSlug },
      update: {
        nameRu: "Review Region",
        nameTk: "Review Region",
        nameEn: "Review Region",
      },
      create: {
        id: input.regionId,
        slug: input.regionSlug,
        nameRu: "Review Region",
        nameTk: "Review Region",
        nameEn: "Review Region",
      },
    });
    await this.prisma.city.upsert({
      where: {
        regionId_slug: { regionId: input.regionId, slug: input.citySlug },
      },
      update: {
        nameRu: "Review City",
        nameTk: "Review City",
        nameEn: "Review City",
      },
      create: {
        id: input.cityId,
        regionId: input.regionId,
        slug: input.citySlug,
        nameRu: "Review City",
        nameTk: "Review City",
        nameEn: "Review City",
      },
    });
  }

  async upsertListing(input: {
    id: string;
    sellerId: string;
    priceAmount: number;
    description: string;
    publishedAt: Date;
  }): Promise<void> {
    await this.prisma.listing.upsert({
      where: { id: input.id },
      update: {
        sellerId: input.sellerId,
        status: "active",
        brandId: "autotm-reviewer-brand",
        modelId: "autotm-reviewer-model",
        cityId: "autotm-reviewer-city",
        regionId: "autotm-reviewer-region",
        year: 2020,
        mileageKm: 72000,
        priceAmount: input.priceAmount,
        priceCurrency: "TMT",
        description: input.description,
        deletedAt: null,
        publishedAt: input.publishedAt,
        condition: "used",
        locationText: "Review City",
        allowCalls: false,
        allowChat: true,
        contactPhone: null,
        accidentReported: false,
        mileageAccurate: true,
        ownerCount: 1,
        serviceHistoryAvailable: true,
        knownIssuesText: null,
      },
      create: {
        id: input.id,
        sellerId: input.sellerId,
        status: "active",
        brandId: "autotm-reviewer-brand",
        modelId: "autotm-reviewer-model",
        cityId: "autotm-reviewer-city",
        regionId: "autotm-reviewer-region",
        year: 2020,
        mileageKm: 72000,
        priceAmount: input.priceAmount,
        priceCurrency: "TMT",
        description: input.description,
        publishedAt: input.publishedAt,
        condition: "used",
        locationText: "Review City",
        allowCalls: false,
        allowChat: true,
        accidentReported: false,
        mileageAccurate: true,
        ownerCount: 1,
        serviceHistoryAvailable: true,
      },
    });
  }

  async upsertConversation(input: {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    lastMessageAt: Date;
    lastMessageId: string;
  }): Promise<void> {
    await this.prisma.conversation.upsert({
      where: { id: input.id },
      update: {
        listingId: input.listingId,
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        lastMessageAt: input.lastMessageAt,
        lastMessageId: input.lastMessageId,
      },
      create: input,
    });
  }

  async upsertConversationParticipant(input: {
    id: string;
    conversationId: string;
    userId: string;
    lastReadAt: Date | null;
    lastDeliveredAt: Date | null;
  }): Promise<void> {
    await this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: input.conversationId,
          userId: input.userId,
        },
      },
      update: {
        lastReadAt: input.lastReadAt,
        lastDeliveredAt: input.lastDeliveredAt,
      },
      create: input,
    });
  }

  async upsertMessage(input: {
    id: string;
    conversationId: string;
    senderId: string;
    kind: "text" | "post_ref";
    body: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }): Promise<void> {
    await this.prisma.message.upsert({
      where: { id: input.id },
      update: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        kind: input.kind,
        body: input.body,
        metadata: input.metadata,
        createdAt: input.createdAt,
        deletedAt: null,
      },
      create: input,
    });
  }

  async upsertContentReport(input: {
    id: string;
    reporterUserId: string;
    targetType: "listing";
    targetId: string;
    reason: "misleading";
    details: string;
  }): Promise<void> {
    await this.prisma.contentReport.upsert({
      where: { id: input.id },
      update: {
        reporterUserId: input.reporterUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details,
        status: "pending",
        reviewedById: null,
        reviewedAt: null,
        messageContext: null,
      },
      create: {
        id: input.id,
        reporterUserId: input.reporterUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details,
        status: "pending",
      },
    });
  }

  async createAuditLog(input: {
    action: string;
    targetType: string;
    targetId: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        details: input.details,
      },
    });
  }
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  if (!args.mode) {
    console.error("Usage: tsx scripts/reviewer-scenario.ts [--mode seed|revoke]");
    return 1;
  }

  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const result = await runReviewerScenarioSeed(
      new PrismaReviewerScenarioSeedStore(prisma),
      {
        mode: args.mode,
        reviewDemoAccountsJson: process.env["REVIEW_DEMO_ACCOUNTS_JSON"] ?? "[]",
        env: {
          appEnv: process.env["APP_ENV"],
          authorization: process.env["REVIEWER_SCENARIO_SEED_AUTHORIZATION"],
          signupsEnabled: process.env["SIGNUPS_ENABLED"],
          reviewDemoAccountEnabled: process.env["REVIEW_DEMO_ACCOUNT_ENABLED"],
        },
        now: new Date(),
      },
    );

    console.log(result.message);
    return result.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
