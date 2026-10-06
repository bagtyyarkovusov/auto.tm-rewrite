import type { PublicIdentity } from "../domain/ports/PublicIdentity";
import { hasSignInMethod, NO_SIGN_IN_METHODS } from "../domain/SignInMethods";

/**
 * The User columns behind a public identity. Phone and email are read only to
 * tell a purged User (no Sign-in Method left) from a live one; they never
 * leave this file.
 */
export const PUBLIC_IDENTITY_SELECT = {
  displayName: true,
  nameNumber: true,
  avatarIndex: true,
  avatarKey: true,
  phone: true,
  email: true,
} as const;

interface PublicIdentityRow {
  displayName: string | null;
  nameNumber: number;
  avatarIndex: number;
  avatarKey: string | null;
  phone: string | null;
  email: string | null;
}

export function toPublicIdentity(row: PublicIdentityRow): PublicIdentity {
  return {
    displayName: row.displayName,
    nameNumber: row.nameNumber,
    avatarIndex: row.avatarIndex,
    avatarKey: row.avatarKey,
    deleted: !hasSignInMethod({
      ...NO_SIGN_IN_METHODS,
      phone: row.phone,
      email: row.email,
    }),
  };
}
