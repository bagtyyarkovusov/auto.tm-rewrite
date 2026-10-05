import type { PublicIdentity } from "./PublicIdentity";

export interface IdentityUserSummary extends PublicIdentity {
  id: string;
  role: string;
  locale?: string;
  suspendedAt: Date | null;
  suspendedById: string | null;
  suspensionReason: string | null;
}

export interface IdentityReadPort {
  findUserById(id: string): Promise<IdentityUserSummary | null>;
  findUsersByIds(ids: string[]): Promise<IdentityUserSummary[]>;
  /**
   * Which of `blockedIds` the blocker has blocked, in one read. Use this
   * instead of `isUserBlockedBy` per row when listing.
   */
  findBlockedUserIds(blockerId: string, blockedIds: string[]): Promise<string[]>;
  isUserBlockedBy(blockerId: string, blockedId: string): Promise<boolean>;
}

export const IDENTITY_READ_PORT = Symbol("IdentityReadPort");
