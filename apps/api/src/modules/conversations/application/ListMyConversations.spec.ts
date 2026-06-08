import { describe, it, expect, beforeEach } from "vitest";

import { Conversation } from "../domain/Conversation";
import type { ConversationRepository } from "../domain/ports/ConversationRepository";
import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";

import { ListMyConversations } from "./ListMyConversations";

class FakeConversationRepository implements ConversationRepository {
  conversations: Conversation[] = [];

  async findById(id: string): Promise<Conversation | null> {
    return this.conversations.find((c) => c.id === id) ?? null;
  }

  async findByListingAndBuyer(
    listingId: string,
    buyerId: string,
  ): Promise<Conversation | null> {
    return (
      this.conversations.find(
        (c) => c.listingId === listingId && c.buyerId === buyerId,
      ) ?? null
    );
  }

  async save(conversation: Conversation): Promise<void> {
    this.conversations.push(conversation);
  }

  async listForUser(
    userId: string,
    query: { cursor?: string; limit?: number },
  ): Promise<{ items: Conversation[]; nextCursor: string | null }> {
    const userConversations = this.conversations
      .filter((c) => c.buyerId === userId || c.sellerId === userId)
      .sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      );

    const limit = query.limit ?? 20;
    let startIndex = 0;

    if (query.cursor) {
      const cursorIndex = userConversations.findIndex(
        (c) => c.id === query.cursor,
      );
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const items = userConversations.slice(startIndex, startIndex + limit);
    const hasMore = userConversations.length > startIndex + limit;
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async listMessages(): Promise<{
    items: import("../domain/Message").Message[];
    nextCursor: string | null;
  }> {
    return { items: [], nextCursor: null };
  }

  async saveMessage(): Promise<void> {}
}

class FakeListingsReadPort implements ListingsReadPort {
  listings: Array<{
    id: string;
    sellerId: string;
    status: "active" | "sold" | "archived";
    brandId: string;
    modelId: string;
    year?: number;
    priceAmount: number;
    priceCurrency: "TMT" | "USD" | "AED";
    displayPriceTmt: number;
    coverMediaKey?: string;
    cityId: string;
    publishedAt: Date;
    allowChat: boolean;
  }> = [];

  async getListingSummary(id: string) {
    return this.listings.find((l) => l.id === id) ?? null;
  }

  async getListingSummaries(ids: string[]) {
    return this.listings.filter((l) => ids.includes(l.id));
  }

  async getListingAdminSummaries(): Promise<[]> {
    return [];
  }

  async getListingsForOwner() {
    return { items: [] };
  }

  async matchesFilters() {
    return true;
  }
}

function makeUseCase(
  repo?: FakeConversationRepository,
  listings?: FakeListingsReadPort,
) {
  return new ListMyConversations(
    repo ?? new FakeConversationRepository(),
    listings ?? new FakeListingsReadPort(),
  );
}

describe("ListMyConversations", () => {
  let repo: FakeConversationRepository;
  let listings: FakeListingsReadPort;

  beforeEach(() => {
    repo = new FakeConversationRepository();
    listings = new FakeListingsReadPort();
  });

  function seedConversation(overrides?: Partial<Conversation>) {
    const c = Conversation.create({
      id: `conv-${repo.conversations.length + 1}`,
      listingId: "listing-1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      ...overrides,
    });
    repo.conversations.push(c);
    return c;
  }

  function seedListing(
    overrides?: Partial<FakeListingsReadPort["listings"][number]>,
  ) {
    const listing = {
      id: "listing-1",
      sellerId: "seller-1",
      status: "active" as const,
      brandId: "brand-1",
      modelId: "model-1",
      year: 2020,
      priceAmount: 100000,
      priceCurrency: "TMT" as const,
      displayPriceTmt: 100000,
      coverMediaKey: "cover.jpg",
      cityId: "city-1",
      publishedAt: new Date("2026-05-01T00:00:00Z"),
      allowChat: true,
      ...overrides,
    };
    listings.listings.push(listing);
    return listing;
  }

  it("lists only the current user's conversations as buyer", async () => {
    seedListing();
    seedConversation({ buyerId: "buyer-1", sellerId: "seller-1" });
    seedConversation({ buyerId: "buyer-2", sellerId: "seller-1" });

    const uc = makeUseCase(repo, listings);
    const result = await uc.execute({ userId: "buyer-1" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.conversation.buyerId).toBe("buyer-1");
  });

  it("lists only the current user's conversations as seller", async () => {
    seedListing();
    seedConversation({ buyerId: "buyer-1", sellerId: "seller-1" });
    seedConversation({ buyerId: "buyer-2", sellerId: "seller-1" });

    const uc = makeUseCase(repo, listings);
    const result = await uc.execute({ userId: "seller-1" });

    expect(result.items).toHaveLength(2);
  });

  it("sorts conversations by updatedAt descending", async () => {
    seedListing();
    const older = seedConversation({
      id: "conv-older",
      buyerId: "buyer-1",
      sellerId: "seller-1",
    });
    const newer = seedConversation({
      id: "conv-newer",
      buyerId: "buyer-1",
      sellerId: "seller-1",
    });

    // Override updatedAt manually (private field, so we replace in array)
    repo.conversations = repo.conversations.map((c) => {
      if (c.id === "conv-older") {
        return Conversation.create({
          ...c,
          createdAt: c.createdAt,
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        });
      }
      if (c.id === "conv-newer") {
        return Conversation.create({
          ...c,
          createdAt: c.createdAt,
          updatedAt: new Date("2026-06-01T00:00:00Z"),
        });
      }
      return c;
    });

    const uc = makeUseCase(repo, listings);
    const result = await uc.execute({ userId: "buyer-1" });

    expect(result.items[0]!.conversation.id).toBe("conv-newer");
    expect(result.items[1]!.conversation.id).toBe("conv-older");
  });

  it("includes listing summary for each conversation", async () => {
    seedListing({ id: "listing-1", brandId: "brand-a", modelId: "model-a" });
    seedConversation({ listingId: "listing-1" });

    const uc = makeUseCase(repo, listings);
    const result = await uc.execute({ userId: "buyer-1" });

    expect(result.items[0]!.listing).not.toBeNull();
    expect(result.items[0]!.listing!.brandId).toBe("brand-a");
    expect(result.items[0]!.listing!.modelId).toBe("model-a");
  });

  it("returns null listing when listing summary is missing", async () => {
    seedConversation({ listingId: "listing-missing" });

    const uc = makeUseCase(repo, listings);
    const result = await uc.execute({ userId: "buyer-1" });

    expect(result.items[0]!.listing).toBeNull();
  });

  it("returns empty array when user has no conversations", async () => {
    const uc = makeUseCase(repo, listings);
    const result = await uc.execute({ userId: "nobody" });

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("respects limit and cursor", async () => {
    seedListing();
    for (let i = 0; i < 3; i++) {
      seedConversation({
        id: `conv-${i + 1}`,
        buyerId: "buyer-1",
        sellerId: "seller-1",
      });
    }

    // Manually set updatedAt descending: conv-3 newest, conv-2, conv-1 oldest
    repo.conversations = repo.conversations.map((c) => {
      const num = parseInt(c.id.replace("conv-", ""), 10);
      return Conversation.create({
        ...c,
        createdAt: c.createdAt,
        updatedAt: new Date(2026, 0, num),
      });
    });

    const uc = makeUseCase(repo, listings);
    const first = await uc.execute({ userId: "buyer-1", limit: 1 });

    expect(first.items).toHaveLength(1);
    expect(first.items[0]!.conversation.id).toBe("conv-3");
    expect(first.nextCursor).toBe("conv-3");

    const second = await uc.execute({
      userId: "buyer-1",
      limit: 1,
      cursor: first.nextCursor!,
    });

    expect(second.items).toHaveLength(1);
    expect(second.items[0]!.conversation.id).toBe("conv-2");
    expect(second.nextCursor).toBe("conv-2");
  });
});
