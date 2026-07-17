import { randomUUID } from "node:crypto";

import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { AdminSchemas } from "@auto-tm/contracts";

import type {
  ListingsReadPort,
  ListingSummary,
} from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import type { IdentityCheckPort } from "../../identity/domain/ports/IdentityCheckPort";
import { IDENTITY_TOKENS } from "../../identity/identity.tokens";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";
import { Message } from "../domain/Message";
import {
  CONVERSATION_ERROR_CODES,
  ConversationDomainError,
} from "../domain/types";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";
import type {
  MessageEventPublisher,
} from "../domain/ports/MessageEventPublisher";
import { MESSAGE_EVENT_PUBLISHER } from "../domain/ports/MessageEventPublisher";

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
    @Inject(IDENTITY_TOKENS.IdentityCheckPort)
    private readonly identityCheck: IdentityCheckPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
    @Inject(MESSAGE_EVENT_PUBLISHER)
    private readonly messageEvents: MessageEventPublisher,
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

    const otherParticipantId =
      conversation.buyerId === input.senderId
        ? conversation.sellerId
        : conversation.buyerId;

    // Block if either participant is suspended
    const senderSuspended = await this.identityCheck.isSuspended(input.senderId);
    if (senderSuspended) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }

    const otherSuspended = await this.identityCheck.isSuspended(otherParticipantId);
    if (otherSuspended) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }

    // Block if either participant has blocked the other
    const blockedByOther = await this.identityRead.isUserBlockedBy(
      otherParticipantId,
      input.senderId,
    );
    if (blockedByOther) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You are blocked by this user",
        details: { reason: CONVERSATION_ERROR_CODES.BLOCKED_BY_USER },
      });
    }

    const blockedThem = await this.identityRead.isUserBlockedBy(
      input.senderId,
      otherParticipantId,
    );
    if (blockedThem) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You have blocked this user",
        details: { reason: CONVERSATION_ERROR_CODES.USER_BLOCKED },
      });
    }

    let message: Message;
    try {
      message = Message.createText({
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
    await this.emitMessageSent(input.senderId, conversation, message);

    return { message, listing };
  }

  private async emitMessageSent(
    senderId: string,
    conversation: { id: string; buyerId: string; sellerId: string },
    message: Message,
  ): Promise<void> {
    const recipientId =
      conversation.buyerId === senderId
        ? conversation.sellerId
        : conversation.buyerId;

    await this.messageEvents.emitMessageSent({
      event: "MessageSent",
      conversationId: conversation.id,
      messageId: message.id,
      senderId,
      recipientId,
      sentAt: message.createdAt.toISOString(),
      messageKind: message.kind,
      messageBody: message.body,
      messageMetadata: message.metadata,
      messageDeletedAt: message.deletedAt?.toISOString() ?? null,
    });
  }
}
