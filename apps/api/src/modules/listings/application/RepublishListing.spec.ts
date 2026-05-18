import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

import { Listing } from "../domain/Listing";
import type { ListingRepository } from "../domain/ports/ListingRepository";

import { RepublishListing } from "./RepublishListing";

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

function makeUseCase(repo?: FakeListingRepository, prisma?: FakePrisma) {
  return new RepublishListing(
    repo ?? new FakeListingRepository(),
    (prisma ?? new FakePrisma()) as unknown as ConstructorParameters<typeof RepublishListing>[1],
  );
}

function seedListing(
  repo: FakeListingRepository,
  status: "active" | "sold" | "archived",
  overrides?: Partial<Parameters<typeof Listing.create>[0]>,
) {
  const listing = Listing.create({
    id: "listing-1",
    sellerId: "user-1",
    status,
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

describe("RepublishListing", () => {
  let repo: FakeListingRepository;
  let prisma: FakePrisma;

  beforeEach(() => {
    repo = new FakeListingRepository();
    prisma = new FakePrisma();
  });

  it("republishes an archived listing", async () => {
    seedListing(repo, "archived");

    const uc = makeUseCase(repo, prisma);
    const result = await uc.execute({ listingId: "listing-1", userId: "user-1" });

    expect(result.listing.status).toBe("active");
    expect(result.listing.soldAt).toBeUndefined();
    expect(prisma.auditLogs).toHaveLength(1);
    expect(prisma.auditLogs[0]).toMatchObject({
      action: "listing.republished",
      targetId: "listing-1",
    });
  });

  it("throws NotFoundException for non-existent listing", async () => {
    const uc = makeUseCase(repo, prisma);
    await expect(
      uc.execute({ listingId: "missing", userId: "user-1" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException for another user's listing", async () => {
    seedListing(repo, "archived");

    const uc = makeUseCase(repo, prisma);
    await expect(
      uc.execute({ listingId: "listing-1", userId: "user-2" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws NotFoundException for soft-deleted listing", async () => {
    seedListing(repo, "archived");
    repo.listings = repo.listings.map((l) => (l.id === "listing-1" ? l.softDelete(new Date()) : l));

    const uc = makeUseCase(repo, prisma);
    await expect(
      uc.execute({ listingId: "listing-1", userId: "user-1" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws DomainError when trying to republish an active listing", async () => {
    seedListing(repo, "active");

    const uc = makeUseCase(repo, prisma);
    await expect(
      uc.execute({ listingId: "listing-1", userId: "user-1" }),
    ).rejects.toThrow();
  });
});
