import type { SignInMethods } from "./SignInMethods";

export interface User extends SignInMethods {
  readonly id: string;
  /** Null until the User sets a name; readers then show the Generated Name. */
  readonly displayName: string | null;
  /** Generated Name number, assigned at creation and never changed. */
  readonly nameNumber: number;
  /** Assigned Avatar index, assigned at creation and never changed. */
  readonly avatarIndex: number;
  /** Object key of the profile photo; always null until photos ship. */
  readonly avatarKey: string | null;
  readonly avatarUrl: string | null;
  readonly locale: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletionScheduledAt: Date | null;
}

export type UserRole = "buyer" | "seller" | "moderator" | "admin";
