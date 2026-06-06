import { ConversationDomainError, CONVERSATION_ERROR_CODES } from "./types";

const MAX_MESSAGE_TEXT_LENGTH = 1000;

export class Message {
  private constructor(
    readonly id: string,
    readonly conversationId: string,
    readonly senderId: string,
    readonly text: string,
    readonly createdAt: Date,
  ) {}

  static create(data: {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt?: Date;
  }): Message {
    const trimmed = data.text.trim();
    if (trimmed.length === 0) {
      throw new ConversationDomainError(
        CONVERSATION_ERROR_CODES.MESSAGE_TEXT_BLANK,
        "Message text cannot be blank after trimming",
      );
    }
    if (trimmed.length > MAX_MESSAGE_TEXT_LENGTH) {
      throw new ConversationDomainError(
        CONVERSATION_ERROR_CODES.MESSAGE_TEXT_TOO_LONG,
        `Message text cannot exceed ${MAX_MESSAGE_TEXT_LENGTH} characters after trimming`,
      );
    }
    return new Message(
      data.id,
      data.conversationId,
      data.senderId,
      trimmed,
      data.createdAt ?? new Date(),
    );
  }
}
