import { describe, it, expect, beforeEach } from "vitest";

import { CountListings } from "./CountListings";
import type { FeedRankingPort } from "../domain/ports/FeedRankingPort";
import type { FeedCountSummary, ListingFilterCriteria } from "../domain/types";

class FakeFeedRankingPort implements FeedRankingPort {
  summary: FeedCountSummary = { totalMatching: 0, priceMinTmt: null, priceMaxTmt: null };
  lastCountFilters?: ListingFilterCriteria | undefined;

  async rank(): Promise<{ items: [] }> {
    return { items: [] };
  }

  async count(query: { filters?: ListingFilterCriteria }): Promise<FeedCountSummary> {
    this.lastCountFilters = query.filters;
    return this.summary;
  }

  async modelCounts(): Promise<Array<{ modelId: string; totalMatching: number }>> {
    return [];
  }

  async brandCounts(): Promise<Array<{ brandId: string; totalMatching: number }>> {
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

  it("returns totalMatching and the TMT price range from the ranking port", async () => {
    ranking.summary = { totalMatching: 42, priceMinTmt: 35000, priceMaxTmt: 1_150_000 };

    const uc = makeUseCase(ranking);
    const result = await uc.execute({});

    expect(result).toEqual({ totalMatching: 42, priceMinTmt: 35000, priceMaxTmt: 1_150_000 });
  });

  it("forwards filters to ranking port", async () => {
    const filters: ListingFilterCriteria = {
      brandId: "brand-1",
      priceMin: 50000,
      priceMax: 100000,
    };

    const uc = makeUseCase(ranking);
    await uc.execute({ filters });

    expect(ranking.lastCountFilters).toEqual(filters);
  });

  it("returns a null price range when nothing matches", async () => {
    ranking.summary = { totalMatching: 0, priceMinTmt: 1, priceMaxTmt: 2 };

    const uc = makeUseCase(ranking);
    const result = await uc.execute({});

    expect(result).toEqual({ totalMatching: 0, priceMinTmt: null, priceMaxTmt: null });
  });
});
