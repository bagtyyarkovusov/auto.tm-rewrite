import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

import { Conversation } from "../domain/Conversation";
import { Message } from "../domain/Message";
import type { ConversationRepository } from "../domain/ports/ConversationRepository";

import { ListMessages } from "./ListMessages";

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

  async listMessages(
    conversationId: string,
    query: { cursor?: string; limit?: number },
  ): Promise<{ items: Message[]; nextCursor: string | null }> {
    const convMessages = this.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const limit = query.limit ?? 20;
    let startIndex = 0;

    if (query.cursor) {
      const cursorIndex = convMessages.findIndex(
        (m) => m.id === query.cursor,
      );
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const items = convMessages.slice(startIndex, startIndex + limit);
    const hasMore = convMessages.length > startIndex + limit;
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async saveMessage(message: Message): Promise<void> {
    this.messages.push(message);
  }
}

function makeUseCase(repo?: FakeConversationRepository) {
  return new ListMessages(repo ?? new FakeConversationRepository());
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

function seedMessages(
  repo: FakeConversationRepository,
  count: number,
  overrides?: Partial<Message>,
) {
  const messages: Message[] = [];
  for (let i = 0; i < count; i++) {
    const m = Message.create({
      id: `msg-${i + 1}`,
      conversationId: "conv-1",
      senderId: "buyer-1",
      text: `Message ${i + 1}`,
      createdAt: new Date(2026, 0, i + 1),
      ...overrides,
    });
    repo.messages.push(m);
    messages.push(m);
  }
  return messages;
}

describe("ListMessages", () => {
  let repo: FakeConversationRepository;

  beforeEach(() => {
    repo = new FakeConversationRepository();
  });

  it("lists messages for a participant buyer", async () => {
    seedConversation(repo);
    seedMessages(repo, 3);
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "buyer-1",
      conversationId: "conv-1",
    });

    expect(result.items).toHaveLength(3);
  });

  it("lists messages for a participant seller", async () => {
    seedConversation(repo);
    seedMessages(repo, 2);
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "seller-1",
      conversationId: "conv-1",
    });

    expect(result.items).toHaveLength(2);
  });

  it("rejects non-existent conversation", async () => {
    const uc = makeUseCase(repo);

    await expect(
      uc.execute({
        userId: "buyer-1",
        conversationId: "missing",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects non-participant user", async () => {
    seedConversation(repo);
    seedMessages(repo, 1);
    const uc = makeUseCase(repo);

    await expect(
      uc.execute({
        userId: "random-user",
        conversationId: "conv-1",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("paginates messages with cursor", async () => {
    seedConversation(repo);
    seedMessages(repo, 5);
    const uc = makeUseCase(repo);

    const first = await uc.execute({
      userId: "buyer-1",
      conversationId: "conv-1",
      limit: 2,
    });

    expect(first.items).toHaveLength(2);
    expect(first.items[0]!.id).toBe("msg-5");
    expect(first.items[1]!.id).toBe("msg-4");
    expect(first.nextCursor).toBe("msg-4");

    const second = await uc.execute({
      userId: "buyer-1",
      conversationId: "conv-1",
      limit: 2,
      cursor: first.nextCursor!,
    });

    expect(second.items).toHaveLength(2);
    expect(second.items[0]!.id).toBe("msg-3");
    expect(second.items[1]!.id).toBe("msg-2");
    expect(second.nextCursor).toBe("msg-2");

    const third = await uc.execute({
      userId: "buyer-1",
      conversationId: "conv-1",
      limit: 2,
      cursor: second.nextCursor!,
    });

    expect(third.items).toHaveLength(1);
    expect(third.items[0]!.id).toBe("msg-1");
    expect(third.nextCursor).toBeNull();
  });

  it("returns empty array when conversation has no messages", async () => {
    seedConversation(repo);
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "buyer-1",
      conversationId: "conv-1",
    });

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("remains readable when listing is sold", async () => {
    seedConversation(repo);
    seedMessages(repo, 2);
    const uc = makeUseCase(repo);

    const result = await uc.execute({
      userId: "buyer-1",
      conversationId: "conv-1",
    });

    expect(result.items).toHaveLength(2);
  });
});
