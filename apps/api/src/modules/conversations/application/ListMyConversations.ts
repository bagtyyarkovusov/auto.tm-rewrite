import { Inject, Injectable } from "@nestjs/common";

import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
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
    listing: {
      id: string;
      sellerId: string;
      status: string;
      brandId: string;
      modelId: string;
      year?: number;
      priceAmount: number;
      priceCurrency: "TMT" | "USD" | "AED";
      displayPriceTmt: number;
      coverMediaKey?: string;
      allowChat: boolean;
    } | null;
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

    const listingIds = items.map((c) => c.listingId);
    const listingSummaries =
      listingIds.length > 0
        ? await this.listings.getListingSummaries(listingIds)
        : [];
    const listingMap = new Map(listingSummaries.map((l) => [l.id, l]));

    return {
      items: items.map((conversation) => ({
        conversation,
        listing: listingMap.get(conversation.listingId) ?? null,
      })),
      nextCursor,
    };
  }
}
