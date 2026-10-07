/**
 * The stored link between a User and the upload behind their Profile Photo
 * (`users.avatarUploadId` and `users.avatarKey`). Both methods take the User's
 * row lock first and the upload locks after it, as every writer that holds
 * both must (ADR-0088).
 */
export interface ProfilePhotoLinkPort {
  /**
   * In one transaction: rechecks that the User may still change their profile,
   * finalizes the claim `token` holds, retires the upload this photo replaces
   * and stores the new link. A retry whose earlier attempt committed writes
   * nothing.
   */
  bind(input: { userId: string; uploadId: string; key: string; token: string }): Promise<void>;
  /**
   * Clears the link and retires its upload in one transaction: the caller's
   * when `tx` is given. Answers the removed key, or null when there was none.
   */
  unbind(userId: string, tx?: unknown): Promise<string | null>;
}

export const PROFILE_PHOTO_LINK_PORT = Symbol("ProfilePhotoLinkPort");
