import type { MessageKind, MessageMetadata } from "../types";

export interface MessageSentEvent {
  event: "MessageSent";
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  sentAt: string;
  messageKind: MessageKind;
  messageBody: string | null;
  messageMetadata: MessageMetadata | null;
  messageDeletedAt: string | null;
}

export interface MessageEventPublisher {
  emitMessageSent(event: MessageSentEvent): Promise<void>;
}

export const MESSAGE_EVENT_PUBLISHER = Symbol("MessageEventPublisher");
