/**
 * How identity reaches the upload boundary for a Profile Photo (ADR-0088).
 * Authorizing the upload, inspecting the stored object, stripping metadata,
 * making the variants and deciding the single adopter all stay behind it; the
 * upload id never crosses it.
 *
 * A refusal is thrown by the boundary with the upload error codes
 * (`ProfilePhotoErrorCode` in `@auto-tm/contracts`); identity passes it on.
 */
export interface ProfilePhotoPort {
  /**
   * Adopts the User's own presigned image upload as their Profile Photo and
   * stores its key on the User. In the same transaction the photo it replaces
   * is retired and its storage deletion recorded.
   */
  adopt(input: { userId: string; key: string }): Promise<{ key: string }>;
  /**
   * Clears the User's Profile Photo, retiring its upload and recording the
   * storage deletion in the same transaction: the caller's when `tx` is
   * given. Answers the key it removed, or null when there was no photo.
   */
  release(userId: string, tx?: unknown): Promise<{ removedKey: string | null }>;
}

export const PROFILE_PHOTO_PORT = Symbol("ProfilePhotoPort");
