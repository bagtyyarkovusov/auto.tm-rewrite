import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { Conversation } from "../domain/Conversation";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

import { ConversationAccessPolicy } from "./ConversationAccessPolicy";

export interface ValidateConversationAccessInput {
  userId: string;
  conversationId: string;
}

@Injectable()
export class ValidateConversationAccess {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(ConversationAccessPolicy)
    private readonly accessPolicy: ConversationAccessPolicy,
  ) {}

  async execute(
    input: ValidateConversationAccessInput,
  ): Promise<Conversation> {
    const conversation = await this.conversations.findById(
      input.conversationId,
    );

    if (!conversation) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    await this.accessPolicy.assertParticipantAccess({
      conversation,
      userId: input.userId,
    });

    return conversation;
  }
}
