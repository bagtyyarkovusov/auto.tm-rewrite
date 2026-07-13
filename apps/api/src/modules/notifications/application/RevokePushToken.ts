import { Inject, Injectable } from "@nestjs/common";

import {
  PUSH_TOKEN_REPOSITORY,
  type PushTokenRepository,
} from "../domain/ports/PushTokenRepository";

export interface RevokePushTokenInput {
  userId: string;
  token: string;
}

export interface RevokePushTokenResult {
  revoked: boolean;
}

@Injectable()
export class RevokePushToken {
  constructor(
    @Inject(PUSH_TOKEN_REPOSITORY)
    private readonly tokens: PushTokenRepository,
  ) {}

  async execute(input: RevokePushTokenInput): Promise<RevokePushTokenResult> {
    const existing = await this.tokens.findByToken(input.token.trim());

    // Idempotent: if the token does not exist or does not belong to the
    // authenticated user, treat the operation as a no-op success.
    if (!existing || existing.userId !== input.userId) {
      return { revoked: false };
    }

    if (!existing.isActive()) {
      return { revoked: true };
    }

    await this.tokens.update(existing.invalidate());
    return { revoked: true };
  }
}
