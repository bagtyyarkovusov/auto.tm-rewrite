export interface IdentityUserSummary {
  id: string;
  displayName: string | null;
  role: string;
  locale?: string;
  suspendedAt: Date | null;
  suspendedById: string | null;
  suspensionReason: string | null;
}

export interface IdentityReadPort {
  findUserById(id: string): Promise<IdentityUserSummary | null>;
  findUsersByIds(ids: string[]): Promise<IdentityUserSummary[]>;
  isUserBlockedBy(blockerId: string, blockedId: string): Promise<boolean>;
}

export const IDENTITY_READ_PORT = Symbol("IdentityReadPort");
