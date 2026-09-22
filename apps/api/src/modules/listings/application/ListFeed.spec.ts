import { describe, it, expect, beforeEach } from "vitest";
import { ListFeed } from "./ListFeed";
import { Listing } from "../domain/Listing";
import type { CardPhotos } from "../domain/CardPhotos";
import type { FavoriteRepository } from "../domain/ports/FavoriteRepository";
import type { FeedRankingPort, RankedListing } from "../domain/ports/FeedRankingPort";
import type { ExchangeRatePort } from "../domain/ports/ExchangeRatePort";
import type { MediaStoragePort } from "../domain/ports/MediaStoragePort";
import type { ListingFilterCriteria } from "../domain/types";

const NO_PHOTOS: CardPhotos = { photoKeys: [], photoCount: 0 };

class FakeFeedRankingPort implements FeedRankingPort {
  items: Listing[] = [];
  photos = new Map<string, CardPhotos>();
  nextCursor?: { timestamp: string; id: string };
  lastViewerId: string | undefined;

  async rank(query: {
    viewerId?: string;
    filters?: ListingFilterCriteria;
    cursor?: { timestamp: string; id: string };
    limit: number;
  }): Promise<{ items: RankedListing[]; nextCursor?: { timestamp: string; id: string } }> {
    this.lastViewerId = query.viewerId;
    const result: { items: RankedListing[]; nextCursor?: { timestamp: string; id: string } } = {
      items: this.items.map((listing) => ({
        listing,
        photos: this.photos.get(listing.id) ?? NO_PHOTOS,
      })),
    };
    if (this.nextCursor !== undefined) {
      result.nextCursor = this.nextCursor;
    }
    return result;
  }

  async count(): Promise<number> {
    return this.items.length;
  }

  async modelCounts(): Promise<Array<{ modelId: string; totalMatching: number }>> {
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

function makeUseCase(
  ranking?: FakeFeedRankingPort,
  exchangeRates?: FakeExchangeRatePort,
  storage?: FakeMediaStoragePort,
  favorites?: FakeFavoriteRepository,
) {
  return new ListFeed(
    ranking ?? new FakeFeedRankingPort(),
    exchangeRates ?? new FakeExchangeRatePort(),
    storage ?? new FakeMediaStoragePort(),
    favorites ?? new FakeFavoriteRepository(),
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
    ranking.nextCursor = { timestamp: "2026-05-01T00:00:00Z", id: "l1" };

    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({});

    expect(result.nextCursor).not.toBeNull();
    expect(typeof result.nextCursor).toBe("string");
  });

  it("decodes cursor and passes to ranking port", async () => {
    let receivedCursor: { timestamp: string; id: string } | undefined;

    const spyRanking: FeedRankingPort = {
      async rank(query) {
        receivedCursor = query.cursor;
        return { items: [] };
      },
      async count() {
        return 0;
      },
      async modelCounts() {
        return [];
      },
    };

    const uc = new ListFeed(
      spyRanking,
      exchangeRates,
      new FakeMediaStoragePort(),
      new FakeFavoriteRepository(),
    );
    const cursor = Buffer.from(
      JSON.stringify({ timestamp: "2026-05-01T00:00:00Z", id: "00000000-0000-0000-0000-000000000001" }),
      "utf8",
    ).toString("base64url");

    await uc.execute({ cursor });
    expect(receivedCursor).toEqual({ timestamp: "2026-05-01T00:00:00Z", id: "00000000-0000-0000-0000-000000000001" });
  });

  it("includes sellerTrust.phoneVerified on summary DTOs", async () => {
    ranking.items = [seedListing({ id: "l1" })];

    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({});

    expect(result.items[0]!.sellerTrust).toEqual({ phoneVerified: true });
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
        return 0;
      },
      async modelCounts() {
        return [];
      },
    };

    const uc = new ListFeed(
      spyRanking,
      exchangeRates,
      new FakeMediaStoragePort(),
      new FakeFavoriteRepository(),
    );
    await uc.execute({ filters: { brandId: "brand-x", priceMin: 50000 } });

    expect(receivedFilters).toEqual({ brandId: "brand-x", priceMin: 50000 });
  });

  it("returns photoKeys and photoCount from the ranking result", async () => {
    ranking.items = [seedListing({ id: "l1" }), seedListing({ id: "l2" })];
    ranking.photos.set("l1", { coverMediaKey: "a", photoKeys: ["a", "b"], photoCount: 5 });

    const uc = makeUseCase(ranking, exchangeRates);
    const result = await uc.execute({});

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
