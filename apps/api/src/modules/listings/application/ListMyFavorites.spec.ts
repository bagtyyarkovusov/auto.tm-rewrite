import { describe, it, expect, beforeEach } from "vitest";
import type { CardPhotos } from "../domain/CardPhotos";

import { ListMyFavorites } from "./ListMyFavorites";
import { Favorite } from "../domain/Favorite";
import type { FavoriteRepository } from "../domain/ports/FavoriteRepository";
import type { ListingCard, ListingCardReadPort } from "../domain/ports/ListingCardReadPort";

let favCounter = 0;
function nextFavId(): string {
  favCounter++;
  return `00000000-0000-0000-0000-${favCounter.toString().padStart(12, "0")}`;
}

class FakeFavoriteRepository implements FavoriteRepository {
  favorites: Favorite[] = [];

  async add(userId: string, listingId: string): Promise<Favorite> {
    const favorite = Favorite.create({
      id: nextFavId(),
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

  async exists(_userId: string, _listingId: string): Promise<boolean> {
    return true;
  }

  async favoritedListingIds(_userId: string, listingIds: string[]): Promise<Set<string>> {
    return new Set(listingIds);
  }

  async listByUserId(
    userId: string,
    opts?: { cursor?: { timestamp: string; id: string }; limit?: number },
  ): Promise<{ items: Favorite[]; nextCursor?: { timestamp: string; id: string } }> {
    const filtered = this.favorites.filter((f) => f.userId === userId);
    const sorted = [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
    );

    const take = (opts?.limit ?? 20) + 1;
    let startIndex = 0;

    if (opts?.cursor) {
      const cursorIndex = sorted.findIndex((f) => f.id === opts.cursor!.id);
      if (cursorIndex >= 0) startIndex = cursorIndex + 1;
    }

    const page = sorted.slice(startIndex, startIndex + take);
    const hasMore = page.length === take;
    const items = hasMore ? page.slice(0, -1) : page;
    const last = items[items.length - 1];

    return {
      items,
      ...(hasMore && last
        ? { nextCursor: { timestamp: last.createdAt.toISOString(), id: last.id } }
        : {}),
    };
  }
}

class FakeListingCardReadPort implements ListingCardReadPort {
  summaries: ListingCard[] = [];

  async getCardPhotos(): Promise<Map<string, CardPhotos>> {
    return new Map();
  }

  async getVisibleCards(ids: string[]): Promise<ListingCard[]> {
    return this.summaries.filter((s) => ids.includes(s.id));
  }

  async getOwnerCards(): Promise<{ items: ListingCard[] }> {
    return { items: this.summaries };
  }
}

function makeUseCase(
  favorites?: FakeFavoriteRepository,
  listingsRead?: FakeListingCardReadPort,
) {
  return new ListMyFavorites(
    favorites ?? new FakeFavoriteRepository(),
    listingsRead ?? new FakeListingCardReadPort(),
  );
}

describe("ListMyFavorites", () => {
  let favorites: FakeFavoriteRepository;
  let listingsRead: FakeListingCardReadPort;

  beforeEach(() => {
    favCounter = 0;
    favorites = new FakeFavoriteRepository();
    listingsRead = new FakeListingCardReadPort();
  });

  function seedSummary(overrides?: Partial<ListingCard>): ListingCard {
    const summary: ListingCard = {
      id: "listing-1",
      sellerId: "user-1",
      status: "active",
      brandId: "brand-1",
      modelId: "model-1",
      priceAmount: 100000,
      priceCurrency: "TMT",
      displayPriceTmt: 100000,
      cityId: "city-1",
      publishedAt: new Date("2026-05-01T00:00:00Z"),
      photoKeys: [],
      photoCount: 0,
      allowCalls: true,
      allowChat: true,
      ...overrides,
    };
    listingsRead.summaries.push(summary);
    return summary;
  }

  it("returns favorited listings", async () => {
    seedSummary({ id: "listing-1" });
    await favorites.add("user-1", "listing-1");

    const uc = makeUseCase(favorites, listingsRead);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("listing-1");
  });

  it("includes sellerTrust.phoneVerified on favorite summaries", async () => {
    seedSummary({ id: "listing-1" });
    await favorites.add("user-1", "listing-1");

    const uc = makeUseCase(favorites, listingsRead);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.items[0]!.sellerTrust).toEqual({ phoneVerified: true });
  });

  it("excludes listings no longer visible (banned/deleted)", async () => {
    // favorite exists but read port returns nothing (listing banned/deleted)
    await favorites.add("user-1", "listing-1");

    const uc = makeUseCase(favorites, listingsRead);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.items).toHaveLength(0);
  });

  it("returns multiple favorites in newest-first order", async () => {
    seedSummary({ id: "listing-1" });
    seedSummary({ id: "listing-2" });
    seedSummary({ id: "listing-3" });

    await favorites.add("user-1", "listing-1");
    await favorites.add("user-1", "listing-2");
    await favorites.add("user-1", "listing-3");

    const uc = makeUseCase(favorites, listingsRead);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.items).toHaveLength(3);
    expect(result.items.map((i) => i.id)).toEqual(["listing-3", "listing-2", "listing-1"]);
  });

  it("paginates with cursor", async () => {
    seedSummary({ id: "listing-1" });
    seedSummary({ id: "listing-2" });

    await favorites.add("user-1", "listing-1");
    await favorites.add("user-1", "listing-2");

    const uc = makeUseCase(favorites, listingsRead);
    const page1 = await uc.execute({ userId: "user-1", limit: 1 });

    expect(page1.items).toHaveLength(1);
    expect(page1.items[0]!.id).toBe("listing-2");
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await uc.execute({
      userId: "user-1",
      limit: 1,
      cursor: page1.nextCursor!,
    });

    expect(page2.items).toHaveLength(1);
    expect(page2.items[0]!.id).toBe("listing-1");
    expect(page2.nextCursor).toBeNull();
  });

  it("returns null nextCursor when no more pages", async () => {
    seedSummary({ id: "listing-1" });
    await favorites.add("user-1", "listing-1");

    const uc = makeUseCase(favorites, listingsRead);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.nextCursor).toBeNull();
  });

  it("returns empty list when user has no favorites", async () => {
    const uc = makeUseCase(favorites, listingsRead);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("returns card fields and contact preferences on favorite items", async () => {
    seedSummary({
      id: "listing-1",
      photoKeys: ["a", "b"],
      photoCount: 4,
      mileageKm: 90000,
      condition: "used",
      transmissionId: "transmission-1",
      engineTypeId: "engine-1",
      contactPhone: "+99365000000",
      allowCalls: false,
      allowChat: true,
    });
    await favorites.add("user-1", "listing-1");

    const uc = makeUseCase(favorites, listingsRead);
    const [item] = (await uc.execute({ userId: "user-1" })).items;

    expect(item).toMatchObject({
      photoKeys: ["a", "b"],
      photoCount: 4,
      mileageKm: 90000,
      condition: "used",
      transmissionId: "transmission-1",
      engineTypeId: "engine-1",
      contactPhone: "+99365000000",
      allowCalls: false,
      allowChat: true,
    });
  });
});
