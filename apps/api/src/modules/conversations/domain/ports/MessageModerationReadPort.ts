/** Minimal reported Message read for audited staff access. No Conversation content. */
export interface ReportedMessage {
  id: string;
  senderId: string;
  body: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  hasAttachment: boolean;
}

export interface MessageModerationReadPort {
  getReportedMessage(messageId: string): Promise<ReportedMessage | null>;
}

export const MESSAGE_MODERATION_READ_PORT = Symbol("MessageModerationReadPort");
