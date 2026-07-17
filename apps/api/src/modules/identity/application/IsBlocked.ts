import { Inject, Injectable } from "@nestjs/common";

import type {
  BlockedUserRepository,
} from "../domain/ports/BlockedUserRepository";
import { BLOCKED_USER_REPOSITORY } from "../domain/ports/BlockedUserRepository";

export interface IsBlockedInput {
  blockerId: string;
  blockedId: string;
}

export interface IsBlockedResult {
  blocked: boolean;
}

@Injectable()
export class IsBlocked {
  constructor(
    @Inject(BLOCKED_USER_REPOSITORY)
    private readonly blockedUsers: BlockedUserRepository,
  ) {}

  async execute(input: IsBlockedInput): Promise<IsBlockedResult> {
    const blocked = await this.blockedUsers.isBlocked(
      input.blockerId,
      input.blockedId,
    );
    return { blocked };
  }
}
