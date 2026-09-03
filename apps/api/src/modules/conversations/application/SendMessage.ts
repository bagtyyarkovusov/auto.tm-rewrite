import { Inject, Injectable } from "@nestjs/common";

import type { ListingSummary } from "../../listings/domain/ports/ListingsReadPort";
import { Message } from "../domain/Message";
import type { ImageMessageMetadata } from "../domain/types";
import {
  CONVERSATION_ERROR_CODES,
  ConversationDomainError,
} from "../domain/types";

import { SendConversationMessage } from "./SendConversationMessage";

export type SendMessageInput =
  | {
      senderId: string;
      conversationId: string;
      kind: "text";
      text: string;
      clientMessageId?: string | undefined;
    }
  | {
      senderId: string;
      conversationId: string;
      kind: "image";
      metadata: ImageMessageMetadata;
      clientMessageId?: string | undefined;
    };

export interface SendMessageResult {
  message: Message;
  listing: ListingSummary | null;
}

@Injectable()
export class SendMessage {
  constructor(
    @Inject(SendConversationMessage)
    private readonly sendConversationMessage: SendConversationMessage,
  ) {}

  async execute(input: SendMessageInput): Promise<SendMessageResult> {
    const result = await this.executeWithDeliveryState(input);
    return { message: result.message, listing: result.listing };
  }

  async executeWithDeliveryState(input: SendMessageInput) {
    return this.sendConversationMessage.execute({
      senderId: input.senderId,
      conversationId: input.conversationId,
      clientMessageId: input.clientMessageId,
      createMessage: ({ id, conversationId, senderId, clientMessageId }) =>
        this.createMessage({
          id,
          conversationId,
          senderId,
          clientMessageId,
          input,
        }),
    });
  }

  private createMessage(data: {
    id: string;
    conversationId: string;
    senderId: string;
    clientMessageId?: string | undefined;
    input: SendMessageInput;
  }): Message {
    switch (data.input.kind) {
      case "text":
        return Message.createText({
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          clientMessageId: data.clientMessageId,
          text: data.input.text,
        });
      case "image":
        return Message.createImage({
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          clientMessageId: data.clientMessageId,
          metadata: data.input.metadata,
        });
      default:
        throw new ConversationDomainError(
          CONVERSATION_ERROR_CODES.MESSAGE_KIND_NOT_SUPPORTED,
          "Message kind not supported",
        );
    }
  }
}
