import { Inject, Injectable } from "@nestjs/common";

import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

export interface CountMyUnreadMessagesInput {
  userId: string;
}

export interface CountMyUnreadMessagesResult {
  count: number;
}

@Injectable()
export class CountMyUnreadMessages {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
  ) {}

  async execute(
    _input: CountMyUnreadMessagesInput,
  ): Promise<CountMyUnreadMessagesResult> {
    return { count: 0 };
  }
}
