export interface MessageSentEvent {
  event: "MessageSent";
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  sentAt: string;
}

export interface MessageEventPublisher {
  emitMessageSent(event: MessageSentEvent): Promise<void>;
}

export const MESSAGE_EVENT_PUBLISHER = Symbol("MessageEventPublisher");
