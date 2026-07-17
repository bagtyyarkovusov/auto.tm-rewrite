import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { AdminSchemas } from "@auto-tm/contracts";

import type { IdentityCheckPort } from "../../identity/domain/ports/IdentityCheckPort";
import { IDENTITY_TOKENS } from "../../identity/identity.tokens";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";
import type { Conversation } from "../domain/Conversation";
import { CONVERSATION_ERROR_CODES } from "../domain/types";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

export interface ValidateConversationAccessInput {
  userId: string;
  conversationId: string;
}

@Injectable()
export class ValidateConversationAccess {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(IDENTITY_TOKENS.IdentityCheckPort)
    private readonly identityCheck: IdentityCheckPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
  ) {}

  async execute(
    input: ValidateConversationAccessInput,
  ): Promise<Conversation> {
    const conversation = await this.conversations.findById(
      input.conversationId,
    );

    if (!conversation) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (!conversation.isParticipant(input.userId)) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You are not a participant in this conversation",
        details: { reason: CONVERSATION_ERROR_CODES.NOT_A_PARTICIPANT },
      });
    }

    const otherParticipantId =
      conversation.buyerId === input.userId
        ? conversation.sellerId
        : conversation.buyerId;

    await this.guardSuspended(input.userId, otherParticipantId);
    await this.guardBlocked(input.userId, otherParticipantId);

    return conversation;
  }

  private async guardSuspended(
    userId: string,
    otherParticipantId: string,
  ): Promise<void> {
    const userSuspended = await this.identityCheck.isSuspended(userId);
    if (userSuspended) {
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
        message: "Other participant is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }
  }

  private async guardBlocked(
    userId: string,
    otherParticipantId: string,
  ): Promise<void> {
    const blockedByOther = await this.identityRead.isUserBlockedBy(
      otherParticipantId,
      userId,
    );
    if (blockedByOther) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You are blocked by this user",
        details: { reason: CONVERSATION_ERROR_CODES.BLOCKED_BY_USER },
      });
    }

    const blockedThem = await this.identityRead.isUserBlockedBy(
      userId,
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
