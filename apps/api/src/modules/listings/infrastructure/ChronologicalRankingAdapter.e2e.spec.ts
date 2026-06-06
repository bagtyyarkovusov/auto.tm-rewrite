import { execSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { PrismaService } from "@auto-tm/db";

import { ChronologicalRankingAdapter } from "./ChronologicalRankingAdapter";
import { PrismaExchangeRateRepository } from "./PrismaExchangeRateRepository";
import type { Currency } from "../domain/types";

describe("ChronologicalRankingAdapter — Testcontainers", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let adapter: ChronologicalRankingAdapter;

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
    const exchangeRates = new PrismaExchangeRateRepository(prisma);
    adapter = new ChronologicalRankingAdapter(prisma, exchangeRates);
  }, 120_000);

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await container.stop();
  });

  beforeEach(async () => {
    await prisma.listingMedia.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.exchangeRate.deleteMany();
    await prisma.model.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.city.deleteMany();
    await prisma.region.deleteMany();
    await prisma.user.deleteMany();
  });

  async function seedRegion(id: string): Promise<void> {
    await prisma.region.create({
      data: { id, slug: id, nameRu: id, nameTk: id, nameEn: id },
    });
  }

  async function seedCity(id: string, regionId: string): Promise<void> {
    await prisma.city.create({
      data: { id, regionId, slug: id, nameRu: id, nameTk: id, nameEn: id },
    });
  }

  async function seedBrand(id: string): Promise<void> {
    await prisma.brand.create({
      data: { id, slug: id, nameRu: id, nameTk: id, nameEn: id },
    });
  }

  async function seedModel(id: string, brandId: string): Promise<void> {
    await prisma.model.create({
      data: { id, brandId, slug: id, nameRu: id, nameTk: id, nameEn: id },
    });
  }

  async function seedUser(id: string): Promise<void> {
    await prisma.user.create({
      data: { id, phone: `+9936${id.slice(-8)}`, role: "buyer" },
    });
  }

  async function seedExchangeRate(
    from: Currency,
    to: Currency,
    rate: number,
  ): Promise<void> {
    await prisma.exchangeRate.create({
      data: { fromCurrency: from, toCurrency: to, rate, updatedAt: new Date() },
    });
  }

  async function seedListing(data: {
    id: string;
    sellerId: string;
    brandId: string;
    modelId: string;
    cityId: string;
    priceAmount: number;
    priceCurrency: Currency;
    year?: number;
    condition?: "new" | "used";
    publishedAt: Date;
    status?: "active" | "sold";
    soldAt?: Date;
  }): Promise<void> {
    await prisma.listing.create({
      data: {
        ...data,
        status: data.status ?? "active",
        allowCalls: true,
        allowChat: true,
        acceptsExchange: false,
        installmentAvailable: false,
      },
    });
  }

  async function seedBaseCatalog(): Promise<{
    regionId: string;
    cityA: string;
    cityB: string;
    brandX: string;
    brandY: string;
    modelX: string;
    modelY: string;
    seller: string;
  }> {
    const regionId = "region-1";
    const cityA = "city-a";
    const cityB = "city-b";
    const brandX = "brand-x";
    const brandY = "brand-y";
    const modelX = "model-x";
    const modelY = "model-y";
    const seller = "seller-1";

    await seedRegion(regionId);
    await seedCity(cityA, regionId);
    await seedCity(cityB, regionId);
    await seedBrand(brandX);
    await seedBrand(brandY);
    await seedModel(modelX, brandX);
    await seedModel(modelY, brandY);
    await seedUser(seller);

    return { regionId, cityA, cityB, brandX, brandY, modelX, modelY, seller };
  }

  it("returns all active listings when no filters applied", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({ limit: 10 });
    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => i.id)).toEqual(["l1", "l2"]);
    expect(result.nextCursor).toBeUndefined();
  });

  it("filters by brandId", async () => {
    const { cityA, brandX, brandY, modelX, modelY, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandY,
      modelId: modelY,
      cityId: cityA,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({ limit: 10, filters: { brandId: brandX } });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });

  it("filters by modelId", async () => {
    const { cityA, brandX, modelX, modelY, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelY,
      cityId: cityA,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({ limit: 10, filters: { modelId: modelX } });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });

  it("filters by cityId", async () => {
    const { cityA, cityB, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityB,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({ limit: 10, filters: { cityId: cityA } });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });

  it("filters by condition", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      condition: "new",
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      condition: "used",
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({ limit: 10, filters: { condition: "new" } });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });

  it("filters by year range", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      year: 2020,
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      year: 2015,
      publishedAt: new Date(now.getTime() - 1000),
    });
    await seedListing({
      id: "l3",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 300_000,
      priceCurrency: "TMT",
      year: 2023,
      publishedAt: new Date(now.getTime() - 2000),
    });

    const result = await adapter.rank({
      limit: 10,
      filters: { yearMin: 2019, yearMax: 2022 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });

  it("filters by price range across multiple currencies using FX conversion", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    await seedExchangeRate("USD", "TMT", 3.5);
    await seedExchangeRate("AED", "TMT", 0.95);

    const now = new Date();
    // TMT listing: 100k TMT → display 100k TMT
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      publishedAt: now,
    });
    // USD listing: 30k USD → display 105k TMT (outside 50k-100k range)
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 30_000,
      priceCurrency: "USD",
      publishedAt: new Date(now.getTime() - 1000),
    });
    // AED listing: 100k AED → display 95k TMT (inside 50k-100k range)
    await seedListing({
      id: "l3",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "AED",
      publishedAt: new Date(now.getTime() - 2000),
    });

    const result = await adapter.rank({
      limit: 10,
      filters: { priceMin: 50_000, priceMax: 100_000 },
    });
    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => i.id)).toEqual(["l1", "l3"]);
  });

  it("includes 14-day sold listings and respects filters on them", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    const twelveDaysAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      status: "sold",
      soldAt: twelveDaysAgo,
      publishedAt: twelveDaysAgo,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      status: "sold",
      soldAt: twentyDaysAgo,
      publishedAt: twentyDaysAgo,
    });

    const result = await adapter.rank({ limit: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });

  it("paginates with cursor and remains stable across same-second creates with filters", async () => {
    const { cityA, brandX, brandY, modelX, modelY, seller } = await seedBaseCatalog();

    const sameSecond = new Date();
    // Create 5 listings in same second, alternating brands
    for (let i = 0; i < 5; i++) {
      await seedListing({
        id: `l${i + 1}`,
        sellerId: seller,
        brandId: i % 2 === 0 ? brandX : brandY,
        modelId: i % 2 === 0 ? modelX : modelY,
        cityId: cityA,
        priceAmount: 100_000,
        priceCurrency: "TMT",
        publishedAt: sameSecond,
      });
    }

    const all = [];
    let cursor: { timestamp: string; id: string } | undefined;

    do {
      const page = await adapter.rank({
        limit: 1,
        filters: { brandId: brandX },
        ...(cursor ? { cursor } : {}),
      });
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    expect(all).toHaveLength(3); // l1, l3, l5
    expect(all.map((i) => i.id)).toEqual(["l1", "l3", "l5"]);
  });

  it("returns no results when filter matches nothing", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      publishedAt: now,
    });

    const result = await adapter.rank({
      limit: 10,
      filters: { brandId: "non-existent-brand-id" },
    });
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeUndefined();
  });

  it("combines multiple filters correctly", async () => {
    const { cityA, cityB, brandX, brandY, modelX, modelY, seller } =
      await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      year: 2020,
      condition: "new",
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      year: 2020,
      condition: "used",
      publishedAt: new Date(now.getTime() - 1000),
    });
    await seedListing({
      id: "l3",
      sellerId: seller,
      brandId: brandY,
      modelId: modelY,
      cityId: cityB,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      year: 2020,
      condition: "new",
      publishedAt: new Date(now.getTime() - 2000),
    });

    const result = await adapter.rank({
      limit: 10,
      filters: {
        brandId: brandX,
        cityId: cityA,
        yearMin: 2019,
        yearMax: 2021,
        condition: "new",
      },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });

  it("filters by yearMin only", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      year: 2020,
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      year: 2015,
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({
      limit: 10,
      filters: { yearMin: 2019 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });

  it("filters by yearMax only", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      year: 2020,
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 200_000,
      priceCurrency: "TMT",
      year: 2015,
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({
      limit: 10,
      filters: { yearMax: 2018 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l2");
  });

  it("filters by priceMin only", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 40_000,
      priceCurrency: "TMT",
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({
      limit: 10,
      filters: { priceMin: 50_000 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });

  it("filters by priceMax only", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 100_000,
      priceCurrency: "TMT",
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 40_000,
      priceCurrency: "TMT",
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({
      limit: 10,
      filters: { priceMax: 50_000 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l2");
  });

  it("excludes listings in currencies with missing FX rates when price filter is applied", async () => {
    const { cityA, brandX, modelX, seller } = await seedBaseCatalog();

    // Only seed TMT rate; USD rate is intentionally missing
    await seedExchangeRate("TMT", "TMT", 1);

    const now = new Date();
    await seedListing({
      id: "l1",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 80_000,
      priceCurrency: "TMT",
      publishedAt: now,
    });
    await seedListing({
      id: "l2",
      sellerId: seller,
      brandId: brandX,
      modelId: modelX,
      cityId: cityA,
      priceAmount: 20_000,
      priceCurrency: "USD",
      publishedAt: new Date(now.getTime() - 1000),
    });

    const result = await adapter.rank({
      limit: 10,
      filters: { priceMin: 50_000, priceMax: 100_000 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("l1");
  });
});
