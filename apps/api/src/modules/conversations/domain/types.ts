export const CONVERSATION_ERROR_CODES = {
  SELF_CONTACT_NOT_ALLOWED: "SELF_CONTACT_NOT_ALLOWED",
  NOT_A_PARTICIPANT: "NOT_A_PARTICIPANT",
  LISTING_NOT_CONTACTABLE: "LISTING_NOT_CONTACTABLE",
  LISTING_REFERENCE_NOT_VISIBLE: "LISTING_REFERENCE_NOT_VISIBLE",
  CHAT_DISABLED: "CHAT_DISABLED",
  MESSAGE_TEXT_BLANK: "MESSAGE_TEXT_BLANK",
  MESSAGE_TEXT_TOO_LONG: "MESSAGE_TEXT_TOO_LONG",
  MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",
  MESSAGE_KIND_NOT_SUPPORTED: "MESSAGE_KIND_NOT_SUPPORTED",
  CANNOT_DELETE_OTHERS_MESSAGE: "CANNOT_DELETE_OTHERS_MESSAGE",
  DELETE_WINDOW_EXPIRED: "DELETE_WINDOW_EXPIRED",
  BLOCKED_BY_USER: "BLOCKED_BY_USER",
  USER_BLOCKED: "USER_BLOCKED",
  WATERMARK_NOT_MONOTONIC: "WATERMARK_NOT_MONOTONIC",
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

export type MessageKind = "text" | "image" | "post_ref" | "system";

export type ImageMessageMetadata = {
  key: string;
  width?: number | undefined;
  height?: number | undefined;
};

export type PostRefListingStatus =
  | "active"
  | "sold"
  | "archived"
  | "banned";

export type PostRefMessageMetadata = {
  listingId: string;
  brandId: string;
  modelId: string;
  year?: number;
  displayPriceTmt: number;
  priceCurrency: "TMT" | "USD" | "AED";
  coverMediaKey?: string;
  status: PostRefListingStatus;
};

export type MessageMetadata = ImageMessageMetadata | PostRefMessageMetadata;

export const DELETE_WINDOW_MS = 5 * 60 * 1000;

export const SYSTEM_SENDER_ID = "system" as const;
