import "reflect-metadata";
import { randomUUID } from "node:crypto";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import supertest from "supertest";
import { PrismaService } from "@auto-tm/db";

import { CatalogModule } from "../catalog.module";
import { IdentityModule } from "../../identity/identity.module";
import { GlobalErrorFilter } from "../../../common/error.filter";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { mintAdminJwt } from "../../../../test/helpers/mintAdminJwt";

describe("AdminCatalogController e2e", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CatalogModule, IdentityModule],
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
    await app.close();
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.model.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.user.deleteMany();
  });

  async function createAdminUser(): Promise<{ userId: string; token: string }> {
    const user = await prisma.user.create({
      data: {
        id: `admin-${Date.now()}`,
        phone: "+99361111111",
        role: "admin",
      },
    });
    return { userId: user.id, token: mintAdminJwt(user.id) };
  }

  async function createNonAdminUser(): Promise<{ userId: string; token: string }> {
    const user = await prisma.user.create({
      data: {
        id: `user-${Date.now()}`,
        phone: "+99362222222",
        role: "buyer",
      },
    });
    const { sign } = await import("jsonwebtoken");
    const nonAdminToken = sign(
      { sub: user.id, role: "buyer" },
      process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
      { expiresIn: "1h" },
    );
    return { userId: user.id, token: nonAdminToken };
  }

  async function createBrand() {
    return prisma.brand.create({
      data: {
        id: randomUUID(),
        slug: `slug-${Date.now()}`,
        nameRu: "Тест",
        nameTk: "Test",
        nameEn: "Test",
      },
    });
  }

  async function createModel(brandId: string) {
    return prisma.model.create({
      data: {
        id: randomUUID(),
        brandId,
        slug: `model-slug-${Date.now()}`,
        nameRu: "Модель",
        nameTk: "Model",
        nameEn: "Model",
      },
    });
  }

  async function getAuditLog(action: string) {
    return prisma.auditLog.findFirst({
      where: { action },
      orderBy: { createdAt: "desc" },
    });
  }

  function unwrapAuditLog<T>(auditLog: T | null): T {
    expect(auditLog).not.toBeNull();
    return auditLog as T;
  }

  describe("POST /api/v1/admin/catalog/brands", () => {
    it("returns 401 without bearer token", async () => {
      await request
        .post("/api/v1/admin/catalog/brands")
        .send({ slug: "toyota", nameRu: "Тойота", nameTk: "Toýota", nameEn: "Toyota" })
        .expect(401);
    });

    it("returns 403 with non-admin token", async () => {
      const { token } = await createNonAdminUser();
      await request
        .post("/api/v1/admin/catalog/brands")
        .set("Authorization", `Bearer ${token}`)
        .send({ slug: "toyota", nameRu: "Тойота", nameTk: "Toýota", nameEn: "Toyota" })
        .expect(403);
    });

    it("returns 201 with admin token and writes audit log", async () => {
      const { token } = await createAdminUser();
      const res = await request
        .post("/api/v1/admin/catalog/brands")
        .set("Authorization", `Bearer ${token}`)
        .send({ slug: "toyota", nameRu: "Тойота", nameTk: "Toýota", nameEn: "Toyota" })
        .expect(201);

      expect(res.body.slug).toBe("toyota");
      expect(res.body.nameRu).toBe("Тойота");

      const audit = await getAuditLog("CATALOG_BRAND_CREATE");
      expect(audit).not.toBeNull();
      expect(unwrapAuditLog(audit).targetType).toBe("Brand");
      expect(unwrapAuditLog(audit).targetId).toBe(res.body.id);
    });
  });

  describe("PATCH /api/v1/admin/catalog/brands/:id", () => {
    it("returns 401 without bearer token", async () => {
      const brand = await createBrand();
      await request
        .patch(`/api/v1/admin/catalog/brands/${brand.id}`)
        .send({ nameRu: "New" })
        .expect(401);
    });

    it("returns 403 with non-admin token", async () => {
      const brand = await createBrand();
      const { token } = await createNonAdminUser();
      await request
        .patch(`/api/v1/admin/catalog/brands/${brand.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ nameRu: "New" })
        .expect(403);
    });

    it("returns 200 with admin token and writes audit log", async () => {
      const brand = await createBrand();
      const { token } = await createAdminUser();
      const res = await request
        .patch(`/api/v1/admin/catalog/brands/${brand.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ nameRu: "Обновлено" })
        .expect(200);

      expect(res.body.nameRu).toBe("Обновлено");

      const audit = await getAuditLog("CATALOG_BRAND_UPDATE");
      expect(audit).not.toBeNull();
      expect(unwrapAuditLog(audit).targetId).toBe(brand.id);
    });
  });

  describe("DELETE /api/v1/admin/catalog/brands/:id", () => {
    it("returns 401 without bearer token", async () => {
      const brand = await createBrand();
      await request
        .delete(`/api/v1/admin/catalog/brands/${brand.id}`)
        .expect(401);
    });

    it("returns 403 with non-admin token", async () => {
      const brand = await createBrand();
      const { token } = await createNonAdminUser();
      await request
        .delete(`/api/v1/admin/catalog/brands/${brand.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("returns 200 with admin token and writes audit log", async () => {
      const brand = await createBrand();
      const { token } = await createAdminUser();
      await request
        .delete(`/api/v1/admin/catalog/brands/${brand.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const deleted = await prisma.brand.findUnique({ where: { id: brand.id } });
      expect(deleted).toBeNull();

      const audit = await getAuditLog("CATALOG_BRAND_DELETE");
      expect(audit).not.toBeNull();
      expect(unwrapAuditLog(audit).targetId).toBe(brand.id);
    });
  });

  describe("POST /api/v1/admin/catalog/brands/:brandId/models", () => {
    it("returns 401 without bearer token", async () => {
      const brand = await createBrand();
      await request
        .post(`/api/v1/admin/catalog/brands/${brand.id}/models`)
        .send({ slug: "camry", nameRu: "Камри", nameTk: "Kamri", nameEn: "Camry" })
        .expect(401);
    });

    it("returns 403 with non-admin token", async () => {
      const brand = await createBrand();
      const { token } = await createNonAdminUser();
      await request
        .post(`/api/v1/admin/catalog/brands/${brand.id}/models`)
        .set("Authorization", `Bearer ${token}`)
        .send({ slug: "camry", nameRu: "Камри", nameTk: "Kamri", nameEn: "Camry" })
        .expect(403);
    });

    it("returns 201 with admin token and writes audit log", async () => {
      const brand = await createBrand();
      const { token } = await createAdminUser();
      const res = await request
        .post(`/api/v1/admin/catalog/brands/${brand.id}/models`)
        .set("Authorization", `Bearer ${token}`)
        .send({ slug: "camry", nameRu: "Камри", nameTk: "Kamri", nameEn: "Camry" })
        .expect(201);

      expect(res.body.slug).toBe("camry");
      expect(res.body.brandId).toBe(brand.id);

      const audit = await getAuditLog("CATALOG_MODEL_CREATE");
      expect(audit).not.toBeNull();
      expect(unwrapAuditLog(audit).targetId).toBe(res.body.id);
    });
  });

  describe("PATCH /api/v1/admin/catalog/models/:id", () => {
    it("returns 401 without bearer token", async () => {
      const brand = await createBrand();
      const model = await createModel(brand.id);
      await request
        .patch(`/api/v1/admin/catalog/models/${model.id}`)
        .send({ nameRu: "New" })
        .expect(401);
    });

    it("returns 403 with non-admin token", async () => {
      const brand = await createBrand();
      const model = await createModel(brand.id);
      const { token } = await createNonAdminUser();
      await request
        .patch(`/api/v1/admin/catalog/models/${model.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ nameRu: "New" })
        .expect(403);
    });

    it("returns 200 with admin token and writes audit log", async () => {
      const brand = await createBrand();
      const model = await createModel(brand.id);
      const { token } = await createAdminUser();
      const res = await request
        .patch(`/api/v1/admin/catalog/models/${model.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ nameRu: "Обновлено" })
        .expect(200);

      expect(res.body.nameRu).toBe("Обновлено");

      const audit = await getAuditLog("CATALOG_MODEL_UPDATE");
      expect(audit).not.toBeNull();
      expect(unwrapAuditLog(audit).targetId).toBe(model.id);
    });
  });

  describe("DELETE /api/v1/admin/catalog/models/:id", () => {
    it("returns 401 without bearer token", async () => {
      const brand = await createBrand();
      const model = await createModel(brand.id);
      await request
        .delete(`/api/v1/admin/catalog/models/${model.id}`)
        .expect(401);
    });

    it("returns 403 with non-admin token", async () => {
      const brand = await createBrand();
      const model = await createModel(brand.id);
      const { token } = await createNonAdminUser();
      await request
        .delete(`/api/v1/admin/catalog/models/${model.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("returns 200 with admin token and writes audit log", async () => {
      const brand = await createBrand();
      const model = await createModel(brand.id);
      const { token } = await createAdminUser();
      await request
        .delete(`/api/v1/admin/catalog/models/${model.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const deleted = await prisma.model.findUnique({ where: { id: model.id } });
      expect(deleted).toBeNull();

      const audit = await getAuditLog("CATALOG_MODEL_DELETE");
      expect(audit).not.toBeNull();
      expect(unwrapAuditLog(audit).targetId).toBe(model.id);
    });
  });
});
