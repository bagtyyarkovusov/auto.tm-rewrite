import { describe, it, expect, beforeEach } from "vitest";

import { CountListingModels } from "./CountListingModels";
import type { FeedRankingPort } from "../domain/ports/FeedRankingPort";
import type { ListingFilterCriteria } from "../domain/types";

class FakeFeedRankingPort implements FeedRankingPort {
  lastModelCountFilters?: ListingFilterCriteria & { brandId: string };
  modelCountResult: Array<{ modelId: string; totalMatching: number }> = [];

  async rank(): Promise<{ items: [] }> {
    return { items: [] };
  }

  async count(): Promise<number> {
    return 0;
  }

  async modelCounts(query: {
    filters: ListingFilterCriteria & { brandId: string };
  }): Promise<Array<{ modelId: string; totalMatching: number }>> {
    this.lastModelCountFilters = query.filters;
    return this.modelCountResult;
  }
}

function makeUseCase(ranking?: FakeFeedRankingPort) {
  return new CountListingModels(ranking ?? new FakeFeedRankingPort());
}

describe("CountListingModels", () => {
  let ranking: FakeFeedRankingPort;

  beforeEach(() => {
    ranking = new FakeFeedRankingPort();
  });

  it("returns model counts from the ranking port", async () => {
    ranking.modelCountResult = [
      { modelId: "model-a", totalMatching: 12 },
      { modelId: "model-b", totalMatching: 5 },
    ];

    const uc = makeUseCase(ranking);
    const result = await uc.execute({ brandId: "brand-1" });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ modelId: "model-a", totalMatching: 12 });
  });

  it("forwards scalar filters and injects brandId", async () => {
    const uc = makeUseCase(ranking);
    await uc.execute({
      brandId: "brand-1",
      filters: { cityId: "city-1", priceMin: 10000, condition: "used" },
    });

    expect(ranking.lastModelCountFilters).toEqual({
      brandId: "brand-1",
      cityId: "city-1",
      priceMin: 10000,
      condition: "used",
    });
  });

  it("returns an empty list when no models have matching listings", async () => {
    ranking.modelCountResult = [];

    const uc = makeUseCase(ranking);
    const result = await uc.execute({ brandId: "brand-1" });

    expect(result.items).toEqual([]);
  });
});
