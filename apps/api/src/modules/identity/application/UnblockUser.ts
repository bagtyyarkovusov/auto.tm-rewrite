import { Inject, Injectable } from "@nestjs/common";

import type {
  BlockedUserRepository,
} from "../domain/ports/BlockedUserRepository";
import { BLOCKED_USER_REPOSITORY } from "../domain/ports/BlockedUserRepository";

export interface UnblockUserInput {
  blockerId: string;
  blockedId: string;
}

export interface UnblockUserResult {
  unblocked: true;
}

@Injectable()
export class UnblockUser {
  constructor(
    @Inject(BLOCKED_USER_REPOSITORY)
    private readonly blockedUsers: BlockedUserRepository,
  ) {}

  async execute(input: UnblockUserInput): Promise<UnblockUserResult> {
    await this.blockedUsers.unblock(input.blockerId, input.blockedId);

    return { unblocked: true };
  }
}
