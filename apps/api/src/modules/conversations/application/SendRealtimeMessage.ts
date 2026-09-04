import { Inject, Injectable } from "@nestjs/common";

import type { Message } from "../domain/Message";

import { createRichMessage, type RichMessageInput } from "./RichMessageFactory";
import { SendConversationMessage } from "./SendConversationMessage";

export type SendRealtimeMessageInput = RichMessageInput & {
  senderId: string;
  conversationId: string;
};

export interface SendRealtimeMessageResult {
  message: Message;
  created: boolean;
}

@Injectable()
export class SendRealtimeMessage {
  constructor(
    @Inject(SendConversationMessage)
    private readonly sendConversationMessage: SendConversationMessage,
  ) {}

  async execute(
    input: SendRealtimeMessageInput,
  ): Promise<SendRealtimeMessageResult> {
    const result = await this.sendConversationMessage.execute({
      senderId: input.senderId,
      conversationId: input.conversationId,
      clientMessageId: input.clientMessageId,
      createMessage: ({ id, conversationId, senderId }) =>
        createRichMessage({ id, conversationId, senderId, input }),
    });

    return { message: result.message, created: result.created };
  }
}
