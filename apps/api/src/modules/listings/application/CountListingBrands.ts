import { Inject, Injectable } from "@nestjs/common";

import {
  FEED_RANKING_PORT,
  type FeedRankingPort,
} from "../domain/ports/FeedRankingPort";
import type { ListingFilterCriteria } from "../domain/types";

export interface CountListingBrandsInput {
  filters?: Omit<ListingFilterCriteria, "brandId" | "modelId" | "modelIds">;
}

export interface CountListingBrandsOutput {
  items: Array<{ brandId: string; totalMatching: number }>;
}

/** Popular brands for the Brand picker: active-Listing counts per brand, most first. */
@Injectable()
export class CountListingBrands {
  constructor(
    @Inject(FEED_RANKING_PORT)
    private readonly ranking: FeedRankingPort,
  ) {}

  async execute(input: CountListingBrandsInput): Promise<CountListingBrandsOutput> {
    const items = await this.ranking.brandCounts({
      ...(input.filters !== undefined ? { filters: input.filters } : {}),
    });

    return { items };
  }
}
