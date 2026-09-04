import { Inject, Injectable } from "@nestjs/common";

import type { Message } from "../domain/Message";
import {
  CONVERSATION_REPOSITORY,
  MessageAlreadySavedError,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";
import type { MessageEventPublisher } from "../domain/ports/MessageEventPublisher";
import { MESSAGE_EVENT_PUBLISHER } from "../domain/ports/MessageEventPublisher";

@Injectable()
export class ConversationMessageCommitter {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(MESSAGE_EVENT_PUBLISHER)
    private readonly messageEvents: MessageEventPublisher,
  ) {}

  async commit(
    message: Message,
    recipientId: string,
  ): Promise<{ message: Message; created: boolean }> {
    try {
      await this.conversations.saveMessage(message);
    } catch (error) {
      if (error instanceof MessageAlreadySavedError) {
        return { message: error.existingMessage, created: false };
      }
      throw error;
    }

    await this.messageEvents.emitMessageSent({
      event: "MessageSent",
      conversationId: message.conversationId,
      messageId: message.id,
      senderId: message.senderId,
      recipientId,
      sentAt: message.createdAt.toISOString(),
      messageKind: message.kind,
      messageBody: message.body,
      messageMetadata: message.metadata,
      messageDeletedAt: message.deletedAt?.toISOString() ?? null,
    });
    return { message, created: true };
  }
}
