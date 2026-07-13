import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

import { Conversation } from "../domain/Conversation";
import { Message } from "../domain/Message";
import type { ConversationRepository } from "../domain/ports/ConversationRepository";

import { MuteConversation } from "./MuteConversation";

class FakeConversationRepository implements ConversationRepository {
  conversations: Conversation[] = [];
  states: Record<
    string,
    { mutedAt: Date | null; lastReadAt: Date | null; lastDeliveredAt: Date | null }
  > = {};

  private key(userId: string, conversationId: string) {
    return `${userId}:${conversationId}`;
  }

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
    items: Array<{ conversation: Conversation; lastMessage: Message | null }>;
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

  async muteConversation(
    userId: string,
    conversationId: string,
    muted: boolean,
  ): Promise<{
    mutedAt: Date | null;
    lastReadAt: Date | null;
    lastDeliveredAt: Date | null;
  }> {
    const key = this.key(userId, conversationId);
    const existing = this.states[key] ?? {
      mutedAt: null,
      lastReadAt: null,
      lastDeliveredAt: null,
    };
    const updated = {
      ...existing,
      mutedAt: muted ? new Date("2026-01-01T00:00:00Z") : null,
    };
    this.states[key] = updated;
    return updated;
  }

  async softDeleteMessage(): Promise<Message | null> {
    return null;
  }

  async countUnreadMessages(): Promise<number> {
    return 0;
  }
}

function makeUseCase(repo?: FakeConversationRepository) {
  return new MuteConversation(repo ?? new FakeConversationRepository());
}

function seedConversation(repo: FakeConversationRepository) {
  const c = Conversation.create({
    id: "conv-1",
    listingId: "listing-1",
    buyerId: "buyer-1",
    sellerId: "seller-1",
  });
  repo.conversations.push(c);
  return c;
}

describe("MuteConversation", () => {
  let repo: FakeConversationRepository;

  beforeEach(() => {
    repo = new FakeConversationRepository();
  });

  it("mutes a conversation for a participant", async () => {
    seedConversation(repo);
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "buyer-1",
      conversationId: "conv-1",
      muted: true,
    });

    expect(result.mutedAt).not.toBeNull();
  });

  it("unmutes a conversation for a participant", async () => {
    seedConversation(repo);
    repo.states["buyer-1:conv-1"] = {
      mutedAt: new Date("2026-01-01T00:00:00Z"),
      lastReadAt: null,
      lastDeliveredAt: null,
    };
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "buyer-1",
      conversationId: "conv-1",
      muted: false,
    });

    expect(result.mutedAt).toBeNull();
  });

  it("rejects non-existent conversation", async () => {
    const uc = makeUseCase(repo);

    await expect(
      uc.execute({
        userId: "buyer-1",
        conversationId: "missing",
        muted: true,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects non-participant user", async () => {
    seedConversation(repo);
    const uc = makeUseCase(repo);

    await expect(
      uc.execute({
        userId: "random-user",
        conversationId: "conv-1",
        muted: true,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
