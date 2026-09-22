import type { CardPhotos } from "../CardPhotos";
import type { Listing } from "../Listing";
import type { FeedCursor, ListingFilterCriteria } from "../types";

/** A ranked feed entry: the Listing plus the card photo fields read in the same pass. */
export interface RankedListing {
  listing: Listing;
  photos: CardPhotos;
}

export interface FeedRankingPort {
  rank(query: {
    viewerId?: string;
    filters?: ListingFilterCriteria;
    cursor?: FeedCursor;
    limit: number;
  }): Promise<{
    items: RankedListing[];
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
