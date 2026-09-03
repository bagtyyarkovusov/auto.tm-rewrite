import { Inject, Injectable } from "@nestjs/common";

import type { ListingSummary } from "../../listings/domain/ports/ListingsReadPort";
import { Message } from "../domain/Message";

import { SendConversationMessage } from "./SendConversationMessage";

export interface SendTextMessageInput {
  senderId: string;
  conversationId: string;
  text: string;
}

export interface SendTextMessageResult {
  message: Message;
  listing: ListingSummary | null;
}

@Injectable()
export class SendTextMessage {
  constructor(
    @Inject(SendConversationMessage)
    private readonly sendConversationMessage: SendConversationMessage,
  ) {}

  async execute(input: SendTextMessageInput): Promise<SendTextMessageResult> {
    const result = await this.sendConversationMessage.execute({
      senderId: input.senderId,
      conversationId: input.conversationId,
      createMessage: ({ id, conversationId, senderId }) =>
        Message.createText({
          id,
          conversationId,
          senderId,
          text: input.text,
        }),
    });

    return { message: result.message, listing: result.listing };
  }
}
