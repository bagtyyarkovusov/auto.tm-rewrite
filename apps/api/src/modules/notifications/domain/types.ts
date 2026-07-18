export type PushPlatform = "android" | "ios" | "web";

export const VALID_PLATFORMS: readonly PushPlatform[] = ["android", "ios", "web"];

export const PUSH_TOKEN_ERROR_CODES = {
  TOKEN_REQUIRED: "TOKEN_REQUIRED",
  PLATFORM_REQUIRED: "PLATFORM_REQUIRED",
  INVALID_PLATFORM: "INVALID_PLATFORM",
} as const;

export class PushTokenDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PushTokenDomainError";
  }
}

export const DIRECT_MESSAGE_NOTIFICATION_CATEGORY = "direct_messages" as const;

export const DIRECT_MESSAGE_NOTIFICATION_TITLE = "Новое сообщение";

export const DIRECT_MESSAGE_PREVIEW_IMAGE = "Фото";

export const DIRECT_MESSAGE_PREVIEW_POST_REF = "Объявление";

export const DIRECT_MESSAGE_PREVIEW_DELETED = "Сообщение удалено";

export const DIRECT_MESSAGE_PREVIEW_FALLBACK = "Новое сообщение";

export const DIRECT_MESSAGE_PREVIEW_MAX_LENGTH = 100;

export function directMessageCopy(locale: string | undefined) {
  if (locale === "en") {
    return { title: "New message", image: "Photo", postRef: "Listing", deleted: "Message deleted", fallback: "New message" };
  }
  if (locale === "tk") {
    return { title: "Täze habar", image: "Surat", postRef: "Bildiriş", deleted: "Habar pozuldy", fallback: "Täze habar" };
  }
  return {
    title: DIRECT_MESSAGE_NOTIFICATION_TITLE,
    image: DIRECT_MESSAGE_PREVIEW_IMAGE,
    postRef: DIRECT_MESSAGE_PREVIEW_POST_REF,
    deleted: DIRECT_MESSAGE_PREVIEW_DELETED,
    fallback: DIRECT_MESSAGE_PREVIEW_FALLBACK,
  };
}

export const DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS = {
  MISSING_PARTICIPANT: "MISSING_PARTICIPANT",
  SELF_MESSAGE: "SELF_MESSAGE",
  RECIPIENT_ONLINE: "RECIPIENT_ONLINE",
  CONVERSATION_MUTED: "CONVERSATION_MUTED",
  BLOCKED: "BLOCKED",
  NO_TOKENS: "NO_TOKENS",
} as const;

export type DirectMessagePushSuppressionReason =
  (typeof DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS)[keyof typeof DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS];
