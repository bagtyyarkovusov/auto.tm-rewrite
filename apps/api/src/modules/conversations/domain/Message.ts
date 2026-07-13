import {
  ConversationDomainError,
  CONVERSATION_ERROR_CODES,
  DELETE_WINDOW_MS,
} from "./types";
import type { MessageKind, MessageMetadata } from "./types";

const MAX_MESSAGE_TEXT_LENGTH = 1000;

export class Message {
  private constructor(
    readonly id: string,
    readonly conversationId: string,
    readonly senderId: string,
    readonly kind: MessageKind,
    readonly body: string | null,
    readonly metadata: MessageMetadata | null,
    readonly createdAt: Date,
    readonly deletedAt: Date | null,
    readonly clientMessageId: string | null,
  ) {}

  static createText(data: {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    clientMessageId?: string | undefined;
    createdAt?: Date | undefined;
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
      "text",
      trimmed,
      null,
      data.createdAt ?? new Date(),
      null,
      data.clientMessageId ?? null,
    );
  }

  static createImage(data: {
    id: string;
    conversationId: string;
    senderId: string;
    metadata: MessageMetadata;
    clientMessageId?: string | undefined;
    createdAt?: Date | undefined;
  }): Message {
    const metadata = data.metadata as { key: string };
    if (!metadata.key || metadata.key.length === 0) {
      throw new ConversationDomainError(
        CONVERSATION_ERROR_CODES.MESSAGE_KIND_NOT_SUPPORTED,
        "Image message requires a non-empty key",
      );
    }
    return new Message(
      data.id,
      data.conversationId,
      data.senderId,
      "image",
      null,
      data.metadata,
      data.createdAt ?? new Date(),
      null,
      data.clientMessageId ?? null,
    );
  }

  static createPostRef(data: {
    id: string;
    conversationId: string;
    senderId: string;
    metadata: MessageMetadata;
    clientMessageId?: string | undefined;
    createdAt?: Date | undefined;
  }): Message {
    const metadata = data.metadata as { listingId: string };
    if (!metadata.listingId || metadata.listingId.length === 0) {
      throw new ConversationDomainError(
        CONVERSATION_ERROR_CODES.MESSAGE_KIND_NOT_SUPPORTED,
        "Post reference message requires a listingId",
      );
    }
    return new Message(
      data.id,
      data.conversationId,
      data.senderId,
      "post_ref",
      null,
      data.metadata,
      data.createdAt ?? new Date(),
      null,
      data.clientMessageId ?? null,
    );
  }

  static createSystem(data: {
    id: string;
    conversationId: string;
    body: string;
    createdAt?: Date;
  }): Message {
    return new Message(
      data.id,
      data.conversationId,
      "system",
      "system",
      data.body,
      null,
      data.createdAt ?? new Date(),
      null,
      null,
    );
  }

  static fromExisting(data: {
    id: string;
    conversationId: string;
    senderId: string;
    kind: MessageKind;
    body: string | null;
    metadata: MessageMetadata | null;
    createdAt: Date;
    deletedAt: Date | null;
    clientMessageId: string | null;
  }): Message {
    return new Message(
      data.id,
      data.conversationId,
      data.senderId,
      data.kind,
      data.body,
      data.metadata,
      data.createdAt,
      data.deletedAt,
      data.clientMessageId,
    );
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  markDeleted(deletedAt?: Date): Message {
    return new Message(
      this.id,
      this.conversationId,
      this.senderId,
      this.kind,
      this.body,
      this.metadata,
      this.createdAt,
      deletedAt ?? new Date(),
      this.clientMessageId,
    );
  }

  redacted(): Message {
    return new Message(
      this.id,
      this.conversationId,
      this.senderId,
      this.kind,
      null,
      null,
      this.createdAt,
      this.deletedAt,
      this.clientMessageId,
    );
  }

  canDelete(userId: string, now?: Date): boolean {
    if (this.senderId !== userId) return false;
    if (this.isDeleted()) return false;
    const cutoff = (now ?? new Date()).getTime() - DELETE_WINDOW_MS;
    return this.createdAt.getTime() > cutoff;
  }
}
