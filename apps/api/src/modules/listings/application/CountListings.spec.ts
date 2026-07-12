import { describe, it, expect, beforeEach } from "vitest";

import { CountListings } from "./CountListings";
import type { FeedRankingPort } from "../domain/ports/FeedRankingPort";
import type { ListingFilterCriteria } from "../domain/types";

class FakeFeedRankingPort implements FeedRankingPort {
  countResult = 0;
  lastCountFilters?: ListingFilterCriteria | undefined;

  async rank(): Promise<{ items: [] }> {
    return { items: [] };
  }

  async count(query: { filters?: ListingFilterCriteria }): Promise<number> {
    this.lastCountFilters = query.filters;
    return this.countResult;
  }

  async modelCounts(): Promise<Array<{ modelId: string; totalMatching: number }>> {
    return [];
  }
}

function makeUseCase(ranking?: FakeFeedRankingPort) {
  return new CountListings(ranking ?? new FakeFeedRankingPort());
}

describe("CountListings", () => {
  let ranking: FakeFeedRankingPort;

  beforeEach(() => {
    ranking = new FakeFeedRankingPort();
  });

  it("returns totalMatching from ranking port", async () => {
    ranking.countResult = 42;

    const uc = makeUseCase(ranking);
    const result = await uc.execute({});

    expect(result.totalMatching).toBe(42);
  });

  it("forwards filters to ranking port", async () => {
    ranking.countResult = 5;
    const filters: ListingFilterCriteria = {
      brandId: "brand-1",
      priceMin: 50000,
      priceMax: 100000,
    };

    const uc = makeUseCase(ranking);
    await uc.execute({ filters });

    expect(ranking.lastCountFilters).toEqual(filters);
  });

  it("returns zero when ranking port reports zero", async () => {
    ranking.countResult = 0;

    const uc = makeUseCase(ranking);
    const result = await uc.execute({});

    expect(result.totalMatching).toBe(0);
  });
});
