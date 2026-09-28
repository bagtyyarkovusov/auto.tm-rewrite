import { Inject, Injectable } from "@nestjs/common";

import {
  FEED_RANKING_PORT,
  type FeedRankingPort,
} from "../domain/ports/FeedRankingPort";
import type { FeedCountSummary, ListingFilterCriteria } from "../domain/types";

export interface CountListingsInput {
  filters?: ListingFilterCriteria;
}

/** `totalMatching` plus the TMT price range of the matches (null when none match). */
export type CountListingsOutput = FeedCountSummary;

@Injectable()
export class CountListings {
  constructor(
    @Inject(FEED_RANKING_PORT)
    private readonly ranking: FeedRankingPort,
  ) {}

  async execute(input: CountListingsInput): Promise<CountListingsOutput> {
    const summary = await this.ranking.count({
      ...(input.filters !== undefined ? { filters: input.filters } : {}),
    });

    if (summary.totalMatching === 0) {
      return { totalMatching: 0, priceMinTmt: null, priceMaxTmt: null };
    }
    return summary;
  }
}
