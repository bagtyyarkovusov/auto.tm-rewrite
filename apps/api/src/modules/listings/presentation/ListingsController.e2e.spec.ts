import "reflect-metadata";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import supertest from "supertest";
import { ListingsSchemas } from "@auto-tm/contracts";
import { PrismaService } from "@auto-tm/db";
import type { Prisma } from "@auto-tm/db";

import { ListingsModule } from "../listings.module";
import { IdentityModule } from "../../identity/identity.module";
import { GlobalErrorFilter } from "../../../common/error.filter";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { mintUserJwt } from "../../../../test/helpers/mintUserJwt";
import {
  cleanSuiteFixtures,
  defineE2eSuite,
  seedSuiteCatalog,
} from "../../../../test/helpers/e2eSuite";
import { IMAGE_VARIANT_GENERATOR } from "../domain/ports/ImageVariantGenerator";
import { LISTING_EVENT_PUBLISHER } from "../domain/ports/ListingEventPublisher";

const suite = defineE2eSuite("listings-controller");
type SuiteUser = "user-1" | "user-2";
const SUITE_USERS: readonly SuiteUser[] = ["user-1", "user-2"];

describe("ListingsController e2e", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ListingsModule,
        IdentityModule,
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Only this suite owns the USD→TMT pair; the EXCHANGE_RATE_MISSING test
    // depends on its absence at test start. TMT→TMT is shared with other
    // suites — seeded via upsert, never deleted (see e2eSuite helper).
    await cleanSuiteFixtures(prisma, suite, {
      userAliases: SUITE_USERS,
      exchangeRatePairs: [{ from: "USD", to: "TMT" }],
    });
  });

  async function createUser(alias: SuiteUser): Promise<string> {
    await prisma.user.create({
      data: { id: suite.id(alias), phone: suite.phone(alias), role: "buyer" },
    });
    return mintUserJwt(suite.id(alias));
  }

  async function seedCatalog() {
    return seedSuiteCatalog(prisma, suite);
  }

  async function seedDraft(alias: SuiteUser, payload: Record<string, unknown>) {
    const draft = await prisma.listingDraft.create({
      data: { userId: suite.id(alias), payload: payload as Prisma.InputJsonValue },
    });
    return draft;
  }

  async function seedExchangeRate(from: "TMT" | "USD" | "AED", to: "TMT" | "USD" | "AED", rate: number) {
    await prisma.exchangeRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
      create: { fromCurrency: from, toCurrency: to, rate },
      update: { rate },
    });
  }

  const validPayload = {
    brandId: suite.catalog.brandId,
    modelId: suite.catalog.modelId,
    cityId: suite.catalog.cityId,
    regionId: suite.catalog.regionId,
    priceAmount: 100000,
    priceCurrency: "TMT",
    year: 2020,
    condition: "used",
    mileageKm: 50000,
    description: "Great car",
    allowCalls: true,
    allowChat: true,
    photos: [{ photoId: suite.id("photo-1"), key: "photo1.jpg", sortOrder: 0 }],
    conditionDisclosure: {
      accidentReported: false,
      mileageAccurate: true,
      ownerCount: 2,
      serviceHistoryAvailable: true,
      knownIssuesText: "Small scratch",
    },
  };

  describe("POST /api/v1/listings/drafts/:id/publish", () => {
    it("returns 401 without bearer token", async () => {
      await request
        .post("/api/v1/listings/drafts/draft-id/publish")
        .send({})
        .expect(401);
    });

    it("publishes a valid draft", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const res = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      expect(res.body.status).toBe("active");
      expect(res.body.brandId).toBe(validPayload.brandId);
      expect(res.body.priceAmount).toBe(validPayload.priceAmount);

      // Draft should be deleted
      const draftAfter = await prisma.listingDraft.findUnique({ where: { id: draft.id } });
      expect(draftAfter).toBeNull();

      // Media should be created
      const media = await prisma.listingMedia.findMany({ where: { listingId: res.body.id } });
      expect(media).toHaveLength(1);

      // Condition disclosure should be persisted
      const listing = await prisma.listing.findUnique({ where: { id: res.body.id } });
      expect(listing).toMatchObject({
        accidentReported: validPayload.conditionDisclosure.accidentReported,
        mileageAccurate: validPayload.conditionDisclosure.mileageAccurate,
        ownerCount: validPayload.conditionDisclosure.ownerCount,
        serviceHistoryAvailable: validPayload.conditionDisclosure.serviceHistoryAvailable,
        knownIssuesText: validPayload.conditionDisclosure.knownIssuesText,
      });

      // Audit log should be written
      const audit = await prisma.auditLog.findFirst({
        where: { action: "listing.published", targetId: res.body.id },
      });
      expect(audit).not.toBeNull();
    });

    it("rejects with EXCHANGE_RATE_MISSING for USD without rate", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", { ...validPayload, priceCurrency: "USD" });

      const res = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.code).toBe("EXCHANGE_RATE_MISSING");
    });

    it("publishes USD-priced draft when rate exists", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      await seedExchangeRate("USD", "TMT", 3.5);
      const draft = await seedDraft("user-1", { ...validPayload, priceCurrency: "USD" });

      const res = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      expect(res.body.priceCurrency).toBe("USD");
    });

    it("rejects for another user's draft", async () => {
      await seedCatalog();
      await createUser("user-1");
      const token2 = await createUser("user-2");
      const draft = await seedDraft("user-1", validPayload);

      await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token2}`)
        .send({})
        .expect(403);
    });
  });

  describe("Full lifecycle", () => {
    it("publish → mark sold → archive → republish → delete", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      // Publish
      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;
      expect(publishRes.body.status).toBe("active");

      // Mark sold
      const soldRes = await request
        .post(`/api/v1/listings/${listingId}/sold`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      expect(soldRes.body.status).toBe("sold");
      expect(soldRes.body.soldAt).toBeTruthy();

      const soldAudit = await prisma.auditLog.findFirst({
        where: { action: "listing.marked_sold", targetId: listingId },
      });
      expect(soldAudit).not.toBeNull();

      // Archive
      const archiveRes = await request
        .post(`/api/v1/listings/${listingId}/archive`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      expect(archiveRes.body.status).toBe("archived");

      const archiveAudit = await prisma.auditLog.findFirst({
        where: { action: "listing.archived", targetId: listingId },
      });
      expect(archiveAudit).not.toBeNull();

      // Republish
      const republishRes = await request
        .post(`/api/v1/listings/${listingId}/republish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      expect(republishRes.body.status).toBe("active");
      expect(republishRes.body.publishedAt).toBeTruthy();

      const republishAudit = await prisma.auditLog.findFirst({
        where: { action: "listing.republished", targetId: listingId },
      });
      expect(republishAudit).not.toBeNull();

      // Delete
      await request
        .delete(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const listingAfter = await prisma.listing.findUnique({ where: { id: listingId } });
      expect(listingAfter).not.toBeNull();
      expect(listingAfter?.deletedAt).not.toBeNull();
      expect(listingAfter?.status).toBe("active"); // status preserved

      const deleteAudit = await prisma.auditLog.findFirst({
        where: { action: "listing.deleted", targetId: listingId },
      });
      expect(deleteAudit).not.toBeNull();

      // Media rows should still exist
      const mediaAfter = await prisma.listingMedia.findMany({ where: { listingId } });
      expect(mediaAfter).toHaveLength(1);
    });
  });

  describe("PATCH /api/v1/listings/:id", () => {
    it("edits a listing's description", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const editRes = await request
        .patch(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ description: "Updated description" })
        .expect(200);

      expect(editRes.body.description).toBe("Updated description");
      expect(editRes.body.id).toBe(listingId);
    });

    it("writes price_changed audit log on price update", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .patch(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ priceAmount: 200000 })
        .expect(200);

      const audit = await prisma.auditLog.findFirst({
        where: { action: "listing.price_changed", targetId: listingId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.details).toMatchObject({
        oldPriceAmount: 100000,
        oldPriceCurrency: "TMT",
        newPriceAmount: 200000,
        newPriceCurrency: "TMT",
      });
    });

    it("rejects locked field changes", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const res = await request
        .patch(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ brandId: "00000000-0000-0000-0000-000000000099" })
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("edits conditionDisclosure", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const editRes = await request
        .patch(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          conditionDisclosure: {
            accidentReported: true,
            mileageAccurate: true,
            serviceHistoryAvailable: false,
          },
        })
        .expect(200);

      expect(editRes.body.conditionDisclosure).toMatchObject({
        accidentReported: true,
        mileageAccurate: true,
        ownerCount: validPayload.conditionDisclosure.ownerCount,
        serviceHistoryAvailable: false,
        knownIssuesText: validPayload.conditionDisclosure.knownIssuesText,
      });
    });

    it("rejects conditionDisclosure with ownerCount out of bounds", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .patch(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          conditionDisclosure: {
            accidentReported: false,
            mileageAccurate: true,
            serviceHistoryAvailable: true,
            ownerCount: 0,
          },
        })
        .expect(400);

      await request
        .patch(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          conditionDisclosure: {
            accidentReported: false,
            mileageAccurate: true,
            serviceHistoryAvailable: true,
            ownerCount: 21,
          },
        })
        .expect(400);
    });

    it("rejects conditionDisclosure with knownIssuesText over 1000 chars", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .patch(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          conditionDisclosure: {
            accidentReported: false,
            mileageAccurate: true,
            serviceHistoryAvailable: true,
            knownIssuesText: "x".repeat(1001),
          },
        })
        .expect(400);
    });

    it("returns 403 when trying to modify another user's listing", async () => {
      await seedCatalog();
      const token1 = await createUser("user-1");
      const token2 = await createUser("user-2");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token1}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .post(`/api/v1/listings/${listingId}/sold`)
        .set("Authorization", `Bearer ${token2}`)
        .send({})
        .expect(403);

      await request
        .post(`/api/v1/listings/${listingId}/archive`)
        .set("Authorization", `Bearer ${token2}`)
        .send({})
        .expect(403);

      await request
        .post(`/api/v1/listings/${listingId}/republish`)
        .set("Authorization", `Bearer ${token2}`)
        .send({})
        .expect(403);

      await request
        .delete(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token2}`)
        .send({})
        .expect(403);
    });
  });

  describe("GET /api/v1/listings/:id", () => {
    it("returns detail for a published listing", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const res = await request
        .get(`/api/v1/listings/${listingId}`)
        .expect(200);

      expect(res.body.id).toBe(listingId);
      expect(res.body.status).toBe("active");
      expect(res.body.priceAmount).toBe(validPayload.priceAmount);
      expect(res.body.displayPriceTmt).toBe(validPayload.priceAmount);
      expect(res.body.media).toHaveLength(1);
      expect(res.body.media[0].variants.thumbnail).toContain("thumbnail.jpg");
    });

    it("returns 404 for soft-deleted listing", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .delete(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(200);

      await request
        .get(`/api/v1/listings/${listingId}`)
        .expect(404);
    });

    it("returns detail with conditionDisclosure", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const res = await request
        .get(`/api/v1/listings/${listingId}`)
        .expect(200);

      expect(res.body.id).toBe(listingId);
      expect(res.body.conditionDisclosure).toMatchObject(validPayload.conditionDisclosure);
    });

    it("returns detail without conditionDisclosure for older listings", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const { conditionDisclosure: _, ...payloadWithoutDisclosure } = validPayload;
      const draft = await seedDraft("user-1", payloadWithoutDisclosure);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const res = await request
        .get(`/api/v1/listings/${listingId}`)
        .expect(200);

      expect(res.body.conditionDisclosure).toBeUndefined();
    });
  });

  describe("GET /api/v1/listings", () => {
    it("returns empty feed when no listings", async () => {
      // Scoped to this suite's brand: concurrent e2e suites share the dev
      // stack, so a global empty-feed assertion is not meaningful.
      const res = await request
        .get("/api/v1/listings")
        .query({ brandId: suite.catalog.brandId })
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.nextCursor).toBeNull();
    });

    it("returns a response that matches the shared feed contract", async () => {
      await seedCatalog();
      await createUser("user-1");
      await prisma.listing.create({
        data: {
          sellerId: suite.id("user-1"),
          status: "active",
          brandId: validPayload.brandId,
          modelId: validPayload.modelId,
          cityId: validPayload.cityId,
          year: validPayload.year,
          priceAmount: validPayload.priceAmount,
          priceCurrency: "TMT",
          publishedAt: new Date("2026-07-18T12:00:00.000Z"),
        },
      });

      const feed = await request.get("/api/v1/listings").query({ brandId: suite.catalog.brandId }).expect(200);
      const parsed = ListingsSchemas.FeedResponseSchema.parse(feed.body);

      expect(parsed.items).toHaveLength(1);
    });

    it("returns coverMediaKey for published listings with media", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const feed = await request
        .get("/api/v1/listings")
        .expect(200);

      const item = feed.body.items.find((i: { id: string }) => i.id === listingId);
      expect(item).toBeDefined();
      expect(item.coverMediaKey).toBe("photo1.jpg");
    });

    it("paginates feed with cursor", async () => {
      await seedCatalog();
      const token = await createUser("user-1");

      // Publish 25 listings
      for (let i = 0; i < 25; i++) {
        const draft = await seedDraft("user-1", {
          ...validPayload,
          photos: [{ photoId: suite.id(`photo-${i}`), key: `photo${i}.jpg`, sortOrder: 0 }],
        });
        await request
          .post(`/api/v1/listings/drafts/${draft.id}/publish`)
          .set("Authorization", `Bearer ${token}`)
          .send({})
          .expect(201);
      }

      // First page
      const page1 = await request
        .get("/api/v1/listings")
        .query({ brandId: suite.catalog.brandId })
        .expect(200);

      expect(page1.body.items).toHaveLength(20);
      expect(page1.body.nextCursor).not.toBeNull();

      // Second page
      const page2 = await request
        .get("/api/v1/listings")
        .query({ brandId: suite.catalog.brandId, cursor: page1.body.nextCursor })
        .expect(200);

      expect(page2.body.items).toHaveLength(5);
      expect(page2.body.nextCursor).toBeNull();
    });

    it("shows sold listings within 14 days", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      // Mark sold
      await request
        .post(`/api/v1/listings/${listingId}/sold`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      // Should still be in feed
      const feed = await request
        .get("/api/v1/listings")
        .expect(200);

      expect(feed.body.items.some((item: { id: string }) => item.id === listingId)).toBe(true);

      // Rewind soldAt to 15 days ago
      await prisma.listing.update({
        where: { id: listingId },
        data: { soldAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      });

      // Should no longer be in feed
      const feedAfter = await request
        .get("/api/v1/listings")
        .expect(200);

      expect(feedAfter.body.items.some((item: { id: string }) => item.id === listingId)).toBe(false);
    });

    it("excludes soft-deleted listings from feed", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .delete(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(200);

      const feed = await request
        .get("/api/v1/listings")
        .expect(200);

      expect(feed.body.items.some((item: { id: string }) => item.id === listingId)).toBe(false);
    });

    it("filters feed by brandId", async () => {
      await seedCatalog();
      const brand2 = await prisma.brand.create({
        data: {
          id: suite.id("brand-2"),
          slug: suite.slugFor("brand-2"),
          nameRu: "Test Brand 2",
          nameTk: "Test Brand 2",
          nameEn: "Test Brand 2",
        },
      });
      await prisma.model.create({
        data: {
          id: suite.id("model-2"),
          brandId: brand2.id,
          slug: suite.slugFor("model-2"),
          nameRu: "Test Model 2",
          nameTk: "Test Model 2",
          nameEn: "Test Model 2",
        },
      });

      const token = await createUser("user-1");

      const draft1 = await seedDraft("user-1", validPayload);
      const draft2 = await seedDraft("user-1", {
        ...validPayload,
        brandId: brand2.id,
        modelId: suite.id("model-2"),
        photos: [
          {
            photoId: suite.id("photo-2"),
            key: "photo2.jpg",
            sortOrder: 0,
          },
        ],
      });

      const publish1 = await request
        .post(`/api/v1/listings/drafts/${draft1.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      await request
        .post(`/api/v1/listings/drafts/${draft2.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      const feed = await request
        .get("/api/v1/listings")
        .query({ brandId: validPayload.brandId })
        .expect(200);

      expect(feed.body.items).toHaveLength(1);
      expect(feed.body.items[0].id).toBe(publish1.body.id);
      expect(feed.body.nextCursor).toBeNull();
    });

    it("returns empty result for zero-match filter", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      const feed = await request
        .get("/api/v1/listings")
        .query({ brandId: "00000000-0000-0000-0000-000000000999" })
        .expect(200);

      expect(feed.body.items).toHaveLength(0);
      expect(feed.body.nextCursor).toBeNull();
    });

    it("paginates to cursor end with filters applied", async () => {
      await seedCatalog();
      const brand2 = await prisma.brand.create({
        data: {
          id: suite.id("brand-2"),
          slug: suite.slugFor("brand-2"),
          nameRu: "Test Brand 2",
          nameTk: "Test Brand 2",
          nameEn: "Test Brand 2",
        },
      });
      await prisma.model.create({
        data: {
          id: suite.id("model-2"),
          brandId: brand2.id,
          slug: suite.slugFor("model-2"),
          nameRu: "Test Model 2",
          nameTk: "Test Model 2",
          nameEn: "Test Model 2",
        },
      });

      const token = await createUser("user-1");

      // Publish 4 listings alternating brands
      for (let i = 0; i < 4; i++) {
        const draft = await seedDraft("user-1", {
          ...validPayload,
          brandId: i % 2 === 0 ? validPayload.brandId : brand2.id,
          modelId: i % 2 === 0 ? validPayload.modelId : suite.id("model-2"),
          photos: [{ photoId: suite.id(`photo-${i}`), key: `photo${i}.jpg`, sortOrder: 0 }],
        });
        await request
          .post(`/api/v1/listings/drafts/${draft.id}/publish`)
          .set("Authorization", `Bearer ${token}`)
          .send({})
          .expect(201);
      }

      // Page through with limit=1 and brand filter (should get 2 listings)
      const page1 = await request
        .get("/api/v1/listings")
        .query({ brandId: validPayload.brandId, limit: 1 })
        .expect(200);

      expect(page1.body.items).toHaveLength(1);
      expect(page1.body.nextCursor).not.toBeNull();

      const page2 = await request
        .get("/api/v1/listings")
        .query({ brandId: validPayload.brandId, limit: 1, cursor: page1.body.nextCursor })
        .expect(200);

      expect(page2.body.items).toHaveLength(1);
      expect(page2.body.nextCursor).toBeNull();
    });

    it("returns 400 VALIDATION_ERROR for invalid filter range", async () => {
      const res = await request
        .get("/api/v1/listings")
        .query({ priceMin: 200000, priceMax: 100000 })
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/listings/count", () => {
    it("returns zero when no listings exist", async () => {
      // Scoped to this suite's brand — see the empty-feed note above.
      const res = await request
        .get("/api/v1/listings/count")
        .query({ brandId: suite.catalog.brandId })
        .expect(200);

      expect(res.body.totalMatching).toBe(0);
    });

    it("counts all eligible listings", async () => {
      await seedCatalog();
      const token = await createUser("user-1");

      for (let i = 0; i < 3; i++) {
        const draft = await seedDraft("user-1", {
          ...validPayload,
          photos: [{ photoId: suite.id(`photo-${i}`), key: `photo${i}.jpg`, sortOrder: 0 }],
        });
        await request
          .post(`/api/v1/listings/drafts/${draft.id}/publish`)
          .set("Authorization", `Bearer ${token}`)
          .send({})
          .expect(201);
      }

      const res = await request
        .get("/api/v1/listings/count")
        .query({ brandId: suite.catalog.brandId })
        .expect(200);

      expect(res.body.totalMatching).toBe(3);
    });

    it("counts listings matching brand filter", async () => {
      await seedCatalog();
      const brand2 = await prisma.brand.create({
        data: {
          id: suite.id("brand-2"),
          slug: suite.slugFor("brand-2"),
          nameRu: "Test Brand 2",
          nameTk: "Test Brand 2",
          nameEn: "Test Brand 2",
        },
      });
      await prisma.model.create({
        data: {
          id: suite.id("model-2"),
          brandId: brand2.id,
          slug: suite.slugFor("model-2"),
          nameRu: "Test Model 2",
          nameTk: "Test Model 2",
          nameEn: "Test Model 2",
        },
      });

      const token = await createUser("user-1");

      const draft1 = await seedDraft("user-1", validPayload);
      const draft2 = await seedDraft("user-1", {
        ...validPayload,
        brandId: brand2.id,
        modelId: suite.id("model-2"),
        photos: [
          {
            photoId: suite.id("photo-2"),
            key: "photo2.jpg",
            sortOrder: 0,
          },
        ],
      });

      await request
        .post(`/api/v1/listings/drafts/${draft1.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      await request
        .post(`/api/v1/listings/drafts/${draft2.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      const res = await request
        .get("/api/v1/listings/count")
        .query({ brandId: validPayload.brandId })
        .expect(200);

      expect(res.body.totalMatching).toBe(1);
    });

    it("excludes soft-deleted listings from count", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .delete(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(200);

      const res = await request
        .get("/api/v1/listings/count")
        .query({ brandId: suite.catalog.brandId })
        .expect(200);

      expect(res.body.totalMatching).toBe(0);
    });

    it("includes sold listings within 14 days in count", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .post(`/api/v1/listings/${listingId}/sold`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      const res = await request
        .get("/api/v1/listings/count")
        .query({ brandId: suite.catalog.brandId })
        .expect(200);

      expect(res.body.totalMatching).toBe(1);

      await prisma.listing.update({
        where: { id: listingId },
        data: { soldAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      });

      const resAfter = await request
        .get("/api/v1/listings/count")
        .query({ brandId: suite.catalog.brandId })
        .expect(200);

      expect(resAfter.body.totalMatching).toBe(0);
    });

    it("respects FX-aware price filters", async () => {
      await seedCatalog();
      await seedExchangeRate("USD", "TMT", 3.5);
      const token = await createUser("user-1");

      const draftTmt = await seedDraft("user-1", { ...validPayload, priceAmount: 100000, priceCurrency: "TMT" });
      const draftUsd = await seedDraft("user-1", {
        ...validPayload,
        priceAmount: 20000,
        priceCurrency: "USD",
        photos: [
          {
            photoId: suite.id("photo-2"),
            key: "photo2.jpg",
            sortOrder: 0,
          },
        ],
      });

      await request
        .post(`/api/v1/listings/drafts/${draftTmt.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      await request
        .post(`/api/v1/listings/drafts/${draftUsd.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      const res = await request
        .get("/api/v1/listings/count")
        .query({ brandId: suite.catalog.brandId, priceMin: 50000, priceMax: 80000 })
        .expect(200);

      expect(res.body.totalMatching).toBe(1);
    });

    it("returns 400 VALIDATION_ERROR for invalid filter range", async () => {
      const res = await request
        .get("/api/v1/listings/count")
        .query({ priceMin: 200000, priceMax: 100000 })
        .expect(400);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/me/listings", () => {
    it("returns 401 without bearer token", async () => {
      await request
        .get("/api/v1/me/listings")
        .expect(401);
    });

    it("returns owner's listings", async () => {
      await seedCatalog();
      const token = await createUser("user-1");
      const draft = await seedDraft("user-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const res = await request
        .get("/api/v1/me/listings")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(listingId);
    });
  });
});
