import { execSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { PrismaService } from "@auto-tm/db";

import { PrismaBrandRepository } from "./PrismaBrandRepository";

describe("PrismaBrandRepository — Testcontainers", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repo: PrismaBrandRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withUsername("auto_tm")
      .withPassword("auto_tm_pass")
      .withDatabase("auto_tm_test")
      .start();

    const dbUrl = container.getConnectionUri();
    const dbPackagePath = resolve(__dirname, "../../../../../../packages/db");

    execSync("pnpm prisma migrate deploy", {
      cwd: dbPackagePath,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "pipe",
    });

    process.env["DATABASE_URL"] = dbUrl;
    prisma = new PrismaService();
    repo = new PrismaBrandRepository(prisma);
  }, 120_000);

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await container.stop();
  });

  beforeEach(async () => {
    await prisma.brand.deleteMany();
  });

  it("returns brands ordered alphabetically by locale-specific name", async () => {
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
        {
          id: "b3",
          slug: "toyota",
          nameRu: "Тойота",
          nameTk: "Toýota",
          nameEn: "Toyota",
        },
      ],
    });

    const result = await repo.listBrands({ locale: "ru" });

    expect(result.items.map((b) => b.nameRu)).toEqual([
      "Ауди",
      "БМВ",
      "Тойота",
    ]);
  });

  it("orders by English name when locale is en", async () => {
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

    const result = await repo.listBrands({ locale: "en" });

    expect(result.items.map((b) => b.nameEn)).toEqual(["Audi", "BMW"]);
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

    const firstPage = await repo.listBrands({ locale: "ru", limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).toBeDefined();

    const secondPage = await repo.listBrands({
      locale: "ru",
      limit: 2,
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.nextCursor).toBeUndefined();
  });

  it("returns a brand by id", async () => {
    await prisma.brand.create({
      data: {
        id: "b1",
        slug: "toyota",
        nameRu: "Тойота",
        nameTk: "Toýota",
        nameEn: "Toyota",
      },
    });

    const brand = await repo.getBrandById("b1");
    expect(brand).not.toBeNull();
    expect(brand!.slug).toBe("toyota");
  });

  it("returns null for non-existent brand id", async () => {
    const brand = await repo.getBrandById("non-existent");
    expect(brand).toBeNull();
  });
});
