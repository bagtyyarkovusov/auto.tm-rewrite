import { Message } from "../domain/Message";
import type { ImageMessageMetadata } from "../domain/types";
import {
  CONVERSATION_ERROR_CODES,
  ConversationDomainError,
} from "../domain/types";

export type RichMessageInput =
  | {
      kind: "text";
      text: string;
      clientMessageId?: string | undefined;
    }
  | {
      kind: "image";
      metadata: ImageMessageMetadata;
      clientMessageId?: string | undefined;
    };

export function createRichMessage(data: {
  id: string;
  conversationId: string;
  senderId: string;
  input: RichMessageInput;
}): Message {
  const messageData = {
    id: data.id,
    conversationId: data.conversationId,
    senderId: data.senderId,
    clientMessageId: data.input.clientMessageId,
  };

  switch (data.input.kind) {
    case "text":
      return Message.createText({ ...messageData, text: data.input.text });
    case "image":
      return Message.createImage({
        ...messageData,
        metadata: data.input.metadata,
      });
    default:
      throw new ConversationDomainError(
        CONVERSATION_ERROR_CODES.MESSAGE_KIND_NOT_SUPPORTED,
        "Message kind not supported",
      );
  }
}
