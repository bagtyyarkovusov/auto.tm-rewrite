import "reflect-metadata";
import { randomUUID } from "node:crypto";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { EventEmitterModule } from "@nestjs/event-emitter";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import supertest from "supertest";
import { PrismaService } from "@auto-tm/db";

import { AdminModule } from "../admin.module";
import { IdentityModule } from "../../identity/identity.module";
import { ListingsModule } from "../../listings/listings.module";
import { GlobalErrorFilter } from "../../../common/error.filter";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { EnvSchema } from "../../../env.schema";
import { mintUserJwt } from "../../../../test/helpers/mintUserJwt";
import { mintAdminJwt } from "../../../../test/helpers/mintAdminJwt";
import {
  cleanSuiteFixtures,
  defineE2eSuite,
  seedSuiteCatalog,
} from "../../../../test/helpers/e2eSuite";

const suite = defineE2eSuite("admin-moderation-controller");
type SuiteUser =
  | "reporter-one"
  | "seller-one"
  | "admin-one"
  | "reporter-two"
  | "seller-two"
  | "admin-two";
const SUITE_USERS: readonly SuiteUser[] = [
  "reporter-one",
  "seller-one",
  "admin-one",
  "reporter-two",
  "seller-two",
  "admin-two",
];

describe("AdminModerationController e2e smoke", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  const reporterOneId = suite.id("reporter-one");
  const sellerOneId = suite.id("seller-one");
  const adminOneId = suite.id("admin-one");
  const reporterTwoId = suite.id("reporter-two");
  const sellerTwoId = suite.id("seller-two");
  const adminTwoId = suite.id("admin-two");

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: (cfg) => EnvSchema.parse(cfg) }),
        EventEmitterModule.forRoot(),
        AdminModule,
        IdentityModule,
        ListingsModule,
        JwtModule.register({
          global: true,
          secret: process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
          signOptions: { expiresIn: "1h" },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    const reflector = app.get(Reflector);
    const jwtService = app.get(JwtService);
    app.useGlobalGuards(new JwtAuthGuard(reflector, jwtService));
    app.useGlobalFilters(new GlobalErrorFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    request = supertest(app.getHttpServer());
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await cleanSuiteFixtures(prisma, suite, { userAliases: SUITE_USERS });
    await app.close();
  });

  beforeEach(async () => {
    // TMT→TMT is a shared global singleton — seeded via upsert in
    // seedCatalog, never deleted (see e2eSuite helper).
    await cleanSuiteFixtures(prisma, suite, { userAliases: SUITE_USERS });
  });

  async function seedCatalog() {
    const catalog = await seedSuiteCatalog(prisma, suite);
    // TMT→TMT is a shared global singleton — upsert, never delete.
    await prisma.exchangeRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: "TMT", toCurrency: "TMT" } },
      create: { fromCurrency: "TMT", toCurrency: "TMT", rate: 1 },
      update: { rate: 1 },
    });
    return catalog;
  }

  async function createUser(alias: SuiteUser, role: "buyer" | "admin" = "buyer") {
    await prisma.user.create({
      data: { id: suite.id(alias), phone: suite.phone(alias), role },
    });
    return role === "admin" ? null : mintUserJwt(suite.id(alias));
  }

  async function createAdminSession(adminUserId: string) {
    const session = await prisma.session.create({
      data: {
        userId: adminUserId,
        refreshTokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        adminTotpExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    });
    return mintAdminJwt(adminUserId, session.id);
  }

  async function createActiveListing(sellerId: string) {
    const catalog = await seedCatalog();
    const listing = await prisma.listing.create({
      data: {
        id: randomUUID(),
        sellerId,
        status: "active",
        brandId: catalog.brandId,
        modelId: catalog.modelId,
        cityId: catalog.cityId,
        regionId: catalog.regionId,
        year: 2020,
        mileageKm: 50000,
        priceAmount: 100000,
        priceCurrency: "TMT",
        description: "Great car",
        allowCalls: true,
        allowChat: true,
        publishedAt: new Date(),
      },
    });
    return listing;
  }

  describe("deterministic smoke: report → TOTP admin action → audit → enforcement", () => {
    it("report-backed ban flow with audit and public enforcement", async () => {
      // Arrange
      const reporterId = reporterOneId;
      const sellerId = sellerOneId;
      const adminId = adminOneId;

      await createUser("reporter-one", "buyer");
      await createUser("seller-one", "buyer");
      await createUser("admin-one", "admin");

      const reporterToken = mintUserJwt(reporterId);
      const adminToken = await createAdminSession(adminId);

      const listing = await createActiveListing(sellerId);

      // Act 1: Reporter creates a listing report
      const reportRes = await request
        .post(`/api/v1/listings/${listing.id}/report`)
        .set("Authorization", `Bearer ${reporterToken}`)
        .send({ reason: "spam" })
        .expect(201);

      expect(reportRes.body.status).toBe("pending");
      expect(reportRes.body.reusedExisting).toBe(false);
      const reportId = reportRes.body.reportId;

      // Act 2: Admin bans the listing via report-backed action
      const banRes = await request
        .post(`/api/v1/admin/listings/${listing.id}/ban`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Confirmed spam", reportId })
        .expect(200);

      expect(banRes.body.targetState.status).toBe("banned");
      expect(banRes.body.reportStatus).toBe("actioned");
      expect(banRes.body.auditLogId).toBeDefined();

      // Assert: Audit row exists with correct target/action/reason
      const audit = await prisma.auditLog.findUnique({
        where: { id: banRes.body.auditLogId },
      });
      expect(audit).not.toBeNull();
      expect(audit!.action).toBe("LISTING_BAN");
      expect(audit!.targetType).toBe("listing");
      expect(audit!.targetId).toBe(listing.id);
      expect(audit!.actorId).toBe(adminId);
      expect(audit!.details).toMatchObject({
        reason: "Confirmed spam",
        reportId,
      });

      // Assert: Public enforcement — non-owner detail returns 404
      await request
        .get(`/api/v1/listings/${listing.id}`)
        .expect(404);

      // Assert: Owner detail returns banned status
      const ownerToken = mintUserJwt(sellerId);
      const ownerRes = await request
        .get(`/api/v1/listings/${listing.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      expect(ownerRes.body.status).toBe("banned");

      // Assert: Report status is actioned
      const reportAfter = await prisma.contentReport.findUnique({
        where: { id: reportId },
      });
      expect(reportAfter!.status).toBe("actioned");
      expect(reportAfter!.reviewedById).toBe(adminId);
      expect(reportAfter!.reviewedAt).not.toBeNull();
    });

    it("dismiss flow with audit and no target mutation", async () => {
      const reporterId = reporterTwoId;
      const sellerId = sellerTwoId;
      const adminId = adminTwoId;

      await createUser("reporter-two", "buyer");
      await createUser("seller-two", "buyer");
      await createUser("admin-two", "admin");

      const reporterToken = mintUserJwt(reporterId);
      const adminToken = await createAdminSession(adminId);

      const listing = await createActiveListing(sellerId);

      // Reporter creates report
      const reportRes = await request
        .post(`/api/v1/listings/${listing.id}/report`)
        .set("Authorization", `Bearer ${reporterToken}`)
        .send({ reason: "scam" })
        .expect(201);

      const reportId = reportRes.body.reportId;

      // Admin dismisses
      const dismissRes = await request
        .post(`/api/v1/admin/reports/${reportId}/dismiss`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Not a violation" })
        .expect(200);

      expect(dismissRes.body.status).toBe("dismissed");
      expect(dismissRes.body.auditLogId).toBeDefined();

      // Audit row targets the content_report
      const audit = await prisma.auditLog.findUnique({
        where: { id: dismissRes.body.auditLogId },
      });
      expect(audit).not.toBeNull();
      expect(audit!.action).toBe("CONTENT_REPORT_RESOLVE");
      expect(audit!.targetType).toBe("content_report");
      expect(audit!.targetId).toBe(reportId);
      expect(audit!.details).toMatchObject({
        reason: "Not a violation",
        reportedTargetType: "listing",
        reportedTargetId: listing.id,
      });

      // Listing remains active
      const listingAfter = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(listingAfter!.status).toBe("active");
    });
  });
});
