import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { CONVERSATION_ERROR_CODES } from "../domain/types";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

export interface MuteConversationInput {
  userId: string;
  conversationId: string;
  muted: boolean;
}

export interface MuteConversationResult {
  conversationId: string;
  mutedAt: Date | null;
}

@Injectable()
export class MuteConversation {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
  ) {}

  async execute(input: MuteConversationInput): Promise<MuteConversationResult> {
    const conversation = await this.conversations.findById(
      input.conversationId,
    );

    if (!conversation) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (!conversation.isParticipant(input.userId)) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You are not a participant in this conversation",
        details: { reason: CONVERSATION_ERROR_CODES.NOT_A_PARTICIPANT },
      });
    }

    const state = await this.conversations.muteConversation(
      input.userId,
      input.conversationId,
      input.muted,
    );

    return {
      conversationId: input.conversationId,
      mutedAt: state.mutedAt,
    };
  }
}
