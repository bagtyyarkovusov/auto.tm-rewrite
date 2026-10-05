import type { GeneratedIdentity } from "../GeneratedIdentity";
import type { SignInMethods } from "../SignInMethods";
import type { User } from "../User";

export interface UserRepository {
  findByPhone(phone: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /**
   * Creates a User holding the given verified Sign-in Methods (at least one)
   * and the Generated Name number and Assigned Avatar index drawn for it.
   */
  create(signInMethods: SignInMethods, identity: GeneratedIdentity): Promise<User>;
  /** Stores the User's own name. Writes nothing else on the User. */
  updateDisplayName(userId: string, displayName: string): Promise<void>;
  delete(id: string): Promise<void>;
  scheduleDeletion(userId: string, deletionScheduledAt: Date): Promise<void>;
  findUsersWithExpiredDeletionGrace(now: Date): Promise<User[]>;
  /**
   * Day-30 purge of the User row: frees both Sign-in Methods and clears the
   * name and photo. The name number and avatar index stay; they identify nobody.
   */
  purgePersonalData(userId: string): Promise<void>;
}
