import { describe, it, expect, beforeEach } from "vitest";
import { ListFeed } from "./ListFeed";
import { Listing } from "../domain/Listing";
import type { CardPhotos } from "../domain/CardPhotos";
import type { FavoriteRepository } from "../domain/ports/FavoriteRepository";
import type { FeedRankingPort } from "../domain/ports/FeedRankingPort";
import type { ListingCard, ListingCardReadPort } from "../domain/ports/ListingCardReadPort";
import type { ExchangeRatePort } from "../domain/ports/ExchangeRatePort";
import type { MediaStoragePort } from "../domain/ports/MediaStoragePort";
import { BadRequestException } from "@nestjs/common";
import { ListingsSchemas } from "@auto-tm/contracts";
import type { FeedCursor, FeedSort, ListingFilterCriteria } from "../domain/types";
import { FakeSellerProfilePort } from "../test/FakeSellerProfilePort";

class FakeFeedRankingPort implements FeedRankingPort {
  items: Listing[] = [];
  nextCursor?: FeedCursor;
  lastViewerId: string | undefined;
  lastSort: FeedSort | undefined;
  lastCursor: FeedCursor | undefined;

  async rank(query: {
    viewerId?: string;
    filters?: ListingFilterCriteria;
    sort: FeedSort;
    cursor?: FeedCursor;
    limit: number;
  }): Promise<{ items: Listing[]; nextCursor?: FeedCursor }> {
    this.lastViewerId = query.viewerId;
    this.lastSort = query.sort;
    this.lastCursor = query.cursor;
    const result: { items: Listing[]; nextCursor?: FeedCursor } = {
      items: this.items,
    };
    if (this.nextCursor !== undefined) {
      result.nextCursor = this.nextCursor;
    }
    return result;
  }

  async count() {
    return { totalMatching: this.items.length, priceMinTmt: null, priceMaxTmt: null };
  }

  async modelCounts(): Promise<Array<{ modelId: string; totalMatching: number }>> {
    return [];
  }

  async brandCounts(): Promise<Array<{ brandId: string; totalMatching: number }>> {
    return [];
  }
}

class FakeExchangeRatePort implements ExchangeRatePort {
  rates: Record<string, number> = {};

  async getRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    return this.rates[`${from}->${to}`] ?? 0;
  }

  async listAll() {
    return Object.entries(this.rates).map(([key, rate]) => {
      const [fromCurrency, toCurrency] = key.split("->") as ["TMT" | "USD" | "AED", "TMT" | "USD" | "AED"];
      return { fromCurrency, toCurrency, rate, updatedAt: new Date() };
    });
  }
}

class FakeMediaStoragePort implements MediaStoragePort {
  resolvePublicUrl(key: string): string {
    return `https://media.auto.tm/${key}`;
  }

  async presignUpload(): Promise<{ url: string; key: string }> {
    return { url: "", key: "" };
  }

  async deleteObject(): Promise<void> {}
}

class FakeFavoriteRepository implements FavoriteRepository {
  favorites = new Set<string>();
  lookups = 0;

  async add(): Promise<never> {
    throw new Error("not used");
  }

  async remove(): Promise<boolean> {
    return false;
  }

  async exists(userId: string, listingId: string): Promise<boolean> {
    return this.favorites.has(`${userId}:${listingId}`);
  }

  async favoritedListingIds(userId: string, listingIds: string[]): Promise<Set<string>> {
    this.lookups += 1;
    return new Set(listingIds.filter((id) => this.favorites.has(`${userId}:${id}`)));
  }

  async listByUserId() {
    return { items: [] };
  }
}

class FakeListingCardReadPort implements ListingCardReadPort {
  photos = new Map<string, CardPhotos>();
  photoLookups = 0;

  async getCardPhotos(listingIds: string[]): Promise<Map<string, CardPhotos>> {
    this.photoLookups += 1;
    return new Map([...this.photos].filter(([id]) => listingIds.includes(id)));
  }

  async getVisibleCards(): Promise<ListingCard[]> {
    return [];
  }

  async getOwnerCards(): Promise<{ items: ListingCard[] }> {
    return { items: [] };
  }
}

function makeUseCase(
  ranking?: FakeFeedRankingPort,
  exchangeRates?: FakeExchangeRatePort,
  storage?: FakeMediaStoragePort,
  favorites?: FakeFavoriteRepository,
  cards?: FakeListingCardReadPort,
  sellerProfiles?: FakeSellerProfilePort,
) {
  return new ListFeed(
    ranking ?? new FakeFeedRankingPort(),
    exchangeRates ?? new FakeExchangeRatePort(),
    storage ?? new FakeMediaStoragePort(),
    favorites ?? new FakeFavoriteRepository(),
    cards ?? new FakeListingCardReadPort(),
    sellerProfiles ?? new FakeSellerProfilePort(),
  );
}

describe("ListFeed", () => {
  let ranking: FakeFeedRankingPort;
  let exchangeRates: FakeExchangeRatePort;

  beforeEach(() => {
    ranking = new FakeFeedRankingPort();
    exchangeRates = new FakeExchangeRatePort();
  });

  function seedListing(overrides?: Partial<Parameters<typeof Listing.create>[0]>) {
    return Listing.create({
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
  }

  it("returns empty feed when no listings", async () => {
    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({});

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("returns listings mapped to summary DTOs", async () => {
    ranking.items = [seedListing({ id: "l1" }), seedListing({ id: "l2" })];

    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({});

    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.id).toBe("l1");
    expect(result.items[0]!.displayPriceTmt).toBe(100000);
  });

  it("includes coverMediaKey when listing has media", async () => {
    ranking.items = [seedListing({ id: "l1", coverMediaKey: "listings/l1/m1/original.jpg" })];

    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({});

    expect(result.items[0]!.coverMediaKey).toBe("listings/l1/m1/original.jpg");
  });

  it("omits coverMediaKey when listing has no media", async () => {
    ranking.items = [seedListing({ id: "l1" })];

    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({});

    expect(result.items[0]!.coverMediaKey).toBeUndefined();
  });

  it("computes displayPriceTmt for USD listings", async () => {
    ranking.items = [seedListing({ id: "l1", priceAmount: 1000, priceCurrency: "USD" })];
    exchangeRates.rates["USD->TMT"] = 3.5;

    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({});

    expect(result.items[0]!.displayPriceTmt).toBe(3500);
  });

  it("encodes nextCursor from ranking result", async () => {
    ranking.items = [seedListing({ id: "l1" })];
    ranking.nextCursor = {
      sort: "price_asc",
      value: 35000,
      id: "00000000-0000-0000-0000-000000000001",
    };

    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({ sort: "price_asc" });

    expect(ListingsSchemas.decodeFeedCursor(result.nextCursor as string)).toEqual(
      ranking.nextCursor,
    );
  });

  it("defaults to the newest order", async () => {
    await makeUseCase(ranking, exchangeRates).execute({});
    expect(ranking.lastSort).toBe("newest");
  });

  it("passes the requested order to the ranking port", async () => {
    await makeUseCase(ranking, exchangeRates).execute({ sort: "mileage_asc" });
    expect(ranking.lastSort).toBe("mileage_asc");
  });

  it("decodes a cursor for the requested order and passes it on", async () => {
    const cursor = {
      sort: "year_desc",
      value: null,
      id: "00000000-0000-0000-0000-000000000001",
    } as const;

    await makeUseCase(ranking, exchangeRates).execute({
      sort: "year_desc",
      cursor: ListingsSchemas.encodeFeedCursor(cursor),
    });

    expect(ranking.lastCursor).toEqual(cursor);
  });

  it("rejects a cursor from another order with a 400", async () => {
    const cursor = ListingsSchemas.encodeFeedCursor({
      sort: "price_asc",
      value: 1000,
      id: "00000000-0000-0000-0000-000000000001",
    });

    const uc = makeUseCase(ranking, exchangeRates);
    await expect(uc.execute({ sort: "price_desc", cursor })).rejects.toThrow(
      BadRequestException,
    );
    await expect(uc.execute({ cursor })).rejects.toThrow(BadRequestException);
    expect(ranking.lastSort).toBeUndefined();
  });

  it("rejects a malformed cursor with a 400", async () => {
    const legacy = Buffer.from(
      JSON.stringify({ timestamp: "2026-05-01T00:00:00Z", id: "00000000-0000-0000-0000-000000000001" }),
      "utf8",
    ).toString("base64url");

    const uc = makeUseCase(ranking, exchangeRates);
    await expect(uc.execute({ cursor: "not-a-cursor" })).rejects.toThrow(BadRequestException);
    await expect(uc.execute({ cursor: legacy })).rejects.toThrow(BadRequestException);
  });

  it("includes sellerTrust.phoneVerified on summary DTOs", async () => {
    ranking.items = [seedListing({ id: "l1" })];

    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({});

    expect(result.items[0]!.sellerTrust).toEqual({ phoneVerified: true });
  });

  it("uses the seller profile for feed trust and reads a page in one batch", async () => {
    ranking.items = [
      seedListing({ id: "l1", sellerId: "user-1" }),
      seedListing({ id: "l2", sellerId: "user-1" }),
    ];
    const profiles = new FakeSellerProfilePort();
    profiles.profiles.set("user-1", {
      displayName: null,
      memberSince: new Date("2025-01-01T00:00:00Z"),
      phoneVerified: false,
    });

    const result = await makeUseCase(
      ranking, exchangeRates, undefined, undefined, undefined, profiles,
    ).execute({});

    expect(result.items.map((item) => item.sellerTrust.phoneVerified)).toEqual([false, false]);
    expect(profiles.batchCalls).toBe(1);
  });

  it("throws on missing exchange rate for non-TMT currency", async () => {
    ranking.items = [seedListing({ id: "l1", priceAmount: 1000, priceCurrency: "USD" })];

    const uc = makeUseCase(ranking, exchangeRates);
    await expect(uc.execute({})).rejects.toThrow("Missing exchange rate");
  });

  it("forwards filters to ranking port", async () => {
    let receivedFilters: ListingFilterCriteria | undefined;

    const spyRanking: FeedRankingPort = {
      async rank(query) {
        receivedFilters = query.filters;
        return { items: [] };
      },
      async count() {
        return { totalMatching: 0, priceMinTmt: null, priceMaxTmt: null };
      },
      async modelCounts() {
        return [];
      },
      async brandCounts() {
        return [];
      },
    };

    const uc = new ListFeed(
      spyRanking,
      exchangeRates,
      new FakeMediaStoragePort(),
      new FakeFavoriteRepository(),
      new FakeListingCardReadPort(),
      new FakeSellerProfilePort(),
    );
    await uc.execute({ filters: { brandId: "brand-x", priceMin: 50000 } });

    expect(receivedFilters).toEqual({ brandId: "brand-x", priceMin: 50000 });
  });

  it("returns photoKeys and photoCount from one batched photo read", async () => {
    ranking.items = [seedListing({ id: "l1" }), seedListing({ id: "l2" })];
    const cards = new FakeListingCardReadPort();
    cards.photos.set("l1", { coverMediaKey: "a", photoKeys: ["a", "b"], photoCount: 5 });

    const uc = makeUseCase(ranking, exchangeRates, undefined, undefined, cards);
    const result = await uc.execute({});

    expect(cards.photoLookups).toBe(1);
    expect(result.items[0]!.photoKeys).toEqual(["a", "b"]);
    expect(result.items[0]!.photoCount).toBe(5);
    expect(result.items[1]!.photoKeys).toEqual([]);
    expect(result.items[1]!.photoCount).toBe(0);
  });

  it("returns mileageKm, condition, transmissionId, and engineTypeId when set", async () => {
    ranking.items = [
      seedListing({
        id: "l1",
        mileageKm: 0,
        condition: "new",
        transmissionId: "transmission-1",
        engineTypeId: "engine-1",
      }),
    ];

    const uc = makeUseCase(ranking, exchangeRates);
    const [item] = (await uc.execute({})).items;

    expect(item).toMatchObject({
      mileageKm: 0,
      condition: "new",
      transmissionId: "transmission-1",
      engineTypeId: "engine-1",
    });
  });

  it("omits mileageKm, condition, transmissionId, and engineTypeId when not set", async () => {
    ranking.items = [seedListing({ id: "l1" })];

    const uc = makeUseCase(ranking, exchangeRates);
    const [item] = (await uc.execute({})).items;

    expect(item).not.toHaveProperty("mileageKm");
    expect(item).not.toHaveProperty("condition");
    expect(item).not.toHaveProperty("transmissionId");
    expect(item).not.toHaveProperty("engineTypeId");
  });

  it("marks isFavorited for a signed-in viewer with one favorites lookup per page", async () => {
    ranking.items = [seedListing({ id: "l1" }), seedListing({ id: "l2" })];
    const favorites = new FakeFavoriteRepository();
    favorites.favorites.add("viewer-1:l2");

    const uc = makeUseCase(ranking, exchangeRates, undefined, favorites);
    const result = await uc.execute({ viewerId: "viewer-1" });

    expect(result.items.map((i) => i.isFavorited)).toEqual([false, true]);
    expect(favorites.lookups).toBe(1);
    expect(ranking.lastViewerId).toBe("viewer-1");
  });

  it("omits isFavorited and skips the favorites lookup for an anonymous viewer", async () => {
    ranking.items = [seedListing({ id: "l1" })];
    const favorites = new FakeFavoriteRepository();

    const uc = makeUseCase(ranking, exchangeRates, undefined, favorites);
    const result = await uc.execute({});

    expect(result.items[0]).not.toHaveProperty("isFavorited");
    expect(favorites.lookups).toBe(0);
  });
});
