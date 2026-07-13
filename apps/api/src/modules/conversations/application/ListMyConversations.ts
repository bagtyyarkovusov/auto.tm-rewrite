import { Inject, Injectable } from "@nestjs/common";

import type {
  ListingsReadPort,
  ListingSummary,
} from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import type { Message } from "../domain/Message";
import type { Conversation } from "../domain/Conversation";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

export interface ListMyConversationsInput {
  userId: string;
  cursor?: string;
  limit?: number;
}

export interface ListMyConversationsResult {
  items: Array<{
    conversation: Conversation;
    listing: ListingSummary | null;
    lastMessage: Message | null;
    unreadCount: number;
  }>;
  nextCursor: string | null;
}

@Injectable()
export class ListMyConversations {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listings: ListingsReadPort,
  ) {}

  async execute(
    input: ListMyConversationsInput,
  ): Promise<ListMyConversationsResult> {
    const limit = input.limit ?? 20;
    const { items, nextCursor } = await this.conversations.listForUser(
      input.userId,
      { ...(input.cursor ? { cursor: input.cursor } : {}), limit },
    );

    const listingIds = items.map((item) => item.conversation.listingId);
    const listingSummaries =
      listingIds.length > 0
        ? await this.listings.getListingSummaries(listingIds)
        : [];
    const listingMap = new Map(listingSummaries.map((l) => [l.id, l]));

    const enriched = await Promise.all(
      items.map(async (item) => {
        const unreadCount = await this.conversations.countUnreadMessages(
          input.userId,
          item.conversation.id,
        );
        return {
          conversation: item.conversation,
          listing: listingMap.get(item.conversation.listingId) ?? null,
          lastMessage: item.lastMessage,
          unreadCount,
        };
      }),
    );

    return {
      items: enriched,
      nextCursor,
    };
  }
}
