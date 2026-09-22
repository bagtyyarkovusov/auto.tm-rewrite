import type { SignInMethods } from "./SignInMethods";

export interface User extends SignInMethods {
  readonly id: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly locale: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletionScheduledAt: Date | null;
}

export type UserRole = "buyer" | "seller" | "moderator" | "admin";
