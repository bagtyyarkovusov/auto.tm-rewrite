import { describe, it, expect, beforeEach } from "vitest";
import { ListMyListings } from "./ListMyListings";
import type { ListingsReadPort, ListingSummary } from "../domain/ports/ListingsReadPort";

class FakeListingsReadPort implements ListingsReadPort {
  summaries: ListingSummary[] = [];
  nextCursor?: { timestamp: string; id: string };

  async getListingSummary(_id: string): Promise<ListingSummary | null> {
    return this.summaries[0] ?? null;
  }

  async getListingSummaries(_ids: string[]): Promise<ListingSummary[]> {
    return this.summaries;
  }

  async getListingAdminSummaries(): Promise<[]> {
    return [];
  }

  async getListingsForOwner(
    _ownerId: string,
    query?: { cursor?: { timestamp: string; id: string }; limit?: number },
  ): Promise<{ items: ListingSummary[]; nextCursor?: { timestamp: string; id: string } }> {
    const result: { items: ListingSummary[]; nextCursor?: { timestamp: string; id: string } } = { items: this.summaries };
    if (this.nextCursor !== undefined) {
      result.nextCursor = this.nextCursor;
    }
    return result;
  }

  async matchesFilters(_listingId: string, _filters: Record<string, unknown>): Promise<boolean> {
    return true;
  }
}

function makeUseCase(port?: FakeListingsReadPort) {
  return new ListMyListings(port ?? new FakeListingsReadPort());
}

describe("ListMyListings", () => {
  let port: FakeListingsReadPort;

  beforeEach(() => {
    port = new FakeListingsReadPort();
  });

  function seedSummary(overrides?: Partial<ListingSummary>): ListingSummary {
    const summary: ListingSummary = {
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
      allowChat: true,
      ...overrides,
    };
    port.summaries.push(summary);
    return summary;
  }

  it("returns owner's listings", async () => {
    seedSummary();
    const uc = makeUseCase(port);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("listing-1");
  });

  it("returns encoded nextCursor", async () => {
    seedSummary();
    port.nextCursor = { timestamp: "2026-05-01T00:00:00Z", id: "listing-1" };

    const uc = makeUseCase(port);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.nextCursor).not.toBeNull();
    expect(typeof result.nextCursor).toBe("string");
  });

  it("returns null nextCursor when no more pages", async () => {
    seedSummary();
    const uc = makeUseCase(port);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.nextCursor).toBeNull();
  });
});
