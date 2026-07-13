import { Inject, Injectable, ForbiddenException } from "@nestjs/common";

import type {
  BlockedUserRepository,
} from "../domain/ports/BlockedUserRepository";
import { BLOCKED_USER_REPOSITORY } from "../domain/ports/BlockedUserRepository";

export interface BlockUserInput {
  blockerId: string;
  blockedId: string;
}

export interface BlockUserResult {
  blocked: true;
}

@Injectable()
export class BlockUser {
  constructor(
    @Inject(BLOCKED_USER_REPOSITORY)
    private readonly blockedUsers: BlockedUserRepository,
  ) {}

  async execute(input: BlockUserInput): Promise<BlockUserResult> {
    if (input.blockerId === input.blockedId) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Cannot block yourself",
      });
    }

    await this.blockedUsers.block(input.blockerId, input.blockedId);

    return { blocked: true };
  }
}
