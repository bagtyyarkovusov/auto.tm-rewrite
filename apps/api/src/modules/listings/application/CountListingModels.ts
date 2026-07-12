import { Inject, Injectable } from "@nestjs/common";

import {
  FEED_RANKING_PORT,
  type FeedRankingPort,
} from "../domain/ports/FeedRankingPort";
import type { ListingFilterCriteria } from "../domain/types";

export interface CountListingModelsInput {
  brandId: string;
  filters?: Omit<ListingFilterCriteria, "brandId" | "modelId" | "modelIds">;
}

export interface CountListingModelsOutput {
  items: Array<{ modelId: string; totalMatching: number }>;
}

@Injectable()
export class CountListingModels {
  constructor(
    @Inject(FEED_RANKING_PORT)
    private readonly ranking: FeedRankingPort,
  ) {}

  async execute(input: CountListingModelsInput): Promise<CountListingModelsOutput> {
    const items = await this.ranking.modelCounts({
      filters: { ...input.filters, brandId: input.brandId },
    });

    return { items };
  }
}
