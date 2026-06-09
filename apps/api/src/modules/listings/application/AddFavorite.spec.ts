import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";

import { AddFavorite } from "./AddFavorite";
import { Listing } from "../domain/Listing";
import { Favorite } from "../domain/Favorite";
import type { FavoriteRepository } from "../domain/ports/FavoriteRepository";
import type { ListingRepository } from "../domain/ports/ListingRepository";

class FakeFavoriteRepository implements FavoriteRepository {
  favorites: Favorite[] = [];

  async add(userId: string, listingId: string): Promise<Favorite> {
    const existing = this.favorites.find(
      (f) => f.userId === userId && f.listingId === listingId,
    );
    if (existing) return existing;

    const favorite = Favorite.create({
      id: `fav-${userId}-${listingId}`,
      userId,
      listingId,
      createdAt: new Date(),
    });
    this.favorites.push(favorite);
    return favorite;
  }

  async remove(_userId: string, _listingId: string): Promise<boolean> {
    return true;
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

class FakeListingRepository implements ListingRepository {
  listings: Listing[] = [];

  async save(listing: Listing): Promise<Listing> {
    this.listings.push(listing);
    return listing;
  }

  async findById(id: string): Promise<Listing | null> {
    return this.listings.find((l) => l.id === id) ?? null;
  }

  async findBySellerId(
    _sellerId: string,
    _opts?: { cursor?: { timestamp: string; id: string }; limit?: number },
  ): Promise<{ items: Listing[]; nextCursor?: { timestamp: string; id: string } }> {
    return { items: this.listings };
  }

  async update(listing: Listing): Promise<Listing> {
    const idx = this.listings.findIndex((l) => l.id === listing.id);
    if (idx >= 0) this.listings[idx] = listing;
    return listing;
  }

  async softDelete(_id: string, _at: Date): Promise<void> {}
}

function makeUseCase(
  favorites?: FakeFavoriteRepository,
  listings?: FakeListingRepository,
) {
  return new AddFavorite(
    favorites ?? new FakeFavoriteRepository(),
    listings ?? new FakeListingRepository(),
  );
}

function seedListing(
  repo: FakeListingRepository,
  overrides?: Partial<Parameters<typeof Listing.create>[0]>,
): Listing {
  const listing = Listing.create({
    id: "listing-1",
    sellerId: "user-1",
    status: "active",
    brandId: "brand-1",
    modelId: "model-1",
    cityId: "city-1",
    priceAmount: 100000,
    priceCurrency: "TMT",
    allowCalls: true,
    allowChat: true,
    publishedAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  });
  repo.listings.push(listing);
  return listing;
}

describe("AddFavorite", () => {
  let favorites: FakeFavoriteRepository;
  let listings: FakeListingRepository;

  beforeEach(() => {
    favorites = new FakeFavoriteRepository();
    listings = new FakeListingRepository();
  });

  it("favorites an active listing", async () => {
    seedListing(listings);
    const uc = makeUseCase(favorites, listings);

    const result = await uc.execute({ userId: "user-2", listingId: "listing-1" });

    expect(result.listingId).toBe("listing-1");
    expect(result.userId).toBe("user-2");
    expect(await favorites.exists("user-2", "listing-1")).toBe(true);
  });

  it("is idempotent — second favorite returns existing row", async () => {
    seedListing(listings);
    const uc = makeUseCase(favorites, listings);

    const first = await uc.execute({ userId: "user-2", listingId: "listing-1" });
    const second = await uc.execute({ userId: "user-2", listingId: "listing-1" });

    expect(second.id).toBe(first.id);
    expect(favorites.favorites).toHaveLength(1);
  });

  it("throws NotFoundException for non-existent listing", async () => {
    const uc = makeUseCase(favorites, listings);
    await expect(
      uc.execute({ userId: "user-2", listingId: "missing" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException for soft-deleted listing", async () => {
    const listing = seedListing(listings);
    listings.listings = [listing.softDelete(new Date())];

    const uc = makeUseCase(favorites, listings);
    await expect(
      uc.execute({ userId: "user-2", listingId: "listing-1" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException for banned listing", async () => {
    seedListing(listings, { status: "banned" });

    const uc = makeUseCase(favorites, listings);
    await expect(
      uc.execute({ userId: "user-2", listingId: "listing-1" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException for sold listing", async () => {
    seedListing(listings, { status: "sold" });

    const uc = makeUseCase(favorites, listings);
    await expect(
      uc.execute({ userId: "user-2", listingId: "listing-1" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException for archived listing", async () => {
    seedListing(listings, { status: "archived" });

    const uc = makeUseCase(favorites, listings);
    await expect(
      uc.execute({ userId: "user-2", listingId: "listing-1" }),
    ).rejects.toThrow(NotFoundException);
  });
});
