export const CONVERSATION_ERROR_CODES = {
  SELF_CONTACT_NOT_ALLOWED: "SELF_CONTACT_NOT_ALLOWED",
  NOT_A_PARTICIPANT: "NOT_A_PARTICIPANT",
  LISTING_NOT_CONTACTABLE: "LISTING_NOT_CONTACTABLE",
  CHAT_DISABLED: "CHAT_DISABLED",
  MESSAGE_TEXT_BLANK: "MESSAGE_TEXT_BLANK",
  MESSAGE_TEXT_TOO_LONG: "MESSAGE_TEXT_TOO_LONG",
} as const;
export type ConversationErrorCode =
  (typeof CONVERSATION_ERROR_CODES)[keyof typeof CONVERSATION_ERROR_CODES];

export class ConversationDomainError extends Error {
  constructor(
    readonly code: ConversationErrorCode,
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = "ConversationDomainError";
  }
}

export type ParticipantRole = "buyer" | "seller";
