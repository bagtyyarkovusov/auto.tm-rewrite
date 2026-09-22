import type { Favorite } from "../Favorite";

export interface FavoriteRepository {
  add(userId: string, listingId: string): Promise<Favorite>;
  remove(userId: string, listingId: string): Promise<boolean>;
  exists(userId: string, listingId: string): Promise<boolean>;
  /** Returns the subset of `listingIds` the user has favorited, in one read. */
  favoritedListingIds(userId: string, listingIds: string[]): Promise<Set<string>>;
  listByUserId(
    userId: string,
    opts?: { cursor?: { timestamp: string; id: string }; limit?: number },
  ): Promise<{ items: Favorite[]; nextCursor?: { timestamp: string; id: string } }>;
}

export const FAVORITE_REPOSITORY = Symbol("FavoriteRepository");
