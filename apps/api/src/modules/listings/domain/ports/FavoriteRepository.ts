import type { Favorite } from "../Favorite";

export interface FavoriteRepository {
  add(userId: string, listingId: string): Promise<Favorite>;
  remove(userId: string, listingId: string): Promise<boolean>;
  exists(userId: string, listingId: string): Promise<boolean>;
  listByUserId(
    userId: string,
    opts?: { cursor?: { timestamp: string; id: string }; limit?: number },
  ): Promise<{ items: Favorite[]; nextCursor?: { timestamp: string; id: string } }>;
}

export const FAVORITE_REPOSITORY = Symbol("FavoriteRepository");
