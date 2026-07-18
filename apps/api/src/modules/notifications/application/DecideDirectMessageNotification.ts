import { Inject, Injectable } from "@nestjs/common";

import type { MessageSentEvent } from "../../conversations/domain/ports/MessageEventPublisher";
import type { PresencePort } from "../../realtime/domain/ports/PresencePort";
import { PRESENCE_PORT } from "../../realtime/domain/ports/PresencePort";
import type { ConversationStatePort } from "../../conversations/domain/ports/ConversationStatePort";
import { CONVERSATION_STATE_PORT } from "../../conversations/domain/ports/ConversationStatePort";

import { DirectMessageNotification } from "../domain/DirectMessageNotification";
import type { NotificationHistoryRepository } from "../domain/ports/NotificationHistoryRepository";
import { NOTIFICATION_HISTORY_REPOSITORY } from "../domain/ports/NotificationHistoryRepository";
import type { PushQueuePort } from "../domain/ports/PushQueuePort";
import { PUSH_QUEUE_PORT } from "../domain/ports/PushQueuePort";
import { DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS } from "../domain/types";
import { EvaluateDirectMessagePush } from "./EvaluateDirectMessagePush";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";

export interface DecideDirectMessageNotificationResult {
  enqueued: boolean;
  reason?: string;
}

@Injectable()
export class DecideDirectMessageNotification {
  constructor(
    @Inject(PRESENCE_PORT)
    private readonly presence: PresencePort,
    @Inject(CONVERSATION_STATE_PORT)
    private readonly conversationState: ConversationStatePort,
    @Inject(EvaluateDirectMessagePush)
    private readonly evaluatePush: EvaluateDirectMessagePush,
    @Inject(NOTIFICATION_HISTORY_REPOSITORY)
    private readonly history: NotificationHistoryRepository,
    @Inject(PUSH_QUEUE_PORT)
    private readonly queue: PushQueuePort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
  ) {}

  async execute(
    event: MessageSentEvent,
  ): Promise<DecideDirectMessageNotificationResult> {
    if (!event.senderId || !event.recipientId) {
      return {
        enqueued: false,
        reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.MISSING_PARTICIPANT,
      };
    }

    if (event.senderId === event.recipientId) {
      return {
        enqueued: false,
        reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.SELF_MESSAGE,
      };
    }

    if (this.presence.isUserOnline(event.recipientId)) {
      return {
        enqueued: false,
        reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.RECIPIENT_ONLINE,
      };
    }

    const isMuted = await this.conversationState.isMuted(
      event.conversationId,
      event.recipientId,
    );
    if (isMuted) {
      return {
        enqueued: false,
        reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.CONVERSATION_MUTED,
      };
    }

    const eligibility = await this.evaluatePush.execute({
      senderId: event.senderId,
      recipientId: event.recipientId,
    });

    if (!eligibility.shouldSend) {
      return { enqueued: false, reason: eligibility.reason };
    }

    const recipient = await this.identityRead.findUserById(event.recipientId);
    const notification = DirectMessageNotification.create({
      recipientId: event.recipientId,
      conversationId: event.conversationId,
      messageId: event.messageId,
      sentAt: event.sentAt,
      messageKind: event.messageKind,
      messageBody: event.messageBody,
      messageMetadata: event.messageMetadata,
      messageDeletedAt: event.messageDeletedAt,
      ...(recipient?.locale ? { recipientLocale: recipient.locale } : {}),
    });

    const { id: historyId } = await this.history.save(notification);
    await this.queue.enqueue(notification, historyId);

    return { enqueued: true };
  }
}
