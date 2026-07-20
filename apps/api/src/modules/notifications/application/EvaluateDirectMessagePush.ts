import { Inject, Injectable } from "@nestjs/common";

import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";
import type { PushTokenRepository } from "../domain/ports/PushTokenRepository";
import { PUSH_TOKEN_REPOSITORY } from "../domain/ports/PushTokenRepository";
import { DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS } from "../domain/types";

export interface EvaluateDirectMessagePushInput {
  senderId: string;
  recipientId: string;
}

export type EvaluateDirectMessagePushResult =
  | { shouldSend: true; recipientLocale?: string }
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
      return {
        shouldSend: false,
        reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.BLOCKED,
      };
    }

    const senderBlockedRecipient = await this.identityRead.isUserBlockedBy(
      input.senderId,
      input.recipientId,
    );
    if (senderBlockedRecipient) {
      return {
        shouldSend: false,
        reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.BLOCKED,
      };
    }

    const activeTokens = await this.tokens.listActiveForUser(input.recipientId);
    if (activeTokens.length === 0) {
      return {
        shouldSend: false,
        reason: DIRECT_MESSAGE_PUSH_SUPPRESSION_REASONS.NO_TOKENS,
      };
    }

    // Locale is part of recipient resolution here so Decide adds no identity lookup.
    const recipient = await this.identityRead.findUserById(input.recipientId);
    return {
      shouldSend: true,
      ...(recipient?.locale ? { recipientLocale: recipient.locale } : {}),
    };
  }
}
