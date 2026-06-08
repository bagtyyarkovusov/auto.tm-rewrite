export interface IdentityReadPort {
  findUserById(id: string): Promise<{
    id: string;
    displayName: string | null;
    role: string;
    suspendedAt: Date | null;
  } | null>;
}

export const IDENTITY_READ_PORT = Symbol("IdentityReadPort");
