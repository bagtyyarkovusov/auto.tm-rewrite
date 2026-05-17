import "reflect-metadata";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import supertest from "supertest";
import { PrismaService } from "@auto-tm/db";

import { CatalogModule } from "../catalog.module";
import { GlobalErrorFilter } from "../../../common/error.filter";

describe("CatalogController e2e", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CatalogModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
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
    await prisma.generation.deleteMany();
    await prisma.model.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.city.deleteMany();
    await prisma.region.deleteMany();
    await prisma.bodyType.deleteMany();
    await prisma.color.deleteMany();
  });

  describe("GET /api/v1/catalog/brands", () => {
    it("returns 200 with brand list sorted by locale", async () => {
      await prisma.brand.createMany({
        data: [
          {
            id: "b1",
            slug: "bmw",
            nameRu: "БМВ",
            nameTk: "BMW",
            nameEn: "BMW",
          },
          {
            id: "b2",
            slug: "audi",
            nameRu: "Ауди",
            nameTk: "Audi",
            nameEn: "Audi",
          },
        ],
      });

      const res = await request
        .get("/api/v1/catalog/brands?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].name).toBe("Ауди");
      expect(res.body.items[1].name).toBe("БМВ");
      expect(res.body.items[0]).toHaveProperty("slug");
      expect(res.body.items[0]).toHaveProperty("id");
      expect(res.body.hasMore).toBe(false);
    });

    it("falls back to another locale when requested locale is empty", async () => {
      await prisma.brand.create({
        data: {
          id: "b1",
          slug: "lada",
          nameRu: "Лада",
          nameTk: "",
          nameEn: "Lada",
        },
      });

      const res = await request
        .get("/api/v1/catalog/brands?locale=tk")
        .expect(200);

      expect(res.body.items[0].name).toBe("Lada");
      expect(res.body.items[0].localeFallback).toBe("en");
    });

    it("returns paginated results with cursor", async () => {
      await prisma.brand.createMany({
        data: [
          {
            id: "b1",
            slug: "audi",
            nameRu: "Ауди",
            nameTk: "Audi",
            nameEn: "Audi",
          },
          {
            id: "b2",
            slug: "bmw",
            nameRu: "БМВ",
            nameTk: "BMW",
            nameEn: "BMW",
          },
          {
            id: "b3",
            slug: "toyota",
            nameRu: "Тойота",
            nameTk: "Toýota",
            nameEn: "Toyota",
          },
        ],
      });

      const firstPage = await request
        .get("/api/v1/catalog/brands?locale=ru&limit=2")
        .expect(200);

      expect(firstPage.body.items).toHaveLength(2);
      expect(firstPage.body.hasMore).toBe(true);
      expect(firstPage.body.nextCursor).toBeTruthy();

      const secondPage = await request
        .get(`/api/v1/catalog/brands?locale=ru&limit=2&cursor=${firstPage.body.nextCursor}`)
        .expect(200);

      expect(secondPage.body.items).toHaveLength(1);
      expect(secondPage.body.hasMore).toBe(false);
    });
  });

  describe("GET /api/v1/catalog/brands/:id/models", () => {
    it("returns 200 with models for a brand", async () => {
      await prisma.brand.create({
        data: {
          id: "b1",
          slug: "toyota",
          nameRu: "Тойота",
          nameTk: "Toýota",
          nameEn: "Toyota",
        },
      });
      await prisma.model.createMany({
        data: [
          {
            id: "m1",
            brandId: "b1",
            slug: "camry",
            nameRu: "Камри",
            nameTk: "Kamri",
            nameEn: "Camry",
          },
          {
            id: "m2",
            brandId: "b1",
            slug: "corolla",
            nameRu: "Королла",
            nameTk: "Korolla",
            nameEn: "Corolla",
          },
        ],
      });

      const res = await request
        .get("/api/v1/catalog/brands/b1/models?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].name).toBe("Камри");
      expect(res.body.items[1].name).toBe("Королла");
      expect(res.body.items[0]).toHaveProperty("brandId", "b1");
    });

    it("returns empty list for brand with no models", async () => {
      await prisma.brand.create({
        data: {
          id: "b1",
          slug: "toyota",
          nameRu: "Тойота",
          nameTk: "Toýota",
          nameEn: "Toyota",
        },
      });

      const res = await request
        .get("/api/v1/catalog/brands/b1/models?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(0);
    });
  });

  describe("GET /api/v1/catalog/models/:id/generations", () => {
    it("returns 200 with generations for a model", async () => {
      await prisma.brand.create({
        data: {
          id: "b1",
          slug: "toyota",
          nameRu: "Тойота",
          nameTk: "Toýota",
          nameEn: "Toyota",
        },
      });
      await prisma.model.create({
        data: {
          id: "m1",
          brandId: "b1",
          slug: "camry",
          nameRu: "Камри",
          nameTk: "Kamri",
          nameEn: "Camry",
        },
      });
      await prisma.generation.createMany({
        data: [
          {
            id: "g1",
            modelId: "m1",
            nameRu: "XV70",
            nameTk: "XV70",
            nameEn: "XV70",
            yearStart: 2021,
            yearEnd: null,
          },
          {
            id: "g2",
            modelId: "m1",
            nameRu: "XV80",
            nameTk: "XV80",
            nameEn: "XV80",
            yearStart: 2025,
            yearEnd: null,
          },
        ],
      });

      const res = await request
        .get("/api/v1/catalog/models/m1/generations?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].name).toBe("XV70");
      expect(res.body.items[0].yearStart).toBe(2021);
      expect(res.body.items[1].name).toBe("XV80");
    });

    it("returns empty list for model with no generations", async () => {
      await prisma.brand.create({
        data: {
          id: "b1",
          slug: "toyota",
          nameRu: "Тойота",
          nameTk: "Toýota",
          nameEn: "Toyota",
        },
      });
      await prisma.model.create({
        data: {
          id: "m1",
          brandId: "b1",
          slug: "camry",
          nameRu: "Камри",
          nameTk: "Kamri",
          nameEn: "Camry",
        },
      });

      const res = await request
        .get("/api/v1/catalog/models/m1/generations?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(0);
    });
  });

  describe("GET /api/v1/catalog/regions", () => {
    it("returns 200 with region list sorted by locale", async () => {
      await prisma.region.createMany({
        data: [
          {
            id: "r1",
            slug: "balkan",
            nameRu: "Балкан",
            nameTk: "Balkan",
            nameEn: "Balkan",
          },
          {
            id: "r2",
            slug: "ashgabat",
            nameRu: "Ашхабад",
            nameTk: "Aşgabat",
            nameEn: "Ashgabat",
          },
        ],
      });

      const res = await request
        .get("/api/v1/catalog/regions?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].name).toBe("Ашхабад");
      expect(res.body.items[1].name).toBe("Балкан");
      expect(res.body.items[0]).toHaveProperty("slug");
      expect(res.body.items[0]).toHaveProperty("id");
    });

    it("falls back to another locale when requested locale is empty", async () => {
      await prisma.region.create({
        data: {
          id: "r1",
          slug: "ashgabat",
          nameRu: "Ашхабад",
          nameTk: "",
          nameEn: "Ashgabat",
        },
      });

      const res = await request
        .get("/api/v1/catalog/regions?locale=tk")
        .expect(200);

      expect(res.body.items[0].name).toBe("Ashgabat");
      expect(res.body.items[0].localeFallback).toBe("en");
    });
  });

  describe("GET /api/v1/catalog/regions/:id/cities", () => {
    it("returns 200 with cities for a region", async () => {
      await prisma.region.create({
        data: {
          id: "r1",
          slug: "ashgabat",
          nameRu: "Ашхабад",
          nameTk: "Aşgabat",
          nameEn: "Ashgabat",
        },
      });
      await prisma.city.createMany({
        data: [
          {
            id: "c1",
            regionId: "r1",
            slug: "ashgabat-city",
            nameRu: "Ашхабад",
            nameTk: "Aşgabat",
            nameEn: "Ashgabat",
          },
          {
            id: "c2",
            regionId: "r1",
            slug: "turkmenabad",
            nameRu: "Туркменабад",
            nameTk: "Türkmenabat",
            nameEn: "Turkmenabad",
          },
        ],
      });

      const res = await request
        .get("/api/v1/catalog/regions/r1/cities?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].name).toBe("Ашхабад");
      expect(res.body.items[1].name).toBe("Туркменабад");
      expect(res.body.items[0]).toHaveProperty("regionId", "r1");
    });

    it("returns empty list for region with no cities", async () => {
      await prisma.region.create({
        data: {
          id: "r1",
          slug: "ashgabat",
          nameRu: "Ашхабад",
          nameTk: "Aşgabat",
          nameEn: "Ashgabat",
        },
      });

      const res = await request
        .get("/api/v1/catalog/regions/r1/cities?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(0);
    });

    it("returns paginated results with cursor", async () => {
      await prisma.region.create({
        data: {
          id: "r1",
          slug: "ashgabat",
          nameRu: "Ашхабад",
          nameTk: "Aşgabat",
          nameEn: "Ashgabat",
        },
      });
      await prisma.city.createMany({
        data: [
          {
            id: "c1",
            regionId: "r1",
            slug: "a-city",
            nameRu: "А",
            nameTk: "A",
            nameEn: "A",
          },
          {
            id: "c2",
            regionId: "r1",
            slug: "b-city",
            nameRu: "Б",
            nameTk: "B",
            nameEn: "B",
          },
          {
            id: "c3",
            regionId: "r1",
            slug: "c-city",
            nameRu: "В",
            nameTk: "C",
            nameEn: "C",
          },
        ],
      });

      const firstPage = await request
        .get("/api/v1/catalog/regions/r1/cities?locale=ru&limit=2")
        .expect(200);

      expect(firstPage.body.items).toHaveLength(2);
      expect(firstPage.body.hasMore).toBe(true);
      expect(firstPage.body.nextCursor).toBeTruthy();

      const secondPage = await request
        .get(`/api/v1/catalog/regions/r1/cities?locale=ru&limit=2&cursor=${firstPage.body.nextCursor}`)
        .expect(200);

      expect(secondPage.body.items).toHaveLength(1);
      expect(secondPage.body.hasMore).toBe(false);
    });
  });

  describe("GET /api/v1/catalog/body-types", () => {
    it("returns 200 with body type list sorted by locale", async () => {
      await prisma.bodyType.createMany({
        data: [
          {
            id: "bt1",
            nameRu: "Седан",
            nameTk: "Sedan",
            nameEn: "Sedan",
          },
          {
            id: "bt2",
            nameRu: "Внедорожник",
            nameTk: "Jeep",
            nameEn: "SUV",
          },
        ],
      });

      const res = await request
        .get("/api/v1/catalog/body-types?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].name).toBe("Внедорожник");
      expect(res.body.items[1].name).toBe("Седан");
      expect(res.body.items[0]).toHaveProperty("id");
    });

    it("falls back to another locale when requested locale is empty", async () => {
      await prisma.bodyType.create({
        data: {
          id: "bt1",
          nameRu: "Седан",
          nameTk: "",
          nameEn: "Sedan",
        },
      });

      const res = await request
        .get("/api/v1/catalog/body-types?locale=tk")
        .expect(200);

      expect(res.body.items[0].name).toBe("Sedan");
      expect(res.body.items[0].localeFallback).toBe("en");
    });
  });

  describe("GET /api/v1/catalog/colors", () => {
    it("returns 200 with color list sorted by locale including hex", async () => {
      await prisma.color.createMany({
        data: [
          {
            id: "col1",
            nameRu: "Черный",
            nameTk: "Gara",
            nameEn: "Black",
            hex: "#000000",
          },
          {
            id: "col2",
            nameRu: "Белый",
            nameTk: "Ak",
            nameEn: "White",
            hex: "#FFFFFF",
          },
        ],
      });

      const res = await request
        .get("/api/v1/catalog/colors?locale=ru")
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].name).toBe("Белый");
      expect(res.body.items[1].name).toBe("Черный");
      expect(res.body.items[0].hex).toBe("#FFFFFF");
      expect(res.body.items[1].hex).toBe("#000000");
    });

    it("returns color without hex when hex is null", async () => {
      await prisma.color.create({
        data: {
          id: "col1",
          nameRu: "Металлик",
          nameTk: "Metal",
          nameEn: "Metallic",
          hex: null,
        },
      });

      const res = await request
        .get("/api/v1/catalog/colors?locale=ru")
        .expect(200);

      expect(res.body.items[0].name).toBe("Металлик");
      expect(res.body.items[0].hex).toBeUndefined();
    });

    it("falls back to another locale when requested locale is empty", async () => {
      await prisma.color.create({
        data: {
          id: "col1",
          nameRu: "Черный",
          nameTk: "",
          nameEn: "Black",
          hex: "#000000",
        },
      });

      const res = await request
        .get("/api/v1/catalog/colors?locale=tk")
        .expect(200);

      expect(res.body.items[0].name).toBe("Black");
      expect(res.body.items[0].localeFallback).toBe("en");
    });
  });
});
