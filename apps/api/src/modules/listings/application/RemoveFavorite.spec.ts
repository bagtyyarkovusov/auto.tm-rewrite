import { describe, it, expect, beforeEach } from "vitest";

import { RemoveFavorite } from "./RemoveFavorite";
import { Favorite } from "../domain/Favorite";
import type { FavoriteRepository } from "../domain/ports/FavoriteRepository";

class FakeFavoriteRepository implements FavoriteRepository {
  favorites: Favorite[] = [];

  async add(userId: string, listingId: string): Promise<Favorite> {
    const favorite = Favorite.create({
      id: `fav-${userId}-${listingId}`,
      userId,
      listingId,
      createdAt: new Date(),
    });
    this.favorites.push(favorite);
    return favorite;
  }

  async remove(userId: string, listingId: string): Promise<boolean> {
    const before = this.favorites.length;
    this.favorites = this.favorites.filter(
      (f) => !(f.userId === userId && f.listingId === listingId),
    );
    return this.favorites.length < before;
  }

  async exists(userId: string, listingId: string): Promise<boolean> {
    return this.favorites.some(
      (f) => f.userId === userId && f.listingId === listingId,
    );
  }

  async listByUserId(
    _userId: string,
    _opts?: { cursor?: { timestamp: string; id: string }; limit?: number },
  ): Promise<{ items: Favorite[]; nextCursor?: { timestamp: string; id: string } }> {
    return { items: [] };
  }
}

function makeUseCase(favorites?: FakeFavoriteRepository) {
  return new RemoveFavorite(favorites ?? new FakeFavoriteRepository());
}

describe("RemoveFavorite", () => {
  let favorites: FakeFavoriteRepository;

  beforeEach(() => {
    favorites = new FakeFavoriteRepository();
  });

  it("removes an existing favorite", async () => {
    await favorites.add("user-1", "listing-1");
    const uc = makeUseCase(favorites);

    const result = await uc.execute({ userId: "user-1", listingId: "listing-1" });

    expect(result.success).toBe(true);
    expect(await favorites.exists("user-1", "listing-1")).toBe(false);
  });

  it("is idempotent — removing non-existing favorite returns success", async () => {
    const uc = makeUseCase(favorites);

    const result = await uc.execute({ userId: "user-1", listingId: "listing-1" });

    expect(result.success).toBe(true);
  });
});
