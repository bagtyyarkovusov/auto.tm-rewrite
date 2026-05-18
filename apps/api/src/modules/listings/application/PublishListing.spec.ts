import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";

import { ListingDraft } from "../domain/ListingDraft";
import type { ListingDraftRepository } from "../domain/ports/ListingDraftRepository";
import type { ExchangeRatePort } from "../domain/ports/ExchangeRatePort";
import type { ListingEventPublisher } from "../domain/ports/ListingEventPublisher";

import { PublishListing } from "./PublishListing";

class FakeListingDraftRepository implements ListingDraftRepository {
  drafts: ListingDraft[] = [];

  async save(draft: ListingDraft): Promise<ListingDraft> {
    this.drafts.push(draft);
    return draft;
  }

  async findById(id: string): Promise<ListingDraft | null> {
    return this.drafts.find((d) => d.id === id) ?? null;
  }

  async findByUserId(
    _userId: string,
    _opts?: { cursor?: { timestamp: string; id: string } | undefined; limit?: number | undefined },
  ): Promise<{ items: ListingDraft[]; nextCursor?: { timestamp: string; id: string } | undefined }> {
    return { items: this.drafts };
  }

  async update(draft: ListingDraft): Promise<ListingDraft> {
    const idx = this.drafts.findIndex((d) => d.id === draft.id);
    if (idx >= 0) this.drafts[idx] = draft;
    return draft;
  }

  async delete(_id: string): Promise<void> {
    this.drafts = this.drafts.filter((d) => d.id !== _id);
  }
}

class FakeExchangeRatePort implements ExchangeRatePort {
  rates: Record<string, number> = {};

  async getRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    return this.rates[`${from}_${to}`] ?? 0;
  }

  async listAll() {
    return Object.entries(this.rates).map(([key, rate]) => {
      const [fromCurrency, toCurrency] = key.split("_") as ["TMT" | "USD" | "AED", "TMT" | "USD" | "AED"];
      return { fromCurrency, toCurrency, rate, updatedAt: new Date() };
    });
  }
}

class FakeEventPublisher implements ListingEventPublisher {
  events: Array<{ event: string; listingId: string; sellerId?: string }> = [];

  async emit(payload: { event: string; listingId: string; sellerId?: string }): Promise<void> {
    this.events.push(payload);
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

  createdListings: Array<Record<string, unknown>> = [];
  createdMedia: Array<Record<string, unknown>> = [];
  deletedDrafts: string[] = [];

  $transaction = async <T>(promises: Promise<T>[]): Promise<T[]> => {
    return Promise.all(promises);
  };

  listing = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      this.createdListings.push(data);
      const d = data as Record<string, unknown>;
      return {
        id: d["id"] as string,
        sellerId: d["sellerId"] as string,
        status: d["status"] as string,
        brandId: d["brandId"] as string,
        modelId: d["modelId"] as string,
        generationId: d["generationId"] as string | null,
        year: d["year"] as number | null,
        vin: d["vin"] as string | null,
        cityId: d["cityId"] as string,
        regionId: d["regionId"] as string | null,
        priceAmount: d["priceAmount"] as number,
        priceCurrency: d["priceCurrency"] as string,
        contactPhone: d["contactPhone"] as string | null,
        allowCalls: d["allowCalls"] as boolean,
        allowChat: d["allowChat"] as boolean,
        publishedAt: d["publishedAt"] as Date,
        condition: d["condition"] as string | null,
        colorId: d["colorId"] as string | null,
        bodyTypeId: d["bodyTypeId"] as string | null,
        engineTypeId: d["engineTypeId"] as string | null,
        transmissionId: d["transmissionId"] as string | null,
        driveTypeId: d["driveTypeId"] as string | null,
        enginePower: d["enginePower"] as number | null,
        mileageKm: d["mileageKm"] as number | null,
        locationText: d["locationText"] as string | null,
        description: d["description"] as string | null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
  };

  listingMedia = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      this.createdMedia.push(data);
      return data;
    },
  };

  listingDraft = {
    delete: async ({ where }: { where: { id: string } }) => {
      this.deletedDrafts.push(where.id);
    },
  };

  auditLog = {
    create: async ({ data }: { data: unknown }) => {
      this.auditLogs.push(data as FakePrisma["auditLogs"][number]);
    },
  };
}

function makeUseCase(
  draftRepo?: FakeListingDraftRepository,
  prisma?: FakePrisma,
  exchangeRates?: FakeExchangeRatePort,
  events?: FakeEventPublisher,
) {
  return new PublishListing(
    draftRepo ?? new FakeListingDraftRepository(),
    (prisma ?? new FakePrisma()) as unknown as ConstructorParameters<typeof PublishListing>[1],
    exchangeRates ?? new FakeExchangeRatePort(),
    events ?? new FakeEventPublisher(),
  );
}

function seedDraft(
  repo: FakeListingDraftRepository,
  payload: Record<string, unknown>,
  userId = "user-1",
) {
  const draft = ListingDraft.create({
    id: "draft-1",
    userId,
    payload,
  });
  repo.drafts.push(draft);
  return draft;
}

describe("PublishListing", () => {
  let draftRepo: FakeListingDraftRepository;
  let prisma: FakePrisma;
  let exchangeRates: FakeExchangeRatePort;
  let events: FakeEventPublisher;

  beforeEach(() => {
    draftRepo = new FakeListingDraftRepository();
    prisma = new FakePrisma();
    exchangeRates = new FakeExchangeRatePort();
    events = new FakeEventPublisher();
  });

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

  it("publishes a valid draft", async () => {
    seedDraft(draftRepo, validPayload);

    const uc = makeUseCase(draftRepo, prisma, exchangeRates, events);
    const result = await uc.execute({ draftId: "draft-1", userId: "user-1" });

    expect(result.listing.status).toBe("active");
    expect(result.listing.brandId).toBe(validPayload.brandId);
    expect(prisma.createdListings).toHaveLength(1);
    expect(prisma.createdMedia).toHaveLength(1);
    expect(prisma.deletedDrafts).toContain("draft-1");
    expect(prisma.auditLogs).toHaveLength(1);
    expect(prisma.auditLogs[0]).toMatchObject({
      action: "listing.published",
      actorId: "user-1",
    });
    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      event: "ListingCreated",
      sellerId: "user-1",
    });
  });

  it("throws NotFoundException for non-existent draft", async () => {
    const uc = makeUseCase(draftRepo, prisma, exchangeRates, events);
    await expect(
      uc.execute({ draftId: "missing", userId: "user-1" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException for draft owned by another user", async () => {
    seedDraft(draftRepo, validPayload, "user-1");

    const uc = makeUseCase(draftRepo, prisma, exchangeRates, events);
    await expect(
      uc.execute({ draftId: "draft-1", userId: "user-2" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws BadRequestException when draft is missing required fields", async () => {
    seedDraft(draftRepo, { brandId: validPayload.brandId });

    const uc = makeUseCase(draftRepo, prisma, exchangeRates, events);
    await expect(
      uc.execute({ draftId: "draft-1", userId: "user-1" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException with CONTACT_METHOD_REQUIRED when both contact methods are false", async () => {
    seedDraft(draftRepo, { ...validPayload, allowCalls: false, allowChat: false });

    const uc = makeUseCase(draftRepo, prisma, exchangeRates, events);
    await expect(
      uc.execute({ draftId: "draft-1", userId: "user-1" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException with EXCHANGE_RATE_MISSING for USD when rate is absent", async () => {
    seedDraft(draftRepo, { ...validPayload, priceCurrency: "USD" });

    const uc = makeUseCase(draftRepo, prisma, exchangeRates, events);
    await expect(
      uc.execute({ draftId: "draft-1", userId: "user-1" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("publishes a USD-priced draft when exchange rate exists", async () => {
    seedDraft(draftRepo, { ...validPayload, priceCurrency: "USD" });
    exchangeRates.rates["USD_TMT"] = 3.5;

    const uc = makeUseCase(draftRepo, prisma, exchangeRates, events);
    const result = await uc.execute({ draftId: "draft-1", userId: "user-1" });

    expect(result.listing.priceCurrency).toBe("USD");
    expect(prisma.createdListings).toHaveLength(1);
  });

  it("publishes an AED-priced draft when exchange rate exists", async () => {
    seedDraft(draftRepo, { ...validPayload, priceCurrency: "AED" });
    exchangeRates.rates["AED_TMT"] = 0.95;

    const uc = makeUseCase(draftRepo, prisma, exchangeRates, events);
    const result = await uc.execute({ draftId: "draft-1", userId: "user-1" });

    expect(result.listing.priceCurrency).toBe("AED");
  });

  it("creates multiple media rows for multiple photos", async () => {
    seedDraft(draftRepo, {
      ...validPayload,
      photos: [
        { photoId: "00000000-0000-0000-0000-000000000005", key: "p1.jpg", sortOrder: 0 },
        { photoId: "00000000-0000-0000-0000-000000000006", key: "p2.jpg", sortOrder: 1 },
      ],
    });

    const uc = makeUseCase(draftRepo, prisma, exchangeRates, events);
    await uc.execute({ draftId: "draft-1", userId: "user-1" });

    expect(prisma.createdMedia).toHaveLength(2);
  });
});
