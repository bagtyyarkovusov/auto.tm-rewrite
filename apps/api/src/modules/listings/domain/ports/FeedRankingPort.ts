import type { Listing } from "../Listing";
import type {
  FeedCountSummary,
  FeedCursor,
  FeedSort,
  ListingFilterCriteria,
} from "../types";

export interface FeedRankingPort {
  /** Pages active Listings in `sort` order; `cursor` must come from the same order. */
  rank(query: {
    viewerId?: string;
    filters?: ListingFilterCriteria;
    sort: FeedSort;
    cursor?: FeedCursor;
    limit: number;
  }): Promise<{
    items: Listing[];
    nextCursor?: FeedCursor;
  }>;

  count(query: {
    filters?: ListingFilterCriteria;
  }): Promise<FeedCountSummary>;

  modelCounts(query: {
    filters: ListingFilterCriteria & { brandId: string };
  }): Promise<Array<{ modelId: string; totalMatching: number }>>;

  /** Ignores brand and model filters; sorted by count descending, then brandId. */
  brandCounts(query: {
    filters?: ListingFilterCriteria;
  }): Promise<Array<{ brandId: string; totalMatching: number }>>;
}

export const FEED_RANKING_PORT = Symbol("FeedRankingPort");
