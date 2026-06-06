import { randomUUID } from "node:crypto";

import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import type {
  ListingsReadPort,
  ListingSummary,
} from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import { Conversation } from "../domain/Conversation";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

export interface OpenConversationInput {
  buyerId: string;
  listingId: string;
}

export interface OpenConversationResult {
  conversation: Conversation;
  listing: ListingSummary;
}

@Injectable()
export class OpenConversation {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listings: ListingsReadPort,
  ) {}

  async execute(input: OpenConversationInput): Promise<OpenConversationResult> {
    const listing = await this.listings.getListingSummary(input.listingId);

    if (!listing) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Listing not found",
      });
    }

    if (listing.sellerId === input.buyerId) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Cannot contact yourself",
        details: { reason: "SELF_CONTACT_NOT_ALLOWED" },
      });
    }

    const existing = await this.conversations.findByListingAndBuyer(
      input.listingId,
      input.buyerId,
    );

    if (existing) {
      return { conversation: existing, listing };
    }

    if (listing.status !== "active") {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Listing is not available for contact",
        details: { reason: "LISTING_NOT_AVAILABLE" },
      });
    }

    if (!listing.allowChat) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Chat is disabled for this listing",
        details: { reason: "CHAT_DISABLED" },
      });
    }

    const conversation = Conversation.create({
      id: randomUUID(),
      listingId: input.listingId,
      buyerId: input.buyerId,
      sellerId: listing.sellerId,
    });

    await this.conversations.save(conversation);

    return { conversation, listing };
  }
}
