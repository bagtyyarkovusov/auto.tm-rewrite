export interface SurroundingMessage {
  id: string;
  senderId: string;
  createdAt: Date;
  body: string | null;
  deletedAt: Date | null;
}

export interface MessageReportContext {
  messageId: string;
  conversationId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  senderId: string;
  createdAt: Date;
  body: string | null;
  deletedAt: Date | null;
  surroundingMessages: SurroundingMessage[];
}

export interface ConversationReportContextPort {
  getMessageReportContext(input: {
    conversationId: string;
    messageId: string;
  }): Promise<MessageReportContext | null>;
  isParticipant(conversationId: string, userId: string): Promise<boolean>;
}

export const CONVERSATION_REPORT_CONTEXT_PORT = Symbol(
  "ConversationReportContextPort",
);
