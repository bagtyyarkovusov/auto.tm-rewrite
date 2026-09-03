import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type {
  ListingSummary,
  ListingsReadPort,
} from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import type { Conversation } from "../domain/Conversation";
import type { Message } from "../domain/Message";
import {
  CONVERSATION_ERROR_CODES,
  ConversationDomainError,
} from "../domain/types";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";
import type { MessageEventPublisher } from "../domain/ports/MessageEventPublisher";
import { MESSAGE_EVENT_PUBLISHER } from "../domain/ports/MessageEventPublisher";

import { ConversationAccessPolicy } from "./ConversationAccessPolicy";

export interface SendConversationMessageInput {
  senderId: string;
  conversationId: string;
  clientMessageId?: string | undefined;
  beforeIdempotencyCheck?: (() => Promise<void>) | undefined;
  createMessage: (data: {
    id: string;
    conversationId: string;
    senderId: string;
    clientMessageId?: string | undefined;
  }) => Message;
}

export interface SendConversationMessageResult {
  message: Message;
  listing: ListingSummary | null;
  created: boolean;
}

@Injectable()
export class SendConversationMessage {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listings: ListingsReadPort,
    @Inject(MESSAGE_EVENT_PUBLISHER)
    private readonly messageEvents: MessageEventPublisher,
    @Inject(ConversationAccessPolicy)
    private readonly accessPolicy: ConversationAccessPolicy,
  ) {}

  async execute(
    input: SendConversationMessageInput,
  ): Promise<SendConversationMessageResult> {
    const conversation = await this.loadConversation(input.conversationId);
    this.accessPolicy.assertParticipant(conversation, input.senderId);

    const listing = await this.loadContactableListing(conversation.listingId);
    await this.accessPolicy.assertParticipantSafety({
      userId: input.senderId,
      otherParticipantId: this.accessPolicy.getOtherParticipantId(
        conversation,
        input.senderId,
      ),
      otherParticipantSuspendedMessage: "User is suspended",
    });
    await input.beforeIdempotencyCheck?.();

    if (input.clientMessageId) {
      const existing = await this.conversations.findMessageByClientMessageId(
        input.conversationId,
        input.senderId,
        input.clientMessageId,
      );
      if (existing) {
        return { message: existing, listing, created: false };
      }
    }

    const message = this.createMessage(input);

    await this.conversations.saveMessage(message);
    await this.emitMessageSent(input.senderId, conversation, message);

    return { message, listing, created: true };
  }

  private async loadConversation(conversationId: string): Promise<Conversation> {
    const conversation = await this.conversations.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    return conversation;
  }

  private async loadContactableListing(
    listingId: string,
  ): Promise<ListingSummary> {
    const listing = await this.listings.getListingSummary(listingId);

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

    return listing;
  }

  private otherParticipantId(
    conversation: { buyerId: string; sellerId: string },
    senderId: string,
  ): string {
    return conversation.buyerId === senderId
      ? conversation.sellerId
      : conversation.buyerId;
  }

  private createMessage(input: SendConversationMessageInput): Message {
    try {
      return input.createMessage({
        id: randomUUID(),
        conversationId: input.conversationId,
        senderId: input.senderId,
        clientMessageId: input.clientMessageId,
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
  }

  private async emitMessageSent(
    senderId: string,
    conversation: { id: string; buyerId: string; sellerId: string },
    message: Message,
  ): Promise<void> {
    await this.messageEvents.emitMessageSent({
      event: "MessageSent",
      conversationId: conversation.id,
      messageId: message.id,
      senderId,
      recipientId: this.otherParticipantId(conversation, senderId),
      sentAt: message.createdAt.toISOString(),
      messageKind: message.kind,
      messageBody: message.body,
      messageMetadata: message.metadata,
      messageDeletedAt: message.deletedAt?.toISOString() ?? null,
    });
  }
}
