import { randomUUID } from "node:crypto";

import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import type { ListingSummary } from "../../listings/domain/ports/ListingsReadPort";
import type { Message } from "../domain/Message";
import { ConversationDomainError } from "../domain/types";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

import { ConversationMessageCommitter } from "./ConversationMessageCommitter";
import { ConversationSendPolicy } from "./ConversationSendPolicy";

export interface SendConversationMessageInput {
  senderId: string;
  conversationId: string;
  clientMessageId?: string | undefined;
  createMessage: (data: {
    id: string;
    conversationId: string;
    senderId: string;
    clientMessageId?: string | undefined;
  }) => Message | Promise<Message>;
}

export interface SendConversationMessageResult {
  message: Message;
  listing: ListingSummary | null;
  created: boolean;
}

@Injectable()
export class SendConversationMessage {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(ConversationSendPolicy)
    private readonly sendPolicy: ConversationSendPolicy,
    @Inject(ConversationMessageCommitter)
    private readonly committer: ConversationMessageCommitter,
  ) {}

  async execute(
    input: SendConversationMessageInput,
  ): Promise<SendConversationMessageResult> {
    const authorized = await this.sendPolicy.authorize(
      input.conversationId,
      input.senderId,
    );
    if (input.clientMessageId) {
      const existing = await this.conversations.findMessageByClientMessageId(
        input.conversationId,
        input.senderId,
        input.clientMessageId,
      );
      if (existing) {
        return { message: existing, listing: authorized.listing, created: false };
      }
    }

    const message = await this.createMessage(input);
    const committed = await this.committer.commit(
      message,
      authorized.recipientId,
    );
    return { ...committed, listing: authorized.listing };
  }

  private async createMessage(input: SendConversationMessageInput) {
    try {
      return await input.createMessage({
        id: randomUUID(),
        conversationId: input.conversationId,
        senderId: input.senderId,
        clientMessageId: input.clientMessageId,
      });
    } catch (error) {
      if (error instanceof ConversationDomainError) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: error.message,
          details: { reason: error.code },
        });
      }
      throw error;
    }
  }
}
