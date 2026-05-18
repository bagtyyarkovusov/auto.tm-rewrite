import "reflect-metadata";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
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
    condition: "used",
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
});
