import { Inject, Injectable } from "@nestjs/common";

import {
  FEED_RANKING_PORT,
  type FeedRankingPort,
} from "../domain/ports/FeedRankingPort";
import type { ListingFilterCriteria } from "../domain/types";

export interface CountListingsInput {
  filters?: ListingFilterCriteria;
}

export interface CountListingsOutput {
  totalMatching: number;
}

@Injectable()
export class CountListings {
  constructor(
    @Inject(FEED_RANKING_PORT)
    private readonly ranking: FeedRankingPort,
  ) {}

  async execute(input: CountListingsInput): Promise<CountListingsOutput> {
    const totalMatching = await this.ranking.count({
      ...(input.filters !== undefined ? { filters: input.filters } : {}),
    });

    return { totalMatching };
  }
}
