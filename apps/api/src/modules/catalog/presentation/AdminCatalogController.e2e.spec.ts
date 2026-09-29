import "reflect-metadata";
import { randomUUID } from "node:crypto";

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
import sharp from "sharp";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaService } from "@auto-tm/db";

import { CatalogModule } from "../catalog.module";
import { IdentityModule } from "../../identity/identity.module";
import { GlobalErrorFilter } from "../../../common/error.filter";
import { EnvSchema } from "../../../env.schema";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { mintAdminJwt } from "../../../../test/helpers/mintAdminJwt";

describe("AdminCatalogController e2e", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: (cfg) => EnvSchema.parse(cfg),
        }),
        CatalogModule,
        IdentityModule,
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
    await app.close();
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.totpBackupCode.deleteMany();
    await prisma.totpEnrollment.deleteMany();
    await prisma.session.deleteMany();
    await prisma.listingMedia.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.model.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.user.deleteMany();
  });

  async function createAdminUser(): Promise<{ userId: string; token: string }> {
    const user = await prisma.user.create({
      data: {
        id: `admin-${Date.now()}`,
        phone: "+99361111111",
        phoneVerifiedAt: new Date(),
        role: "admin",
      },
    });
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        adminTotpExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    });
    return { userId: user.id, token: mintAdminJwt(user.id, session.id) };
  }

  async function createNonAdminUser(): Promise<{ userId: string; token: string }> {
    const user = await prisma.user.create({
      data: {
        id: `user-${Date.now()}`,
        phone: "+99362222222",
        phoneVerifiedAt: new Date(),
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

  describe("brand logo endpoints", () => {
    const s3 = new S3Client({
      endpoint: process.env["MINIO_ENDPOINT"] ?? "http://localhost:9000",
      region: process.env["MINIO_REGION"] ?? "us-east-1",
      credentials: {
        accessKeyId: process.env["MINIO_ACCESS_KEY"] ?? "minioadmin",
        secretAccessKey: process.env["MINIO_SECRET_KEY"] ?? "minioadmin",
      },
      forcePathStyle: true,
    });

    async function objectExists(key: string): Promise<boolean> {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: "catalog-assets", Key: key }));
        return true;
      } catch {
        return false;
      }
    }

    async function png(width: number, height: number): Promise<string> {
      const bytes = await sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
      })
        .png()
        .toBuffer();
      return bytes.toString("base64");
    }

    async function upload(brandId: string, token: string, contentType: string, dataBase64: string) {
      return request
        .put(`/api/v1/admin/catalog/brands/${brandId}/logo`)
        .set("Authorization", `Bearer ${token}`)
        .send({ contentType, dataBase64 });
    }

    it("returns 401 without bearer token and 403 for a non-admin", async () => {
      const brand = await createBrand();
      await request
        .put(`/api/v1/admin/catalog/brands/${brand.id}/logo`)
        .send({ contentType: "image/png", dataBase64: await png(90, 90) })
        .expect(401);

      const { token } = await createNonAdminUser();
      const put = await upload(brand.id, token, "image/png", await png(90, 90));
      expect(put.status).toBe(403);
      await request
        .delete(`/api/v1/admin/catalog/brands/${brand.id}/logo`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("uploads, replaces, and removes a logo without leaving orphan objects", async () => {
      const brand = await createBrand();
      const { token } = await createAdminUser();

      const first = await upload(brand.id, token, "image/png", await png(90, 90));
      expect(first.status).toBe(200);
      const firstKey = (await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } })).logoKey;
      expect(firstKey).toMatch(new RegExp(`^brands/${brand.slug}/v\\d+/logo\\.png$`));
      expect(first.body.logoUrl).toMatch(new RegExp(`/catalog-assets/${firstKey}$`));
      expect(await objectExists(firstKey as string)).toBe(true);

      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">' +
        '<defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs>' +
        '<path fill="url(#g)" d="M0 0h24v24H0z"/></svg>';
      const second = await upload(
        brand.id,
        token,
        "image/svg+xml",
        Buffer.from(svg).toString("base64"),
      );
      expect(second.status).toBe(200);
      const secondKey = (await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } }))
        .logoKey;
      expect(secondKey).toMatch(/\/logo\.svg$/);
      expect(secondKey).not.toBe(firstKey);
      expect(await objectExists(secondKey as string)).toBe(true);
      expect(await objectExists(firstKey as string)).toBe(false);
      expect(unwrapAuditLog(await getAuditLog("CATALOG_BRAND_LOGO_SET")).targetId).toBe(brand.id);

      await request
        .delete(`/api/v1/admin/catalog/brands/${brand.id}/logo`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      const cleared = await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } });
      expect(cleared.logoKey).toBeNull();
      expect(await objectExists(secondKey as string)).toBe(false);
      expect(unwrapAuditLog(await getAuditLog("CATALOG_BRAND_LOGO_REMOVE")).targetId).toBe(
        brand.id,
      );
    });

    it("rejects too large, unsupported, mismatched, non-square, and unsafe files", async () => {
      const brand = await createBrand();
      const { token } = await createAdminUser();

      const cases: Array<[string, string, string]> = [
        ["image/png", Buffer.alloc(200 * 1024 + 1, 1).toString("base64"), "LOGO_TOO_LARGE"],
        ["image/jpeg", await png(90, 90), "LOGO_UNSUPPORTED_TYPE"],
        ["image/webp", await png(90, 90), "LOGO_TYPE_MISMATCH"],
        ["image/png", await png(200, 90), "LOGO_NOT_SQUARE"],
        ["image/png", Buffer.from("not an image").toString("base64"), "LOGO_UNREADABLE"],
        [
          "image/svg+xml",
          Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><script>alert(1)</script></svg>',
          ).toString("base64"),
          "LOGO_UNSAFE_SVG",
        ],
      ];

      for (const [contentType, data, reason] of cases) {
        const res = await upload(brand.id, token, contentType, data);
        expect(res.status, reason).toBe(400);
        expect(res.body.code).toBe("VALIDATION_FAILED");
        expect(res.body.details).toEqual({ reason });
        expect(res.body.message.length).toBeGreaterThan(0);
      }

      const unchanged = await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } });
      expect(unchanged.logoKey).toBeNull();
    });

    it("returns 404 for an unknown brand", async () => {
      const { token } = await createAdminUser();
      const res = await upload(randomUUID(), token, "image/png", await png(90, 90));
      expect(res.status).toBe(404);
    });
  });
});
