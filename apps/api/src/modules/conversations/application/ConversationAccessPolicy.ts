import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { AdminSchemas } from "@auto-tm/contracts";

import {
  accountDeletionPendingException,
  IDENTITY_CHECK_PORT,
  IDENTITY_READ_PORT,
  type IdentityCheckPort,
  type IdentityReadPort,
} from "../../identity/identity.public";
import type { Conversation } from "../domain/Conversation";
import { CONVERSATION_ERROR_CODES } from "../domain/types";

export interface AssertConversationParticipantAccessInput {
  conversation: Conversation;
  userId: string;
  otherParticipantSuspendedMessage?: string | undefined;
}

export interface ParticipantSafety {
  viewerSuspended: boolean;
  otherSuspended: boolean;
  /** The other participant blocked the viewer. */
  blockedByOther: boolean;
  /** The viewer blocked the other participant. */
  blockedByViewer: boolean;
}

@Injectable()
export class ConversationAccessPolicy {
  constructor(
    @Inject(IDENTITY_CHECK_PORT)
    private readonly identityCheck: IdentityCheckPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
  ) {}

  async assertParticipantAccess(
    input: AssertConversationParticipantAccessInput,
  ): Promise<void> {
    const otherParticipantId = this.assertParticipant(
      input.conversation,
      input.userId,
    );

    await this.assertParticipantSafety({
      userId: input.userId,
      otherParticipantId,
      otherParticipantSuspendedMessage:
        input.otherParticipantSuspendedMessage ??
        "Other participant is suspended",
    });
  }

  assertParticipant(
    conversation: Conversation,
    userId: string,
  ): string {
    if (!conversation.isParticipant(userId)) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You are not a participant in this conversation",
        details: { reason: CONVERSATION_ERROR_CODES.NOT_A_PARTICIPANT },
      });
    }

    return conversation.buyerId === userId
      ? conversation.sellerId
      : conversation.buyerId;
  }

  /**
   * Reads every safety fact between two participants without throwing. The
   * throwing path (`assertParticipantSafety`) and the non-throwing send
   * restriction both read it here, so the two cannot drift apart.
   */
  async readParticipantSafety(
    userId: string,
    otherParticipantId: string,
  ): Promise<ParticipantSafety> {
    const [
      viewerSuspended,
      otherSuspended,
      blockedByOther,
      blockedByViewer,
    ] = await Promise.all([
      this.identityCheck.isSuspended(userId),
      this.identityCheck.isSuspended(otherParticipantId),
      this.identityRead.isUserBlockedBy(otherParticipantId, userId),
      this.identityRead.isUserBlockedBy(userId, otherParticipantId),
    ]);
    return { viewerSuspended, otherSuspended, blockedByOther, blockedByViewer };
  }

  /**
   * Refuses a User whose account deletion is scheduled. Realtime events do not
   * pass the HTTP guard that enforces this for requests (ADR-0032), so the use
   * cases they reach call this themselves.
   */
  async assertAccountNotPendingDeletion(userId: string): Promise<void> {
    if (await this.identityCheck.isDeletionScheduled(userId)) {
      throw accountDeletionPendingException();
    }
  }

  async assertParticipantSafety(input: {
    userId: string;
    otherParticipantId: string;
    otherParticipantSuspendedMessage: string;
  }): Promise<void> {
    const safety = await this.readParticipantSafety(
      input.userId,
      input.otherParticipantId,
    );

    if (safety.viewerSuspended) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }
    if (safety.otherSuspended) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: input.otherParticipantSuspendedMessage,
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }
    if (safety.blockedByOther) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You are blocked by this user",
        details: { reason: CONVERSATION_ERROR_CODES.BLOCKED_BY_USER },
      });
    }
    if (safety.blockedByViewer) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You have blocked this user",
        details: { reason: CONVERSATION_ERROR_CODES.USER_BLOCKED },
      });
    }
  }
}
