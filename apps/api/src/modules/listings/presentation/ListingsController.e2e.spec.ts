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
import { PrismaService } from "@auto-tm/db";
import type { Prisma } from "@auto-tm/db";

import { ListingsModule } from "../listings.module";
import { IdentityModule } from "../../identity/identity.module";
import { GlobalErrorFilter } from "../../../common/error.filter";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { mintUserJwt } from "../../../../test/helpers/mintUserJwt";
import { LISTING_EVENT_PUBLISHER } from "../domain/ports/ListingEventPublisher";

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
    await prisma.listingMedia.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.listingDraft.deleteMany();
    await prisma.exchangeRate.deleteMany();
    await prisma.user.deleteMany();
    await prisma.city.deleteMany();
    await prisma.region.deleteMany();
    await prisma.model.deleteMany();
    await prisma.brand.deleteMany();
  });

  async function createUser(userId: string): Promise<string> {
    await prisma.user.create({
      data: { id: userId, phone: `+9936${userId.slice(-8)}`, role: "buyer" },
    });
    return mintUserJwt(userId);
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
    await prisma.model.create({
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
        id: "00000000-0000-0000-0000-000000000004",
        slug: "test-region",
        nameRu: "Test Region",
        nameTk: "Test Region",
        nameEn: "Test Region",
      },
    });
    await prisma.city.create({
      data: {
        id: "00000000-0000-0000-0000-000000000003",
        regionId: region.id,
        slug: "test-city",
        nameRu: "Test City",
        nameTk: "Test City",
        nameEn: "Test City",
      },
    });
  }

  async function seedDraft(userId: string, payload: Record<string, unknown>) {
    const draft = await prisma.listingDraft.create({
      data: { userId, payload: payload as Prisma.InputJsonValue },
    });
    return draft;
  }

  async function seedExchangeRate(from: string, to: string, rate: number) {
    await prisma.exchangeRate.create({
      data: { fromCurrency: from as "TMT" | "USD" | "AED", toCurrency: to as "TMT" | "USD" | "AED", rate },
    });
  }

  const validPayload = {
    brandId: "00000000-0000-0000-0000-000000000001",
    modelId: "00000000-0000-0000-0000-000000000002",
    cityId: "00000000-0000-0000-0000-000000000003",
    regionId: "00000000-0000-0000-0000-000000000004",
    priceAmount: 100000,
    priceCurrency: "TMT",
    year: 2020,
    condition: "used",
    mileageKm: 50000,
    description: "Great car",
    allowCalls: true,
    allowChat: true,
    photos: [{ photoId: "00000000-0000-0000-0000-000000000005", key: "photo1.jpg", sortOrder: 0 }],
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

    it("returns 404 for another user's listing", async () => {
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
        .patch(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${token2}`)
        .send({ description: "Should not work" })
        .expect(404);
    });
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

    it("returns 404 for non-existent listing", async () => {
      await request
        .get("/api/v1/listings/non-existent-id")
        .expect(404);
    });
  });

  describe("GET /api/v1/listings", () => {
    it("returns empty feed when no listings", async () => {
      const res = await request
        .get("/api/v1/listings")
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.nextCursor).toBeNull();
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
          photos: [{ photoId: `00000000-0000-0000-0000-${i.toString().padStart(12, "0")}`, key: `photo${i}.jpg`, sortOrder: 0 }],
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
        .expect(200);

      expect(page1.body.items).toHaveLength(20);
      expect(page1.body.nextCursor).not.toBeNull();

      // Second page
      const page2 = await request
        .get("/api/v1/listings")
        .query({ cursor: page1.body.nextCursor })
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
          id: "00000000-0000-0000-0000-000000000010",
          slug: "test-brand-2",
          nameRu: "Test Brand 2",
          nameTk: "Test Brand 2",
          nameEn: "Test Brand 2",
        },
      });
      await prisma.model.create({
        data: {
          id: "00000000-0000-0000-0000-000000000011",
          brandId: brand2.id,
          slug: "test-model-2",
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
        modelId: "00000000-0000-0000-0000-000000000011",
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
          id: "00000000-0000-0000-0000-000000000010",
          slug: "test-brand-2",
          nameRu: "Test Brand 2",
          nameTk: "Test Brand 2",
          nameEn: "Test Brand 2",
        },
      });
      await prisma.model.create({
        data: {
          id: "00000000-0000-0000-0000-000000000011",
          brandId: brand2.id,
          slug: "test-model-2",
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
          modelId: i % 2 === 0 ? validPayload.modelId : "00000000-0000-0000-0000-000000000011",
          photos: [{ photoId: `00000000-0000-0000-0000-${i.toString().padStart(12, "0")}`, key: `photo${i}.jpg`, sortOrder: 0 }],
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
