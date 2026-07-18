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
import { testUserId } from "../../../../test/helpers/testUserId";
import { LISTING_EVENT_PUBLISHER } from "../domain/ports/ListingEventPublisher";

describe("FavoritesController e2e", () => {
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
    await prisma.favorite.deleteMany();
    await prisma.listingMedia.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.listingDraft.deleteMany();
    await prisma.user.deleteMany();
    await prisma.city.deleteMany();
    await prisma.region.deleteMany();
    await prisma.model.deleteMany();
    await prisma.brand.deleteMany();
  });

  async function createUser(alias: Parameters<typeof testUserId>[0]): Promise<string> {
    const userId = testUserId(alias);
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

  async function seedDraft(alias: Parameters<typeof testUserId>[0], payload: Record<string, unknown>) {
    const draft = await prisma.listingDraft.create({
      data: { userId: testUserId(alias), payload: payload as Prisma.InputJsonValue },
    });
    return draft;
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

  describe("POST /api/v1/listings/:id/favorite", () => {
    it("returns 401 without bearer token", async () => {
      await request
        .post("/api/v1/listings/listing-id/favorite")
        .send({})
        .expect(401);
    });

    it("favorites an active listing", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const res = await request
        .post(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(201);

      expect(res.body.listingId).toBe(listingId);
      expect(res.body.userId).toBe(testUserId("buyer-1"));

      const favRow = await prisma.favorite.findFirst({
        where: { userId: testUserId("buyer-1"), listingId },
      });
      expect(favRow).not.toBeNull();

      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      expect(listing?.favoriteCount).toBe(1);
    });

    it("is idempotent — second favorite returns same row", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const first = await request
        .post(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(201);

      const second = await request
        .post(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(201);

      expect(second.body.id).toBe(first.body.id);

      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      expect(listing?.favoriteCount).toBe(1);
    });

    it("returns 404 for non-existent listing", async () => {
      const buyerToken = await createUser("buyer-1");

      await request
        .post("/api/v1/listings/non-existent-id/favorite")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(404);
    });

    it("returns 404 for soft-deleted listing", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .delete(`/api/v1/listings/${listingId}`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(200);

      await request
        .post(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(404);
    });

    it("returns 404 for banned listing", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const adminToken = await createUser("admin-1");
      await prisma.user.update({ where: { id: testUserId("admin-1") }, data: { role: "admin" } });
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .post(`/api/v1/admin/moderation/listings/${listingId}/ban`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Test ban" })
        .expect(200);

      await request
        .post(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(404);
    });
  });

  describe("DELETE /api/v1/listings/:id/favorite", () => {
    it("returns 401 without bearer token", async () => {
      await request
        .delete("/api/v1/listings/listing-id/favorite")
        .expect(401);
    });

    it("unfavorites a listing", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .post(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(201);

      const res = await request
        .delete(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const favRow = await prisma.favorite.findFirst({
        where: { userId: testUserId("buyer-1"), listingId },
      });
      expect(favRow).toBeNull();

      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      expect(listing?.favoriteCount).toBe(0);
    });

    it("is idempotent — unfavorite non-existing returns success", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      const res = await request
        .delete(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/v1/favorites", () => {
    it("returns 401 without bearer token", async () => {
      await request
        .get("/api/v1/favorites")
        .expect(401);
    });

    it("returns favorited listings", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .post(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(201);

      const res = await request
        .get("/api/v1/favorites")
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(listingId);
      expect(res.body.nextCursor).toBeNull();
    });

    it("excludes banned listings from favorites list", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");
      const adminToken = await createUser("admin-1");
      await prisma.user.update({ where: { id: testUserId("admin-1") }, data: { role: "admin" } });
      const draft = await seedDraft("seller-1", validPayload);

      const publishRes = await request
        .post(`/api/v1/listings/drafts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({})
        .expect(201);
      const listingId = publishRes.body.id;

      await request
        .post(`/api/v1/listings/${listingId}/favorite`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({})
        .expect(201);

      // Ban the listing
      await request
        .post(`/api/v1/admin/moderation/listings/${listingId}/ban`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Test ban" })
        .expect(200);

      const res = await request
        .get("/api/v1/favorites")
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
    });

    it("paginates favorites with cursor", async () => {
      await seedCatalog();
      const sellerToken = await createUser("seller-1");
      const buyerToken = await createUser("buyer-1");

      // Publish 3 listings
      const listingIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const draft = await seedDraft("seller-1", {
          ...validPayload,
          photos: [{ photoId: `00000000-0000-0000-0000-${i.toString().padStart(12, "0")}`, key: `photo${i}.jpg`, sortOrder: 0 }],
        });
        const publishRes = await request
          .post(`/api/v1/listings/drafts/${draft.id}/publish`)
          .set("Authorization", `Bearer ${sellerToken}`)
          .send({})
          .expect(201);
        listingIds.push(publishRes.body.id);
      }

      // Favorite all 3
      for (const listingId of listingIds) {
        await request
          .post(`/api/v1/listings/${listingId}/favorite`)
          .set("Authorization", `Bearer ${buyerToken}`)
          .send({})
          .expect(201);
      }

      // Page with limit=2
      const page1 = await request
        .get("/api/v1/favorites")
        .set("Authorization", `Bearer ${buyerToken}`)
        .query({ limit: 2 })
        .expect(200);

      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.nextCursor).not.toBeNull();

      const page2 = await request
        .get("/api/v1/favorites")
        .set("Authorization", `Bearer ${buyerToken}`)
        .query({ limit: 2, cursor: page1.body.nextCursor })
        .expect(200);

      expect(page2.body.items).toHaveLength(1);
      expect(page2.body.nextCursor).toBeNull();
    });
  });
});
