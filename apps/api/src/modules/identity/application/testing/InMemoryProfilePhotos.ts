import type { ProfilePhotoPort } from "../../domain/ports/ProfilePhotoPort";

import type { InMemoryUsers } from "./InMemoryUsers";

/**
 * `ProfilePhotoPort` in memory: it stores the key on the User the way the
 * upload boundary does, and records what it was asked to do.
 */
export class InMemoryProfilePhotos implements ProfilePhotoPort {
  adopted: Array<{ userId: string; key: string }> = [];
  released: string[] = [];
  /** When set, `adopt` refuses with it and stores nothing. */
  refusal: Error | undefined;

  constructor(private readonly users: InMemoryUsers) {}

  async adopt(input: { userId: string; key: string }): Promise<{ key: string }> {
    if (this.refusal) throw this.refusal;
    this.adopted.push(input);
    this.users.setAvatarKey(input.userId, input.key);
    return { key: input.key };
  }

  async release(userId: string): Promise<{ removedKey: string | null }> {
    this.released.push(userId);
    const removedKey = (await this.users.findById(userId))?.avatarKey ?? null;
    this.users.setAvatarKey(userId, null);
    return { removedKey };
  }
}
