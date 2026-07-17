import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

import { Conversation } from "../domain/Conversation";
import { Message } from "../domain/Message";
import type { ConversationRepository } from "../domain/ports/ConversationRepository";
import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";
import type { IdentityCheckPort } from "../../identity/domain/ports/IdentityCheckPort";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";

import { OpenConversation } from "./OpenConversation";

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

  async listForUser(): Promise<{
    items: Array<{ conversation: Conversation; lastMessage: Message | null }>;
    nextCursor: string | null;
  }> {
    return { items: [], nextCursor: null };
  }

  async listMessages(): Promise<{
    items: import("../domain/Message").Message[];
    nextCursor: string | null;
  }> {
    return { items: [], nextCursor: null };
  }

  async findMessageById(): Promise<null> {
    return null;
  }

  async findMessageByClientMessageId(): Promise<null> {
    return null;
  }

  async saveMessage(): Promise<void> {}

  async updateWatermark(): Promise<{
    mutedAt: Date | null;
    lastReadAt: Date | null;
    lastDeliveredAt: Date | null;
  }> {
    return { mutedAt: null, lastReadAt: null, lastDeliveredAt: null };
  }

  async getParticipantState(): Promise<{
    mutedAt: Date | null;
    lastReadAt: Date | null;
    lastDeliveredAt: Date | null;
  } | null> {
    return { mutedAt: null, lastReadAt: null, lastDeliveredAt: null };
  }

  async muteConversation(): Promise<{
    mutedAt: Date | null;
    lastReadAt: Date | null;
    lastDeliveredAt: Date | null;
  }> {
    return { mutedAt: null, lastReadAt: null, lastDeliveredAt: null };
  }

  async softDeleteMessage(): Promise<null> {
    return null;
  }

  async getParticipantStatesForConversations(
    _conversationIds: string[],
  ): Promise<
    Map<string, Array<{ userId: string; mutedAt: Date | null; lastReadAt: Date | null; lastDeliveredAt: Date | null }>>
  > {
    return new Map();
  }

  async countUnreadMessages(): Promise<number> {
    return 0;
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

class FakeIdentityCheckPort implements IdentityCheckPort {
  suspendedUsers = new Set<string>();

  async isAdmin(): Promise<boolean> {
    return false;
  }

  async isInDealership(): Promise<boolean> {
    return false;
  }

  async isSuspended(userId: string): Promise<boolean> {
    return this.suspendedUsers.has(userId);
  }

  suspend(userId: string) {
    this.suspendedUsers.add(userId);
  }
}

class FakeIdentityReadPort implements IdentityReadPort {
  blockedPairs = new Set<string>();

  async findUserById(): Promise<null> {
    return null;
  }

  async findUsersByIds(): Promise<[]> {
    return [];
  }

  async isUserBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
    return this.blockedPairs.has(`${blockerId}:${blockedId}`);
  }

  block(blockerId: string, blockedId: string) {
    this.blockedPairs.add(`${blockerId}:${blockedId}`);
  }
}

function makeUseCase(
  repo?: FakeConversationRepository,
  listings?: FakeListingsReadPort,
  identityCheck?: FakeIdentityCheckPort,
  identityRead?: FakeIdentityReadPort,
) {
  return new OpenConversation(
    repo ?? new FakeConversationRepository(),
    listings ?? new FakeListingsReadPort(),
    identityCheck ?? new FakeIdentityCheckPort(),
    identityRead ?? new FakeIdentityReadPort(),
  );
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

describe("OpenConversation", () => {
  let repo: FakeConversationRepository;
  let listings: FakeListingsReadPort;

  beforeEach(() => {
    repo = new FakeConversationRepository();
    listings = new FakeListingsReadPort();
  });

  it("creates a conversation for a valid non-owner active listing", async () => {
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    const result = await uc.execute({
      buyerId: "buyer-1",
      listingId: "listing-1",
    });

    expect(result.conversation.listingId).toBe("listing-1");
    expect(result.conversation.buyerId).toBe("buyer-1");
    expect(result.conversation.sellerId).toBe("seller-1");
    expect(result.listing.id).toBe("listing-1");
    expect(repo.conversations).toHaveLength(1);
  });

  it("returns the same conversation on duplicate open", async () => {
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    const first = await uc.execute({
      buyerId: "buyer-1",
      listingId: "listing-1",
    });
    const second = await uc.execute({
      buyerId: "buyer-1",
      listingId: "listing-1",
    });

    expect(second.conversation.id).toBe(first.conversation.id);
    expect(repo.conversations).toHaveLength(1);
  });

  it("rejects seller self-contact", async () => {
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({ buyerId: "seller-1", listingId: "listing-1" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects non-existent listing", async () => {
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({ buyerId: "buyer-1", listingId: "missing" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects sold listing for new contact", async () => {
    seedListing(listings, { status: "sold" });
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({ buyerId: "buyer-1", listingId: "listing-1" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects archived listing for new contact", async () => {
    seedListing(listings, { status: "archived" });
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({ buyerId: "buyer-1", listingId: "listing-1" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("returns NOT_FOUND for banned listing (hidden by getListingSummary)", async () => {
    seedListing(listings, { status: "banned" });
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({ buyerId: "buyer-1", listingId: "listing-1" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects listing with allowChat = false", async () => {
    seedListing(listings, { allowChat: false });
    const uc = makeUseCase(repo, listings);

    await expect(
      uc.execute({ buyerId: "buyer-1", listingId: "listing-1" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("returns the existing conversation even when listing is now sold", async () => {
    seedListing(listings);
    const uc = makeUseCase(repo, listings);

    const first = await uc.execute({
      buyerId: "buyer-1",
      listingId: "listing-1",
    });

    // Simulate listing becoming sold
    listings.listings[0]!.status = "sold";

    const second = await uc.execute({
      buyerId: "buyer-1",
      listingId: "listing-1",
    });

    expect(second.conversation.id).toBe(first.conversation.id);
  });

  it("blocks new contact when buyer is suspended", async () => {
    seedListing(listings);
    const identity = new FakeIdentityCheckPort();
    identity.suspend("buyer-1");
    const uc = makeUseCase(repo, listings, identity);

    await expect(
      uc.execute({ buyerId: "buyer-1", listingId: "listing-1" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("blocks new contact when seller is suspended", async () => {
    seedListing(listings);
    const identity = new FakeIdentityCheckPort();
    identity.suspend("seller-1");
    const uc = makeUseCase(repo, listings, identity);

    await expect(
      uc.execute({ buyerId: "buyer-1", listingId: "listing-1" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("blocks new contact when buyer is blocked by seller", async () => {
    seedListing(listings);
    const identityRead = new FakeIdentityReadPort();
    identityRead.block("seller-1", "buyer-1");
    const uc = makeUseCase(repo, listings, undefined, identityRead);

    await expect(
      uc.execute({ buyerId: "buyer-1", listingId: "listing-1" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("blocks new contact when buyer has blocked seller", async () => {
    seedListing(listings);
    const identityRead = new FakeIdentityReadPort();
    identityRead.block("buyer-1", "seller-1");
    const uc = makeUseCase(repo, listings, undefined, identityRead);

    await expect(
      uc.execute({ buyerId: "buyer-1", listingId: "listing-1" }),
    ).rejects.toThrow(ForbiddenException);
  });
});
