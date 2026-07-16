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
    peerLastReadAt: Date | null;
    peerLastDeliveredAt: Date | null;
    mutedAt: Date | null;
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

    const conversationIds = items.map((item) => item.conversation.id);
    const participantStates =
      await this.conversations.getParticipantStatesForConversations(
        conversationIds,
      );

    const enriched = await Promise.all(
      items.map(async (item) => {
        const unreadCount = await this.conversations.countUnreadMessages(
          input.userId,
          item.conversation.id,
        );
        const states = participantStates.get(item.conversation.id) ?? [];
        const peerState = states.find(
          (state) => state.userId !== input.userId,
        );
        const ownState = states.find(
          (state) => state.userId === input.userId,
        );
        return {
          conversation: item.conversation,
          listing: listingMap.get(item.conversation.listingId) ?? null,
          lastMessage: item.lastMessage,
          unreadCount,
          peerLastReadAt: peerState?.lastReadAt ?? null,
          peerLastDeliveredAt: peerState?.lastDeliveredAt ?? null,
          mutedAt: ownState?.mutedAt ?? null,
        };
      }),
    );

    return {
      items: enriched,
      nextCursor,
    };
  }
}
