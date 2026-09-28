import { describe, it, expect, beforeEach } from "vitest";

import { CountListingBrands } from "./CountListingBrands";
import type { FeedRankingPort } from "../domain/ports/FeedRankingPort";
import type { ListingFilterCriteria } from "../domain/types";

class FakeFeedRankingPort implements FeedRankingPort {
  lastBrandCountFilters?: ListingFilterCriteria | undefined;
  brandCountResult: Array<{ brandId: string; totalMatching: number }> = [];

  async rank(): Promise<{ items: [] }> {
    return { items: [] };
  }

  async count() {
    return { totalMatching: 0, priceMinTmt: null, priceMaxTmt: null };
  }

  async modelCounts(): Promise<Array<{ modelId: string; totalMatching: number }>> {
    return [];
  }

  async brandCounts(query: {
    filters?: ListingFilterCriteria;
  }): Promise<Array<{ brandId: string; totalMatching: number }>> {
    this.lastBrandCountFilters = query.filters;
    return this.brandCountResult;
  }
}

describe("CountListingBrands", () => {
  let ranking: FakeFeedRankingPort;

  beforeEach(() => {
    ranking = new FakeFeedRankingPort();
  });

  it("returns brand counts in the ranking port's order", async () => {
    ranking.brandCountResult = [
      { brandId: "brand-a", totalMatching: 12 },
      { brandId: "brand-b", totalMatching: 5 },
    ];

    const result = await new CountListingBrands(ranking).execute({});

    expect(result.items).toEqual([
      { brandId: "brand-a", totalMatching: 12 },
      { brandId: "brand-b", totalMatching: 5 },
    ]);
  });

  it("forwards the current filters", async () => {
    await new CountListingBrands(ranking).execute({
      filters: { cityId: "city-1", yearMin: 2015, condition: "used" },
    });

    expect(ranking.lastBrandCountFilters).toEqual({
      cityId: "city-1",
      yearMin: 2015,
      condition: "used",
    });
  });

  it("omits filters when none are given", async () => {
    await new CountListingBrands(ranking).execute({});

    expect(ranking.lastBrandCountFilters).toBeUndefined();
  });
});
