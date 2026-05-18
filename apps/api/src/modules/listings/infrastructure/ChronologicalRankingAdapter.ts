import { Injectable } from "@nestjs/common";

import type { FeedRankingPort } from "../domain/ports/FeedRankingPort";
import type { Listing } from "../domain/Listing";
import type { FeedCursor, ListingFilterCriteria } from "../domain/types";

@Injectable()
export class ChronologicalRankingAdapter implements FeedRankingPort {
  async rank(_query: {
    viewerId?: string;
    filters?: ListingFilterCriteria;
    cursor?: FeedCursor;
    limit: number;
  }): Promise<{ items: Listing[]; nextCursor?: FeedCursor }> {
    // Skeleton — full SQL implementation lands in #92 (read use-case slice).
    // S4 uses this adapter as the default FeedRankingPort binding.
    return { items: [] };
  }
}
