import type { SignInMethods } from "../SignInMethods";
import type { User } from "../User";

export interface UserRepository {
  findByPhone(phone: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** Creates a User holding the given verified Sign-in Methods (at least one). */
  create(signInMethods: SignInMethods): Promise<User>;
  delete(id: string): Promise<void>;
  scheduleDeletion(userId: string, deletionScheduledAt: Date): Promise<void>;
  clearDeletionSchedule(userId: string): Promise<void>;
  findUsersWithExpiredDeletionGrace(now: Date): Promise<User[]>;
  /** Day-30 purge of the User row: frees both Sign-in Methods and clears profile PII. */
  purgePersonalData(userId: string): Promise<void>;
}
