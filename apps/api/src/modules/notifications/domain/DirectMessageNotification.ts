import type { MessageSentEvent } from "../../conversations/domain/ports/MessageEventPublisher";

import {
  DIRECT_MESSAGE_NOTIFICATION_CATEGORY,
  DIRECT_MESSAGE_NOTIFICATION_TITLE,
  DIRECT_MESSAGE_PREVIEW_DELETED,
  DIRECT_MESSAGE_PREVIEW_FALLBACK,
  DIRECT_MESSAGE_PREVIEW_IMAGE,
  DIRECT_MESSAGE_PREVIEW_MAX_LENGTH,
  DIRECT_MESSAGE_PREVIEW_POST_REF,
} from "./types";

export interface DirectMessageNotificationData {
  conversationId: string;
  messageId: string;
  preview: {
    kind: MessageSentEvent["messageKind"];
    text: string;
  };
  sentAt: string;
}

export class DirectMessageNotification {
  private constructor(
    readonly userId: string,
    readonly category: typeof DIRECT_MESSAGE_NOTIFICATION_CATEGORY,
    readonly title: string,
    readonly body: string,
    readonly deepLink: string,
    readonly data: DirectMessageNotificationData,
  ) {}

  static create(input: {
    recipientId: string;
    conversationId: string;
    messageId: string;
    sentAt: string;
    messageKind: MessageSentEvent["messageKind"];
    messageBody: string | null;
    messageMetadata: MessageSentEvent["messageMetadata"];
    messageDeletedAt: string | null;
  }): DirectMessageNotification {
    const body = buildPreviewBody(
      input.messageKind,
      input.messageBody,
      input.messageDeletedAt != null,
    );

    return new DirectMessageNotification(
      input.recipientId,
      DIRECT_MESSAGE_NOTIFICATION_CATEGORY,
      DIRECT_MESSAGE_NOTIFICATION_TITLE,
      body,
      `/conversations/${input.conversationId}`,
      {
        conversationId: input.conversationId,
        messageId: input.messageId,
        preview: {
          kind: input.messageKind,
          text: body,
        },
        sentAt: input.sentAt,
      },
    );
  }
}

function buildPreviewBody(
  kind: MessageSentEvent["messageKind"],
  body: string | null,
  isDeleted: boolean,
): string {
  if (isDeleted) {
    return DIRECT_MESSAGE_PREVIEW_DELETED;
  }

  if (kind === "text" && body) {
    return body.length > DIRECT_MESSAGE_PREVIEW_MAX_LENGTH
      ? `${body.slice(0, DIRECT_MESSAGE_PREVIEW_MAX_LENGTH)}…`
      : body;
  }

  if (kind === "image") {
    return DIRECT_MESSAGE_PREVIEW_IMAGE;
  }

  if (kind === "post_ref") {
    return DIRECT_MESSAGE_PREVIEW_POST_REF;
  }

  return DIRECT_MESSAGE_PREVIEW_FALLBACK;
}
