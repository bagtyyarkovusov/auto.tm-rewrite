/**
 * What one User may see of another (#644). `deleted` is true for a User purged
 * after account deletion: no Sign-in Method left, no name and no photo; the
 * number and index remain. Carries no Sign-in Method, role or upload id.
 */
export interface PublicIdentity {
  displayName: string | null;
  nameNumber: number;
  avatarIndex: number;
  avatarKey: string | null;
  deleted: boolean;
}
