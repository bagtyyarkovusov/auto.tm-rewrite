export interface User {
  readonly id: string;
  readonly phone: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly locale: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type UserRole = "buyer" | "seller" | "moderator" | "admin";
