import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";

import { InspectionInterest } from "../domain/InspectionInterest";
import type { InspectionInterestRepository } from "../domain/ports/InspectionInterestRepository";
import type { ListingsReadPort, ListingSummary } from "../../listings/domain/ports/ListingsReadPort";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";

import { CreateInspectionInterest } from "./CreateInspectionInterest";

class FakeInspectionInterestRepository implements InspectionInterestRepository {
  interests: InspectionInterest[] = [];

  async save(interest: InspectionInterest): Promise<InspectionInterest> {
    this.interests.push(interest);
    return interest;
  }

  async findByListingAndRequester(
    listingId: string,
    requesterUserId: string,
  ): Promise<InspectionInterest | null> {
    return (
      this.interests.find(
        (i) =>
          i.listingId === listingId && i.requesterUserId === requesterUserId,
      ) ?? null
    );
  }

  async update(interest: InspectionInterest): Promise<InspectionInterest> {
    const idx = this.interests.findIndex((i) => i.id === interest.id);
    if (idx >= 0) {
      this.interests[idx] = interest;
      return interest;
    }
    throw new Error("Interest not found");
  }

  async aggregateByListing(): Promise<{ items: []; total: 0 }> {
    return { items: [], total: 0 };
  }
}

class FakeListingsReadPort implements ListingsReadPort {
  listings: Record<string, ListingSummary> = {};

  async getListingSummary(id: string): Promise<ListingSummary | null> {
    return this.listings[id] ?? null;
  }

  async getListingSummaries(): Promise<[]> {
    return [];
  }

  async getListingAdminSummaries(): Promise<[]> {
    return [];
  }

  async getListingsForOwner() {
    return { items: [] };
  }

  async matchesFilters(): Promise<boolean> {
    return true;
  }

  seed(id: string, summary: ListingSummary) {
    this.listings[id] = summary;
  }
}

class FakeIdentityReadPort implements IdentityReadPort {
  users: Record<string, { id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null }> = {};

  async findUserById(id: string): Promise<{ id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null } | null> {
    return this.users[id] ?? null;
  }

  async findUsersByIds(): Promise<[]> {
    return [];
  }

  async isUserBlockedBy(): Promise<boolean> {
    return false;
  }

  seed(id: string, user: { displayName?: string | null; role?: string; suspendedAt?: Date | null }) {
    this.users[id] = {
      id,
      displayName: user.displayName ?? null,
      role: user.role ?? "buyer",
      suspendedAt: user.suspendedAt ?? null,
      suspendedById: null,
      suspensionReason: null,
    };
  }
}

function makeUseCase(
  repo?: FakeInspectionInterestRepository,
  listings?: FakeListingsReadPort,
  identity?: FakeIdentityReadPort,
) {
  return new CreateInspectionInterest(
    repo ?? new FakeInspectionInterestRepository(),
    listings ?? new FakeListingsReadPort(),
    identity ?? new FakeIdentityReadPort(),
  );
}

function seedActiveListing(listings: FakeListingsReadPort, id: string, sellerId: string) {
  listings.seed(id, {
    id,
    sellerId,
    status: "active",
    brandId: "brand-1",
    modelId: "model-1",
    year: 2020,
    priceAmount: 100000,
    priceCurrency: "TMT",
    displayPriceTmt: 100000,
    cityId: "city-1",
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    allowChat: true,
  });
}

describe("CreateInspectionInterest", () => {
  let repo: FakeInspectionInterestRepository;
  let listings: FakeListingsReadPort;
  let identity: FakeIdentityReadPort;

  beforeEach(() => {
    repo = new FakeInspectionInterestRepository();
    listings = new FakeListingsReadPort();
    identity = new FakeIdentityReadPort();
  });

  it("creates buyer interest for an active listing", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("buyer-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({
      listingId: "listing-1",
      requesterUserId: "buyer-1",
      request: { willingnessToPayTmt: 5000 },
    });

    expect(result.reusedExisting).toBe(false);
    expect(result.interest.side).toBe("buyer");
    expect(result.interest.willingnessToPayTmt).toBe(5000);
    expect(result.interest.listingId).toBe("listing-1");
    expect(result.interest.requesterUserId).toBe("buyer-1");
    expect(repo.interests).toHaveLength(1);
  });

  it("creates seller interest when requester owns the listing", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("seller-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({
      listingId: "listing-1",
      requesterUserId: "seller-1",
      request: {},
    });

    expect(result.interest.side).toBe("seller");
    expect(result.interest.willingnessToPayTmt).toBeNull();
  });

  it("dedupes existing interest and updates willingness to pay", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("buyer-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity);
    const first = await uc.execute({
      listingId: "listing-1",
      requesterUserId: "buyer-1",
      request: { willingnessToPayTmt: 1000 },
    });

    const second = await uc.execute({
      listingId: "listing-1",
      requesterUserId: "buyer-1",
      request: { willingnessToPayTmt: 3000 },
    });

    expect(second.reusedExisting).toBe(true);
    expect(second.interest.id).toBe(first.interest.id);
    expect(second.interest.willingnessToPayTmt).toBe(3000);
    expect(repo.interests).toHaveLength(1);
  });

  it("returns existing interest unchanged when willingness omitted on duplicate", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("buyer-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity);
    const first = await uc.execute({
      listingId: "listing-1",
      requesterUserId: "buyer-1",
      request: { willingnessToPayTmt: 1000 },
    });

    const second = await uc.execute({
      listingId: "listing-1",
      requesterUserId: "buyer-1",
      request: {},
    });

    expect(second.reusedExisting).toBe(true);
    expect(second.interest.willingnessToPayTmt).toBe(1000);
    expect(second.interest.updatedAt.getTime()).toBe(
      first.interest.updatedAt.getTime(),
    );
  });

  it("returns NOT_FOUND for missing listing", async () => {
    identity.seed("buyer-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity);
    await expect(
      uc.execute({
        listingId: "missing-listing",
        requesterUserId: "buyer-1",
        request: {},
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns NOT_FOUND for banned listing", async () => {
    listings.seed("listing-1", {
      id: "listing-1",
      sellerId: "seller-1",
      status: "banned",
      brandId: "brand-1",
      modelId: "model-1",
      year: 2020,
      priceAmount: 100000,
      priceCurrency: "TMT",
      displayPriceTmt: 100000,
      cityId: "city-1",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      allowChat: true,
    });
    identity.seed("buyer-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity);
    await expect(
      uc.execute({
        listingId: "listing-1",
        requesterUserId: "buyer-1",
        request: {},
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns USER_SUSPENDED for suspended requester", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("buyer-1", { role: "buyer", suspendedAt: new Date() });

    const uc = makeUseCase(repo, listings, identity);
    try {
      await uc.execute({
        listingId: "listing-1",
        requesterUserId: "buyer-1",
        request: {},
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as ForbiddenException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response["code"]).toBe("FORBIDDEN");
      expect(response["details"]).toMatchObject({ reason: "USER_SUSPENDED" });
    }
  });

  it("rejects willingnessToPayTmt below 0", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("buyer-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity);
    await expect(
      uc.execute({
        listingId: "listing-1",
        requesterUserId: "buyer-1",
        request: { willingnessToPayTmt: -1 },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects willingnessToPayTmt above 10000", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("buyer-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity);
    await expect(
      uc.execute({
        listingId: "listing-1",
        requesterUserId: "buyer-1",
        request: { willingnessToPayTmt: 10001 },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("allows willingnessToPayTmt at boundaries", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("buyer-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity);
    const zero = await uc.execute({
      listingId: "listing-1",
      requesterUserId: "buyer-1",
      request: { willingnessToPayTmt: 0 },
    });
    const max = await uc.execute({
      listingId: "listing-1",
      requesterUserId: "buyer-2",
      request: { willingnessToPayTmt: 10000 },
    });

    expect(zero.interest.willingnessToPayTmt).toBe(0);
    expect(max.interest.willingnessToPayTmt).toBe(10000);
  });
});
