import { Inject, Injectable } from "@nestjs/common";

import type { PushToken } from "../domain/PushToken";
import {
  PUSH_TOKEN_REPOSITORY,
  type PushTokenRepository,
} from "../domain/ports/PushTokenRepository";

export interface ListPushTokensInput {
  userId: string;
}

@Injectable()
export class ListPushTokens {
  constructor(
    @Inject(PUSH_TOKEN_REPOSITORY)
    private readonly tokens: PushTokenRepository,
  ) {}

  async execute(input: ListPushTokensInput): Promise<PushToken[]> {
    return this.tokens.listActiveForUser(input.userId);
  }
}
