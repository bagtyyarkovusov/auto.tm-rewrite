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
import type { MessageMetadata } from "../domain/types";
import {
  CONVERSATION_ERROR_CODES,
  ConversationDomainError,
} from "../domain/types";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

export interface SendMessageInput {
  senderId: string;
  conversationId: string;
  kind: "text" | "image" | "post_ref";
  text?: string | undefined;
  metadata?: MessageMetadata | undefined;
  clientMessageId?: string | undefined;
}

export interface SendMessageResult {
  message: Message;
  listing: ListingSummary | null;
}

@Injectable()
export class SendMessage {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listings: ListingsReadPort,
    @Inject(IDENTITY_TOKENS.IdentityCheckPort)
    private readonly identityCheck: IdentityCheckPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
  ) {}

  async execute(input: SendMessageInput): Promise<SendMessageResult> {
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

    await this.guardSuspended(input.senderId, otherParticipantId);
    await this.guardBlocked(input.senderId, otherParticipantId);

    if (input.clientMessageId) {
      const existing = await this.conversations.findMessageByClientMessageId(
        input.conversationId,
        input.senderId,
        input.clientMessageId,
      );
      if (existing) {
        return { message: existing, listing };
      }
    }

    let message: Message;
    try {
      message = this.createMessage(input);
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

  private createMessage(input: SendMessageInput): Message {
    const base = {
      id: randomUUID(),
      conversationId: input.conversationId,
      senderId: input.senderId,
      clientMessageId: input.clientMessageId,
    };

    switch (input.kind) {
      case "text":
        return Message.createText({
          ...base,
          text: input.text ?? "",
        });
      case "image":
        return Message.createImage({
          ...base,
          metadata: input.metadata ?? { key: "" },
        });
      case "post_ref":
        return Message.createPostRef({
          ...base,
          metadata: input.metadata ?? { listingId: "" },
        });
      default:
        throw new ConversationDomainError(
          CONVERSATION_ERROR_CODES.MESSAGE_KIND_NOT_SUPPORTED,
          `Message kind not supported`,
        );
    }
  }

  private async guardSuspended(
    senderId: string,
    otherParticipantId: string,
  ): Promise<void> {
    const senderSuspended = await this.identityCheck.isSuspended(senderId);
    if (senderSuspended) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }

    const otherSuspended = await this.identityCheck.isSuspended(
      otherParticipantId,
    );
    if (otherSuspended) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }
  }

  private async guardBlocked(
    senderId: string,
    otherParticipantId: string,
  ): Promise<void> {
    const blockedByOther = await this.identityRead.isUserBlockedBy(
      otherParticipantId,
      senderId,
    );
    if (blockedByOther) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You are blocked by this user",
        details: { reason: CONVERSATION_ERROR_CODES.BLOCKED_BY_USER },
      });
    }

    const blockedThem = await this.identityRead.isUserBlockedBy(
      senderId,
      otherParticipantId,
    );
    if (blockedThem) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You have blocked this user",
        details: { reason: CONVERSATION_ERROR_CODES.USER_BLOCKED },
      });
    }
  }
}
