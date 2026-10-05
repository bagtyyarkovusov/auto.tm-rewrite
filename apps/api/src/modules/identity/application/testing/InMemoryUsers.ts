import type { GeneratedIdentity } from "../../domain/GeneratedIdentity";
import type { SignInMethods } from "../../domain/SignInMethods";
import type { User } from "../../domain/User";
import type { UserRepository } from "../../domain/ports/UserRepository";

/** The `UserRepository` behaviour the profile use-cases rely on, in memory. */
export class InMemoryUsers implements UserRepository {
  private readonly users = new Map<string, User>();

  /** Adds a stored User directly, as sign-in would have created it. */
  seed(user: Partial<User> & Pick<User, "id">): User {
    const stored: User = {
      phone: "+99365180518",
      phoneVerifiedAt: new Date("2026-05-01T00:00:00Z"),
      email: null,
      emailVerifiedAt: null,
      displayName: null,
      nameNumber: 4821,
      avatarIndex: 7,
      avatarKey: null,
      avatarUrl: null,
      locale: "ru",
      role: "buyer",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
      deletionScheduledAt: null,
      ...user,
    };
    this.users.set(stored.id, stored);
    return stored;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return [...this.users.values()].find((u) => u.phone === phone) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async create(signInMethods: SignInMethods, identity: GeneratedIdentity): Promise<User> {
    return this.seed({ id: `user-${this.users.size + 1}`, ...signInMethods, ...identity });
  }

  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    this.users.set(userId, { ...user, displayName });
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  async findUsersWithExpiredDeletionGrace(now: Date): Promise<User[]> {
    return [...this.users.values()].filter(
      (u) => u.deletionScheduledAt !== null && u.deletionScheduledAt <= now,
    );
  }

  async purgePersonalData(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    this.users.set(userId, {
      ...user,
      phone: null,
      phoneVerifiedAt: null,
      email: null,
      emailVerifiedAt: null,
      displayName: null,
      avatarKey: null,
      avatarUrl: null,
    });
  }
}
