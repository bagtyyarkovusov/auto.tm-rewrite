import { describe, it, expect, beforeEach } from "vitest";
import { ListFeed } from "./ListFeed";
import { Listing } from "../domain/Listing";
import type { FeedRankingPort } from "../domain/ports/FeedRankingPort";
import type { ExchangeRatePort } from "../domain/ports/ExchangeRatePort";
import type { MediaStoragePort } from "../domain/ports/MediaStoragePort";

class FakeFeedRankingPort implements FeedRankingPort {
  items: Listing[] = [];
  nextCursor?: { timestamp: string; id: string };

  async rank(_query: {
    viewerId?: string;
    filters?: Record<string, unknown>;
    cursor?: { timestamp: string; id: string };
    limit: number;
  }): Promise<{ items: Listing[]; nextCursor?: { timestamp: string; id: string } }> {
    const result: { items: Listing[]; nextCursor?: { timestamp: string; id: string } } = { items: this.items };
    if (this.nextCursor !== undefined) {
      result.nextCursor = this.nextCursor;
    }
    return result;
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

function makeUseCase(
  ranking?: FakeFeedRankingPort,
  exchangeRates?: FakeExchangeRatePort,
  storage?: FakeMediaStoragePort,
) {
  return new ListFeed(
    ranking ?? new FakeFeedRankingPort(),
    exchangeRates ?? new FakeExchangeRatePort(),
    storage ?? new FakeMediaStoragePort(),
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
    };

    const uc = new ListFeed(spyRanking, exchangeRates, new FakeMediaStoragePort());
    const cursor = Buffer.from(
      JSON.stringify({ timestamp: "2026-05-01T00:00:00Z", id: "00000000-0000-0000-0000-000000000001" }),
      "utf8",
    ).toString("base64url");

    await uc.execute({ cursor });
    expect(receivedCursor).toEqual({ timestamp: "2026-05-01T00:00:00Z", id: "00000000-0000-0000-0000-000000000001" });
  });

  it("throws on missing exchange rate for non-TMT currency", async () => {
    ranking.items = [seedListing({ id: "l1", priceAmount: 1000, priceCurrency: "USD" })];

    const uc = makeUseCase(ranking, exchangeRates);
    await expect(uc.execute({})).rejects.toThrow("Missing exchange rate");
  });
});
