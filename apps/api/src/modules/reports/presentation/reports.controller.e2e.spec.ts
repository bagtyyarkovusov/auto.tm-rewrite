import "reflect-metadata";

import { randomUUID } from "node:crypto";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { EventEmitterModule } from "@nestjs/event-emitter";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import supertest from "supertest";
import { PrismaService } from "@auto-tm/db";
import type { Prisma } from "@auto-tm/db";

import { ReportsModule } from "../reports.module";
import { ListingsModule } from "../../listings/listings.module";
import { IdentityModule } from "../../identity/identity.module";
import { IMAGE_VARIANT_GENERATOR } from "../../listings/domain/ports/ImageVariantGenerator";
import { LISTING_EVENT_PUBLISHER } from "../../listings/domain/ports/ListingEventPublisher";
import { GlobalErrorFilter } from "../../../common/error.filter";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { EnvSchema } from "../../../env.schema";
import { mintUserJwt } from "../../../../test/helpers/mintUserJwt";
import { mintAdminJwt } from "../../../../test/helpers/mintAdminJwt";
import { testUserId } from "../../../../test/helpers/testUserId";

describe("ReportsController e2e", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;
  let config: ConfigService;

  beforeAll(async () => {
    process.env["INSPECTION_INTEREST_ENABLED"] = "true";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: (cfg) => EnvSchema.parse(cfg),
        }),
        EventEmitterModule.forRoot(),
        IdentityModule,
        ListingsModule,
        ReportsModule,
        JwtModule.register({
          global: true,
          secret: process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
          signOptions: { expiresIn: "1h" },
        }),
      ],
    })
      .overrideProvider(IMAGE_VARIANT_GENERATOR)
      .useValue({
        generate: async (originalKey: string) => ({
          variants: {
            thumbnail: `${originalKey}/thumbnail.jpg`,
            list: `${originalKey}/list.jpg`,
            detail: `${originalKey}/detail.jpg`,
            fullscreen: `${originalKey}/fullscreen.jpg`,
          },
        }),
      })
      .overrideProvider(LISTING_EVENT_PUBLISHER)
      .useValue({ emit: async () => {} })
      .compile();

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
    config = app.get(ConfigService);
  }, 60_000);

  afterAll(async () => {
    delete process.env["INSPECTION_INTEREST_ENABLED"];
    await app.close();
  }, 60_000);

  beforeEach(async () => {
    await prisma.inspectionInterest.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.listingMedia.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.listingDraft.deleteMany();
    await prisma.exchangeRate.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.city.deleteMany();
    await prisma.region.deleteMany();
    await prisma.model.deleteMany();
    await prisma.brand.deleteMany();
  });

  async function createUser(alias: Parameters<typeof testUserId>[0], role: "buyer" | "admin" = "buyer"): Promise<string> {
    const userId = testUserId(alias);
    await prisma.user.create({
      data: { id: userId, phone: `+9936${userId.slice(-8)}`, role },
    });
    return mintUserJwt(userId);
  }

  async function createElevatedAdmin(): Promise<{ adminId: string; token: string }> {
    const adminId = randomUUID();
    await prisma.user.create({
      data: { id: adminId, phone: `+9936${adminId.slice(-8)}`, role: "admin" },
    });
    const session = await prisma.session.create({
      data: {
        userId: adminId,
        refreshTokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        adminTotpExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    });

    return { adminId, token: mintAdminJwt(adminId, session.id) };
  }

  async function seedCatalog() {
    const brand = await prisma.brand.create({
      data: {
        id: "00000000-0000-0000-0000-000000000001",
        slug: "test-brand",
        nameRu: "Test Brand",
        nameTk: "Test Brand",
        nameEn: "Test Brand",
      },
    });
    const model = await prisma.model.create({
      data: {
        id: "00000000-0000-0000-0000-000000000002",
        brandId: brand.id,
        slug: "test-model",
        nameRu: "Test Model",
        nameTk: "Test Model",
        nameEn: "Test Model",
      },
    });
    const region = await prisma.region.create({
      data: {
        id: "00000000-0000-0000-0000-000000000003",
        slug: "test-region",
        nameRu: "Test Region",
        nameTk: "Test Region",
        nameEn: "Test Region",
      },
    });
    const city = await prisma.city.create({
      data: {
        id: "00000000-0000-0000-0000-000000000004",
        regionId: region.id,
        slug: "test-city",
        nameRu: "Test City",
        nameTk: "Test City",
        nameEn: "Test City",
      },
    });
    await prisma.exchangeRate.create({
      data: { fromCurrency: "TMT", toCurrency: "TMT", rate: 1 },
    });

    return { brand, model, region, city };
  }

  async function seedDraft(alias: Parameters<typeof testUserId>[0], payload: Record<string, unknown>) {
    return prisma.listingDraft.create({
      data: { userId: testUserId(alias), payload: payload as Prisma.InputJsonValue },
    });
  }

  const validPayload = {
    brandId: "00000000-0000-0000-0000-000000000001",
    modelId: "00000000-0000-0000-0000-000000000002",
    cityId: "00000000-0000-0000-0000-000000000004",
    regionId: "00000000-0000-0000-0000-000000000003",
    priceAmount: 100000,
    priceCurrency: "TMT",
    year: 2020,
    condition: "used",
    mileageKm: 50000,
    description: "Great car",
    allowCalls: true,
    allowChat: true,
    photos: [
      {
        photoId: "00000000-0000-0000-0000-000000000005",
        key: "photo1.jpg",
        sortOrder: 0,
      },
    ],
  };

  describe("POST /api/v1/listings/:id/inspection-interest", () => {
    it("returns 401 without bearer token", async () => {
      await request
        .post("/api/v1/listings/listing-id/inspection-interest")
        .send({})
        .expect(401);
    });

    it("creates buyer interest for an active listing", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id as string;

      const res = await request
        .post(`/api/v1/listings/${listingId}/inspection-interest`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({ willingnessToPayTmt: 5000 })
        .expect(201);

      expect(res.body.listingId).toBe(listingId);
      expect(res.body.requesterUserId).toBe(testUserId("buyer-1"));
      expect(res.body.side).toBe("buyer");
      expect(res.body.willingnessToPayTmt).toBe(5000);
      expect(res.body.reusedExisting).toBe(false);
    });

    it("dedupes repeated interest and updates willingness to pay", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id as string;

      const first = await request
        .post(`/api/v1/listings/${listingId}/inspection-interest`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({ willingnessToPayTmt: 1000 })
        .expect(201);

      const second = await request
        .post(`/api/v1/listings/${listingId}/inspection-interest`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({ willingnessToPayTmt: 3000 })
        .expect(200);

      expect(second.body.id).toBe(first.body.id);
      expect(second.body.willingnessToPayTmt).toBe(3000);
      expect(second.body.reusedExisting).toBe(true);

      const rows = await prisma.inspectionInterest.count();
      expect(rows).toBe(1);
    });

    it("returns 404 for missing listing", async () => {
      const buyerToken = await createUser("buyer-1");

      await request
        .post("/api/v1/listings/non-existent-id/inspection-interest")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(404);
    });

    it("returns 404 for banned listing", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id as string;

      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "banned" },
      });

      await request
        .post(`/api/v1/listings/${listingId}/inspection-interest`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(404);
    });

    it("infers seller side when requester owns the listing", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id as string;

      const res = await request
        .post(`/api/v1/listings/${listingId}/inspection-interest`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);

      expect(res.body.side).toBe("seller");
    });
  });

  describe("INSPECTION_INTEREST_ENABLED=false", () => {
    it("returns 403 FEATURE_DISABLED", async () => {
      config.set("INSPECTION_INTEREST_ENABLED", false);

      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id as string;

      const res = await request
        .post(`/api/v1/listings/${listingId}/inspection-interest`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(403);

      expect(res.body.details).toMatchObject({ reason: "FEATURE_DISABLED" });

      config.set("INSPECTION_INTEREST_ENABLED", true);
    });
  });

  describe("GET /api/v1/admin/inspection-interests", () => {
    it("returns 401 without bearer token", async () => {
      await request.get("/api/v1/admin/inspection-interests").expect(401);
    });

    it("returns aggregate counts for admin", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const { token: adminToken } = await createElevatedAdmin();
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id as string;

      await request
        .post(`/api/v1/listings/${listingId}/inspection-interest`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({ willingnessToPayTmt: 5000 })
        .expect(201);

      const res = await request
        .get("/api/v1/admin/inspection-interests")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        listingId,
        totalInterest: 1,
        buyerInterest: 1,
        sellerInterest: 0,
        willingnessToPayTmtSum: 5000,
        willingnessToPayTmtCount: 1,
        willingnessToPayTmtAvg: 5000,
      });
    });
  });
});
