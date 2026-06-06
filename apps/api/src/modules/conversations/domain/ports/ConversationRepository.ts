import type { Conversation } from "../Conversation";
import type { Message } from "../Message";

export interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByListingAndBuyer(
    listingId: string,
    buyerId: string,
  ): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<void>;

  listMessages(
    conversationId: string,
    query: {
      cursor?: string;
      limit?: number;
    },
  ): Promise<{
    items: Message[];
    nextCursor: string | null;
  }>;

  saveMessage(message: Message): Promise<void>;
}

export const CONVERSATION_REPOSITORY = Symbol("ConversationRepository");
