import type { Listing } from "../Listing";
import type { FeedCursor, ListingFilterCriteria } from "../types";

export interface FeedRankingPort {
  rank(query: {
    viewerId?: string;
    filters?: ListingFilterCriteria;
    cursor?: FeedCursor;
    limit: number;
  }): Promise<{
    items: Listing[];
    nextCursor?: FeedCursor;
  }>;

  count(query: {
    filters?: ListingFilterCriteria;
  }): Promise<number>;

  modelCounts(query: {
    filters: ListingFilterCriteria & { brandId: string };
  }): Promise<Array<{ modelId: string; totalMatching: number }>>;
}

export const FEED_RANKING_PORT = Symbol("FeedRankingPort");
