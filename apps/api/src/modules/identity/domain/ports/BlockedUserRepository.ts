import type { BlockedUser } from "../BlockedUser";

export interface BlockedUserRepository {
  block(blockerId: string, blockedId: string): Promise<BlockedUser>;
  unblock(blockerId: string, blockedId: string): Promise<void>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
}

export const BLOCKED_USER_REPOSITORY = Symbol("BlockedUserRepository");
