import { randomUUID } from "node:crypto";

import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import type {
  ListingsReadPort,
  ListingSummary,
} from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import { Message } from "../domain/Message";
import {
  CONVERSATION_ERROR_CODES,
  ConversationDomainError,
} from "../domain/types";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

export interface SendTextMessageInput {
  senderId: string;
  conversationId: string;
  text: string;
}

export interface SendTextMessageResult {
  message: Message;
  listing: ListingSummary | null;
}

@Injectable()
export class SendTextMessage {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listings: ListingsReadPort,
  ) {}

  async execute(input: SendTextMessageInput): Promise<SendTextMessageResult> {
    const conversation = await this.conversations.findById(
      input.conversationId,
    );

    if (!conversation) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (!conversation.isParticipant(input.senderId)) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You are not a participant in this conversation",
        details: { reason: CONVERSATION_ERROR_CODES.NOT_A_PARTICIPANT },
      });
    }

    const listing = await this.listings.getListingSummary(
      conversation.listingId,
    );

    if (!listing) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Listing is no longer available for contact",
        details: { reason: CONVERSATION_ERROR_CODES.LISTING_NOT_CONTACTABLE },
      });
    }

    if (listing.status !== "active") {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Listing is not available for contact",
        details: { reason: CONVERSATION_ERROR_CODES.LISTING_NOT_CONTACTABLE },
      });
    }

    if (!listing.allowChat) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Chat is disabled for this listing",
        details: { reason: CONVERSATION_ERROR_CODES.CHAT_DISABLED },
      });
    }

    let message: Message;
    try {
      message = Message.create({
        id: randomUUID(),
        conversationId: conversation.id,
        senderId: input.senderId,
        text: input.text,
      });
    } catch (err) {
      if (err instanceof ConversationDomainError) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: err.message,
          details: { reason: err.code },
        });
      }
      throw err;
    }

    await this.conversations.saveMessage(message);

    return { message, listing };
  }
}
