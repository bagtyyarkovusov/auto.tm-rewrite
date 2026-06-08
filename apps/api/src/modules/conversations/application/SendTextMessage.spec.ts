import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";

import { Conversation } from "../domain/Conversation";
import { Message } from "../domain/Message";
import type { ConversationRepository } from "../domain/ports/ConversationRepository";
import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";

import { SendTextMessage } from "./SendTextMessage";

class FakeConversationRepository implements ConversationRepository {
  conversations: Conversation[] = [];
  messages: Message[] = [];

  async findById(id: string): Promise<Conversation | null> {
    return this.conversations.find((c) => c.id === id) ?? null;
  }

  async findByListingAndBuyer(): Promise<Conversation | null> {
    return null;
  }

  async save(conversation: Conversation): Promise<void> {
    this.conversations.push(conversation);
  }

  async listForUser(): Promise<{
    items: Conversation[];
    nextCursor: string | null;
  }> {
    return { items: [], nextCursor: null };
  }

  async listMessages(): Promise<{
    items: Message[];
    nextCursor: string | null;
  }> {
    return { items: [], nextCursor: null };
  }

  async saveMessage(message: Message): Promise<void> {
    this.messages.push(message);
  }
}

class FakeListingsReadPort implements ListingsReadPort {
  listings: Array<{
    id: string;
    sellerId: string;
    status: "active" | "sold" | "archived" | "banned";
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
    const listing = this.listings.find((l) => l.id === id);
    if (!listing) return null;
    if (listing.status === "banned") return null;
    return listing;
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
  return new SendTextMessage(
    repo ?? new FakeConversationRepository(),
    listings ?? new FakeListingsReadPort(),
  );
}

function seedConversation(
  repo: FakeConversationRepository,
  overrides?: Partial<Conversation>,
) {
  const c = Conversation.create({
    id: "conv-1",
    listingId: "listing-1",
    buyerId: "buyer-1",
    sellerId: "seller-1",
    ...overrides,
  });
  repo.conversations.push(c);
  return c;
}

function seedListing(
  listings: FakeListingsReadPort,
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

describe("SendTextMessage", () => {
  let repo: FakeConversationRepository;
  let listings: FakeListingsReadPort;

  beforeEach(() => {
    repo = new FakeConversationRepository();
    listings = new FakeListingsReadPort();
  });

  it("sends a valid text message as buyer", async () => {
    seedConversation(repo);
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    const result = await uc.execute({
      senderId: "buyer-1",
      conversationId: "conv-1",
      text: "Hello, is it still available?",
    });

    expect(result.message.text).toBe("Hello, is it still available?");
    expect(result.message.senderId).toBe("buyer-1");
    expect(result.message.conversationId).toBe("conv-1");
    expect(result.listing).not.toBeNull();
    expect(repo.messages).toHaveLength(1);
  });

  it("sends a valid text message as seller", async () => {
    seedConversation(repo);
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    const result = await uc.execute({
      senderId: "seller-1",
      conversationId: "conv-1",
      text: "Yes, it is available",
    });

    expect(result.message.senderId).toBe("seller-1");
    expect(repo.messages).toHaveLength(1);
  });

  it("trims leading and trailing whitespace", async () => {
    seedConversation(repo);
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    const result = await uc.execute({
      senderId: "buyer-1",
      conversationId: "conv-1",
      text: "  Hello world  ",
    });

    expect(result.message.text).toBe("Hello world");
  });

  it("preserves internal line breaks", async () => {
    seedConversation(repo);
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    const text = "line one\nline two";
    const result = await uc.execute({
      senderId: "buyer-1",
      conversationId: "conv-1",
      text,
    });

    expect(result.message.text).toBe(text);
  });

  it("rejects non-existent conversation", async () => {
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "buyer-1",
        conversationId: "missing",
        text: "Hello",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects non-participant sender", async () => {
    seedConversation(repo);
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "random-user",
        conversationId: "conv-1",
        text: "Hello",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects blank text", async () => {
    seedConversation(repo);
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "buyer-1",
        conversationId: "conv-1",
        text: "   ",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects empty text", async () => {
    seedConversation(repo);
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "buyer-1",
        conversationId: "conv-1",
        text: "",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects text longer than 1000 chars after trim", async () => {
    seedConversation(repo);
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "buyer-1",
        conversationId: "conv-1",
        text: "a".repeat(1001),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("accepts text at exactly 1000 chars", async () => {
    seedConversation(repo);
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    const result = await uc.execute({
      senderId: "buyer-1",
      conversationId: "conv-1",
      text: "a".repeat(1000),
    });

    expect(result.message.text).toBe("a".repeat(1000));
  });

  it("blocks sends when listing is sold", async () => {
    seedConversation(repo);
    seedListing(listings, { status: "sold" });
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "buyer-1",
        conversationId: "conv-1",
        text: "Hello",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("blocks sends when listing is archived", async () => {
    seedConversation(repo);
    seedListing(listings, { status: "archived" });
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "buyer-1",
        conversationId: "conv-1",
        text: "Hello",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("blocks sends when listing is banned", async () => {
    seedConversation(repo);
    seedListing(listings, { status: "banned" });
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "buyer-1",
        conversationId: "conv-1",
        text: "Hello",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("blocks sends when listing is unavailable (deleted)", async () => {
    seedConversation(repo);
    // Do not seed listing → getListingSummary returns null
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "buyer-1",
        conversationId: "conv-1",
        text: "Hello",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("blocks sends when listing has allowChat = false", async () => {
    seedConversation(repo);
    seedListing(listings, { allowChat: false });
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({
        senderId: "buyer-1",
        conversationId: "conv-1",
        text: "Hello",
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
