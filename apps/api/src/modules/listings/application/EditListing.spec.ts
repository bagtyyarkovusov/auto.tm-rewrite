import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, BadRequestException } from "@nestjs/common";

import { Listing } from "../domain/Listing";
import type { ListingRepository } from "../domain/ports/ListingRepository";
import type { ListingEventPublisher } from "../domain/ports/ListingEventPublisher";
import type { ExchangeRatePort } from "../domain/ports/ExchangeRatePort";
import { ListingsSchemas } from "@auto-tm/contracts";

import { EditListing } from "./EditListing";

class FakeListingRepository implements ListingRepository {
  listings: Listing[] = [];

  async save(listing: Listing): Promise<Listing> {
    this.listings.push(listing);
    return listing;
  }

  async findById(id: string): Promise<Listing | null> {
    return this.listings.find((l) => l.id === id) ?? null;
  }

  async findBySellerId(
    _sellerId: string,
    _opts?: { cursor?: { timestamp: string; id: string }; limit?: number },
  ): Promise<{ items: Listing[]; nextCursor?: { timestamp: string; id: string } }> {
    return { items: this.listings };
  }

  async update(listing: Listing): Promise<Listing> {
    const idx = this.listings.findIndex((l) => l.id === listing.id);
    if (idx >= 0) this.listings[idx] = listing;
    return listing;
  }

  async softDelete(_id: string, _at: Date): Promise<void> {
    const existing = this.listings.find((l) => l.id === _id);
    if (existing) {
      this.listings = this.listings.map((l) => (l.id === _id ? l.softDelete(_at) : l));
    }
  }
}

class FakePrisma {
  auditLogs: Array<{
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    details: unknown;
  }> = [];

  auditLog = {
    create: async ({ data }: { data: unknown }) => {
      this.auditLogs.push(data as FakePrisma["auditLogs"][number]);
    },
  };
}

class FakeEventPublisher implements ListingEventPublisher {
  events: Array<{ event: string; listingId: string }> = [];

  async emit(payload: { event: string; listingId: string }): Promise<void> {
    this.events.push(payload);
  }
}

class FakeExchangeRatePort implements ExchangeRatePort {
  rates: Record<string, number> = {};

  async getRate(from: string, to: string): Promise<number> {
    return this.rates[`${from}:${to}`] ?? 0;
  }

  async listAll() {
    return Object.entries(this.rates).map(([key, rate]) => {
      const [fromCurrency, toCurrency] = key.split(":") as ["TMT" | "USD" | "AED", "TMT" | "USD" | "AED"];
      return { fromCurrency, toCurrency, rate, updatedAt: new Date() };
    });
  }

  seed(from: string, to: string, rate: number) {
    this.rates[`${from}:${to}`] = rate;
  }
}

function makeUseCase(
  repo?: FakeListingRepository,
  prisma?: FakePrisma,
  events?: FakeEventPublisher,
  exchangeRates?: FakeExchangeRatePort,
) {
  return new EditListing(
    repo ?? new FakeListingRepository(),
    (prisma ?? new FakePrisma()) as unknown as ConstructorParameters<typeof EditListing>[1],
    exchangeRates ?? new FakeExchangeRatePort(),
    events ?? new FakeEventPublisher(),
  );
}

function seedActiveListing(
  repo: FakeListingRepository,
  overrides?: Partial<Parameters<typeof Listing.create>[0]>,
) {
  const listing = Listing.create({
    id: "listing-1",
    sellerId: "user-1",
    status: "active",
    brandId: "brand-1",
    modelId: "model-1",
    cityId: "city-1",
    priceAmount: 100000,
    priceCurrency: "TMT",
    allowCalls: true,
    allowChat: true,
    publishedAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  });
  repo.listings.push(listing);
  return listing;
}

describe("EditListing", () => {
  let repo: FakeListingRepository;
  let prisma: FakePrisma;
  let events: FakeEventPublisher;
  let exchangeRates: FakeExchangeRatePort;

  beforeEach(() => {
    repo = new FakeListingRepository();
    prisma = new FakePrisma();
    events = new FakeEventPublisher();
    exchangeRates = new FakeExchangeRatePort();
  });

  it("edits description successfully without writing AuditLog", async () => {
    seedActiveListing(repo);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    const result = await uc.execute({
      listingId: "listing-1",
      userId: "user-1",
      patch: { description: "Updated description" },
    });

    expect(result.listing.description).toBe("Updated description");
    expect(prisma.auditLogs).toHaveLength(0);
    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      event: "ListingUpdated",
      listingId: "listing-1",
    });
  });

  it("rejects changing brandId with LISTING_FIELD_LOCKED", async () => {
    seedActiveListing(repo);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    await expect(
      uc.execute({
        listingId: "listing-1",
        userId: "user-1",
        patch: { brandId: "brand-2" } as typeof ListingsSchemas.EditListingRequestSchema._type,
      }),
    ).rejects.toThrow(BadRequestException);

    try {
      await uc.execute({
        listingId: "listing-1",
        userId: "user-1",
        patch: { brandId: "brand-2" } as typeof ListingsSchemas.EditListingRequestSchema._type,
      });
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response['code']).toBe("LISTING_FIELD_LOCKED");
      expect(response['details']).toMatchObject({ field: "brandId" });
    }
  });

  it("rejects changing modelId with LISTING_FIELD_LOCKED", async () => {
    seedActiveListing(repo);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    try {
      await uc.execute({
        listingId: "listing-1",
        userId: "user-1",
        patch: { modelId: "model-2" } as typeof ListingsSchemas.EditListingRequestSchema._type,
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response['code']).toBe("LISTING_FIELD_LOCKED");
      expect(response['details']).toMatchObject({ field: "modelId" });
    }
  });

  it("rejects changing generationId with LISTING_FIELD_LOCKED", async () => {
    seedActiveListing(repo, { generationId: "gen-1" });

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    try {
      await uc.execute({
        listingId: "listing-1",
        userId: "user-1",
        patch: { generationId: "gen-2" } as typeof ListingsSchemas.EditListingRequestSchema._type,
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response['code']).toBe("LISTING_FIELD_LOCKED");
      expect(response['details']).toMatchObject({ field: "generationId" });
    }
  });

  it("rejects changing year with LISTING_FIELD_LOCKED", async () => {
    seedActiveListing(repo, { year: 2020 });

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    try {
      await uc.execute({
        listingId: "listing-1",
        userId: "user-1",
        patch: { year: 2021 } as typeof ListingsSchemas.EditListingRequestSchema._type,
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response['code']).toBe("LISTING_FIELD_LOCKED");
      expect(response['details']).toMatchObject({ field: "year" });
    }
  });

  it("rejects changing vin with LISTING_FIELD_LOCKED", async () => {
    seedActiveListing(repo, { vin: "VIN123" });

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    try {
      await uc.execute({
        listingId: "listing-1",
        userId: "user-1",
        patch: { vin: "VIN456" } as typeof ListingsSchemas.EditListingRequestSchema._type,
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response['code']).toBe("LISTING_FIELD_LOCKED");
      expect(response['details']).toMatchObject({ field: "vin" });
    }
  });

  it("writes price_changed AuditLog when priceAmount changes", async () => {
    seedActiveListing(repo);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    await uc.execute({
      listingId: "listing-1",
      userId: "user-1",
      patch: { priceAmount: 200000 },
    });

    expect(prisma.auditLogs).toHaveLength(1);
    expect(prisma.auditLogs[0]).toMatchObject({
      action: "listing.price_changed",
      targetId: "listing-1",
      details: {
        oldPriceAmount: 100000,
        oldPriceCurrency: "TMT",
        newPriceAmount: 200000,
        newPriceCurrency: "TMT",
      },
    });
  });

  it("writes price_changed AuditLog when priceCurrency changes", async () => {
    seedActiveListing(repo);
    exchangeRates.seed("USD", "TMT", 3.5);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    await uc.execute({
      listingId: "listing-1",
      userId: "user-1",
      patch: { priceCurrency: "USD" },
    });

    expect(prisma.auditLogs).toHaveLength(1);
    expect(prisma.auditLogs[0]).toMatchObject({
      action: "listing.price_changed",
      details: {
        oldPriceAmount: 100000,
        oldPriceCurrency: "TMT",
        newPriceAmount: 100000,
        newPriceCurrency: "USD",
      },
    });
  });

  it("writes price_changed AuditLog when both amount and currency change", async () => {
    seedActiveListing(repo);
    exchangeRates.seed("USD", "TMT", 3.5);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    await uc.execute({
      listingId: "listing-1",
      userId: "user-1",
      patch: { priceAmount: 30000, priceCurrency: "USD" },
    });

    expect(prisma.auditLogs).toHaveLength(1);
    expect(prisma.auditLogs[0]).toMatchObject({
      action: "listing.price_changed",
      details: {
        oldPriceAmount: 100000,
        oldPriceCurrency: "TMT",
        newPriceAmount: 30000,
        newPriceCurrency: "USD",
      },
    });
  });

  it("does NOT write AuditLog for non-price edits", async () => {
    seedActiveListing(repo);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    await uc.execute({
      listingId: "listing-1",
      userId: "user-1",
      patch: { description: "New description", mileageKm: 50000 },
    });

    expect(prisma.auditLogs).toHaveLength(0);
  });

  it("rejects allowCalls=false and allowChat=false with CONTACT_METHOD_REQUIRED", async () => {
    seedActiveListing(repo);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    try {
      await uc.execute({
        listingId: "listing-1",
        userId: "user-1",
        patch: { allowCalls: false, allowChat: false },
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response['code']).toBe("CONTACT_METHOD_REQUIRED");
    }
  });

  it("rejects changing priceCurrency to AED without exchange rate with EXCHANGE_RATE_MISSING", async () => {
    seedActiveListing(repo);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    try {
      await uc.execute({
        listingId: "listing-1",
        userId: "user-1",
        patch: { priceCurrency: "AED" },
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response['code']).toBe("EXCHANGE_RATE_MISSING");
    }
  });

  it("returns 404 for non-owner", async () => {
    seedActiveListing(repo);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    await expect(
      uc.execute({
        listingId: "listing-1",
        userId: "user-2",
        patch: { description: "Should not work" },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns 404 for soft-deleted listing", async () => {
    const listing = seedActiveListing(repo);
    repo.listings[0] = listing.softDelete(new Date());

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    await expect(
      uc.execute({
        listingId: "listing-1",
        userId: "user-1",
        patch: { description: "Should not work" },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("emits ListingUpdated event on success", async () => {
    seedActiveListing(repo);

    const uc = makeUseCase(repo, prisma, events, exchangeRates);
    await uc.execute({
      listingId: "listing-1",
      userId: "user-1",
      patch: { description: "Updated" },
    });

    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      event: "ListingUpdated",
      listingId: "listing-1",
    });
  });
});
