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
import { buildPostRefSnapshot } from "../infrastructure/PostRefSnapshotMapper";

export interface SendPostRefMessageInput {
  senderId: string;
  conversationId: string;
  metadata: { listingId: string };
  clientMessageId?: string | undefined;
}

export interface SendPostRefMessageResult {
  message: Message;
  listing: ListingSummary | null;
}

@Injectable()
export class SendPostRefMessage {
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

  async execute(
    input: SendPostRefMessageInput,
  ): Promise<SendPostRefMessageResult> {
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

    const parentListing = await this.listings.getListingSummary(
      conversation.listingId,
    );

    if (!parentListing) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Listing is no longer available for contact",
        details: { reason: CONVERSATION_ERROR_CODES.LISTING_NOT_CONTACTABLE },
      });
    }

    if (parentListing.status !== "active") {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Listing is not available for contact",
        details: { reason: CONVERSATION_ERROR_CODES.LISTING_NOT_CONTACTABLE },
      });
    }

    if (!parentListing.allowChat) {
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

    const referencedListing = await this.listings.getListingSummary(
      input.metadata.listingId,
    );

    if (!referencedListing || referencedListing.status !== "active") {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Referenced listing is not available",
        details: {
          reason: CONVERSATION_ERROR_CODES.LISTING_REFERENCE_NOT_VISIBLE,
        },
      });
    }

    if (input.clientMessageId) {
      const existing = await this.conversations.findMessageByClientMessageId(
        input.conversationId,
        input.senderId,
        input.clientMessageId,
      );
      if (existing) {
        return { message: existing, listing: parentListing };
      }
    }

    let message: Message;
    try {
      message = Message.createPostRef({
        id: randomUUID(),
        conversationId: input.conversationId,
        senderId: input.senderId,
        clientMessageId: input.clientMessageId,
        metadata: buildPostRefSnapshot(referencedListing),
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

    return { message, listing: parentListing };
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
