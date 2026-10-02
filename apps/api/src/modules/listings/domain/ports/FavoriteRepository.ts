import type { Favorite } from "../Favorite";

export interface VisibleFavoriteOptions {
  cursor?: { timestamp: string; id: string };
  limit?: number;
  /** Only Favorites whose Listing is `active`. Default: every visible Listing. */
  activeOnly?: boolean;
}

export interface VisibleFavoriteCounts {
  /** The User's Favorites whose Listing is visible (active, sold or archived; not deleted). */
  total: number;
  /** How many of `total` are sold or archived. */
  inactive: number;
}

export interface FavoriteRepository {
  add(userId: string, listingId: string): Promise<Favorite>;
  remove(userId: string, listingId: string): Promise<boolean>;
  exists(userId: string, listingId: string): Promise<boolean>;
  /** Returns the subset of `listingIds` the user has favorited, in one read. */
  favoritedListingIds(userId: string, listingIds: string[]): Promise<Set<string>>;
  /**
   * Newest Favorite first, paged over Favorites whose Listing is visible, so a page
   * holds `limit` items whenever that many remain. See `VISIBLE_LISTING_STATUSES`.
   */
  listVisibleByUserId(
    userId: string,
    opts?: VisibleFavoriteOptions,
  ): Promise<{ items: Favorite[]; nextCursor?: { timestamp: string; id: string } }>;
  /** Counts over every visible Favorite of the User, independent of paging and filters. */
  countVisibleByUserId(userId: string): Promise<VisibleFavoriteCounts>;
}

export const FAVORITE_REPOSITORY = Symbol("FavoriteRepository");
