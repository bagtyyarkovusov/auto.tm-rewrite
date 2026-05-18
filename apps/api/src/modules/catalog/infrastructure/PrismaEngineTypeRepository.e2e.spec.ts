import { execSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { PrismaService } from "@auto-tm/db";

import { PrismaEngineTypeRepository } from "./PrismaEngineTypeRepository";

describe("PrismaEngineTypeRepository — Testcontainers", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repo: PrismaEngineTypeRepository;

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
    repo = new PrismaEngineTypeRepository(prisma);
  }, 120_000);

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await container.stop();
  });

  beforeEach(async () => {
    await prisma.engineType.deleteMany();
  });

  it("returns engine types ordered alphabetically by locale-specific name", async () => {
    await prisma.engineType.createMany({
      data: [
        { id: "et1", nameRu: "Дизель", nameTk: "Dizel", nameEn: "Diesel" },
        { id: "et2", nameRu: "Бензин", nameTk: "Benzin", nameEn: "Gasoline" },
        { id: "et3", nameRu: "Гибрид", nameTk: "Gibrid", nameEn: "Hybrid" },
      ],
    });

    const result = await repo.listEngineTypes({ locale: "ru" });

    expect(result.map((et) => et.nameRu)).toEqual([
      "Бензин",
      "Гибрид",
      "Дизель",
    ]);
  });

  it("orders by English name when locale is en", async () => {
    await prisma.engineType.createMany({
      data: [
        { id: "et1", nameRu: "Дизель", nameTk: "Dizel", nameEn: "Diesel" },
        { id: "et2", nameRu: "Бензин", nameTk: "Benzin", nameEn: "Gasoline" },
      ],
    });

    const result = await repo.listEngineTypes({ locale: "en" });

    expect(result.map((et) => et.nameEn)).toEqual(["Diesel", "Gasoline"]);
  });

  it("returns an engine type by id", async () => {
    await prisma.engineType.create({
      data: {
        id: "et1",
        nameRu: "Бензин",
        nameTk: "Benzin",
        nameEn: "Gasoline",
      },
    });

    const engineType = await repo.getEngineTypeById("et1");
    expect(engineType).not.toBeNull();
    expect(engineType?.nameRu).toBe("Бензин");
  });

  it("returns null for non-existent engine type id", async () => {
    const engineType = await repo.getEngineTypeById("non-existent");
    expect(engineType).toBeNull();
  });
});
