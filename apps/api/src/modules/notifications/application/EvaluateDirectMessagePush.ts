import { Inject, Injectable } from "@nestjs/common";

import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";
import type { PushTokenRepository } from "../domain/ports/PushTokenRepository";
import { PUSH_TOKEN_REPOSITORY } from "../domain/ports/PushTokenRepository";

export interface EvaluateDirectMessagePushInput {
  senderId: string;
  recipientId: string;
}

export type EvaluateDirectMessagePushResult =
  | { shouldSend: true }
  | { shouldSend: false; reason: string };

@Injectable()
export class EvaluateDirectMessagePush {
  constructor(
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
    @Inject(PUSH_TOKEN_REPOSITORY)
    private readonly tokens: PushTokenRepository,
  ) {}

  async execute(
    input: EvaluateDirectMessagePushInput,
  ): Promise<EvaluateDirectMessagePushResult> {
    const recipientBlockedSender = await this.identityRead.isUserBlockedBy(
      input.recipientId,
      input.senderId,
    );
    if (recipientBlockedSender) {
      return { shouldSend: false, reason: "BLOCKED" };
    }

    const senderBlockedRecipient = await this.identityRead.isUserBlockedBy(
      input.senderId,
      input.recipientId,
    );
    if (senderBlockedRecipient) {
      return { shouldSend: false, reason: "BLOCKED" };
    }

    const activeTokens = await this.tokens.listActiveForUser(input.recipientId);
    if (activeTokens.length === 0) {
      return { shouldSend: false, reason: "NO_TOKENS" };
    }

    return { shouldSend: true };
  }
}
