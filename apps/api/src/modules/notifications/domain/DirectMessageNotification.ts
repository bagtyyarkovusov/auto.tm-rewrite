import type { MessageSentEvent } from "../../conversations/domain/ports/MessageEventPublisher";

import {
  DIRECT_MESSAGE_NOTIFICATION_CATEGORY,
  DIRECT_MESSAGE_PREVIEW_MAX_LENGTH,
  directMessageCopy,
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
    recipientLocale?: string;
  }): DirectMessageNotification {
    const copy = directMessageCopy(input.recipientLocale);
    const body = buildPreviewBody(
      input.messageKind,
      input.messageBody,
      input.messageDeletedAt != null,
      copy,
    );

    return new DirectMessageNotification(
      input.recipientId,
      DIRECT_MESSAGE_NOTIFICATION_CATEGORY,
      copy.title,
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
  copy = directMessageCopy("ru"),
): string {
  if (isDeleted) {
    return copy.deleted;
  }

  if (kind === "text" && body) {
    return body.length > DIRECT_MESSAGE_PREVIEW_MAX_LENGTH
      ? `${body.slice(0, DIRECT_MESSAGE_PREVIEW_MAX_LENGTH)}…`
      : body;
  }

  if (kind === "image") {
    return copy.image;
  }

  if (kind === "post_ref") {
    return copy.postRef;
  }

  return copy.fallback;
}
