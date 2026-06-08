export interface IdentityAdminPort {
  suspendUser(
    userId: string,
    adminUserId: string,
    reason: string,
    tx?: unknown,
  ): Promise<{
    suspendedAt: Date;
    suspendedById: string;
    suspensionReason: string;
  }>;

  unsuspendUser(
    userId: string,
    tx?: unknown,
  ): Promise<{
    suspendedAt: null;
    suspendedById: null;
    suspensionReason: null;
  }>;

  isSuspended(userId: string): Promise<boolean>;
}

export const IDENTITY_ADMIN_PORT = Symbol("IdentityAdminPort");
