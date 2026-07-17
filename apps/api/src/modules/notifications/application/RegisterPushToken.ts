import { randomUUID } from "node:crypto";

import { Inject, Injectable, BadRequestException } from "@nestjs/common";

import { PushToken } from "../domain/PushToken";
import { PUSH_TOKEN_ERROR_CODES, VALID_PLATFORMS } from "../domain/types";
import {
  PUSH_TOKEN_REPOSITORY,
  type PushTokenRepository,
} from "../domain/ports/PushTokenRepository";

export interface RegisterPushTokenInput {
  userId: string;
  token: string;
  platform: "android" | "ios" | "web";
  deviceId?: string | undefined;
}

export interface RegisterPushTokenResult {
  token: PushToken;
  invalidatedPrevious: boolean;
}

@Injectable()
export class RegisterPushToken {
  constructor(
    @Inject(PUSH_TOKEN_REPOSITORY)
    private readonly tokens: PushTokenRepository,
  ) {}

  async execute(input: RegisterPushTokenInput): Promise<RegisterPushTokenResult> {
    const trimmedToken = input.token.trim();
    if (!trimmedToken) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Push token is required",
        details: { reason: PUSH_TOKEN_ERROR_CODES.TOKEN_REQUIRED },
      });
    }

    if (!input.platform) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Push platform is required",
        details: { reason: PUSH_TOKEN_ERROR_CODES.PLATFORM_REQUIRED },
      });
    }

    if (!VALID_PLATFORMS.includes(input.platform)) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: `Invalid push platform: ${input.platform}`,
        details: { reason: PUSH_TOKEN_ERROR_CODES.INVALID_PLATFORM },
      });
    }

    let domainToken: PushToken;
    let invalidatedPrevious = false;

    const existing = await this.tokens.findByToken(trimmedToken);

    if (existing) {
      if (existing.userId === input.userId) {
        // Same user re-registering the same token: refresh metadata and reactivate.
        domainToken = existing.touch();
      } else {
        // Token moved to a different user (re-install, account switch, etc.).
        // Reassign the unique token row to the current user.
        domainToken = existing.reassignTo(input.userId);
        invalidatedPrevious = true;
      }
    } else {
      domainToken = PushToken.create({
        id: randomUUID(),
        userId: input.userId,
        token: trimmedToken,
        platform: input.platform,
        deviceId: input.deviceId,
      });
    }

    await this.tokens.save(domainToken);

    return { token: domainToken, invalidatedPrevious };
  }
}
