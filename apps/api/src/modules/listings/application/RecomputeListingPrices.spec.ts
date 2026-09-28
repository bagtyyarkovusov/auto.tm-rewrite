import { describe, it, expect } from "vitest";

import type { Listing } from "../domain/Listing";
import type { ListingRepository } from "../domain/ports/ListingRepository";

import { RecomputeListingPrices } from "./RecomputeListingPrices";

class FakeListingRepository implements ListingRepository {
  recomputeCalls = 0;
  changedByRecompute = 0;

  async save(listing: Listing): Promise<Listing> {
    return listing;
  }

  async findById(): Promise<Listing | null> {
    return null;
  }

  async findBySellerId(): Promise<{ items: Listing[] }> {
    return { items: [] };
  }

  async update(listing: Listing): Promise<Listing> {
    return listing;
  }

  async softDelete(): Promise<void> {}

  async recomputePriceTmt(): Promise<number> {
    this.recomputeCalls += 1;
    return this.changedByRecompute;
  }
}

describe("RecomputeListingPrices", () => {
  it("recomputes every Listing's priceTmt once and reports how many changed", async () => {
    const repo = new FakeListingRepository();
    repo.changedByRecompute = 7;

    const result = await new RecomputeListingPrices(repo).execute();

    expect(repo.recomputeCalls).toBe(1);
    expect(result).toEqual({ changed: 7 });
  });

  it("reports zero when no stored price moved", async () => {
    const repo = new FakeListingRepository();

    const result = await new RecomputeListingPrices(repo).execute();

    expect(result).toEqual({ changed: 0 });
  });
});
